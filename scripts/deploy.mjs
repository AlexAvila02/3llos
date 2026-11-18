/**
 * Script seguro de commit, sincronización por rebase, push a GitHub
 * y verificación automática del despliegue en Cloudflare Pages (https://3llos.pages.dev).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const GITHUB_OWNER = 'AlexAvila02';
const GITHUB_REPO = '3llos';
const PRODUCTION_URL = 'https://3llos.pages.dev';
const CHECK_NAME = 'Cloudflare Pages';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24; // 24 * 5s = 120 segundos

// Patrones de archivos sensibles que nunca deben subirse al repositorio
const SENSITIVE_PATTERNS = [
  /(^|[\\/])\.env(\.|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /credentials\.json$/i,
];

/**
 * Ejecuta un comando de Git en la raíz del repositorio y devuelve stdout limpio.
 */
function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.inheritStdio ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })?.trimEnd() ?? '';
}

/**
 * Analiza los argumentos de línea de comandos.
 */
function parseArgs(argv) {
  let noWait = false;
  let verifyOnly = false;
  const messageParts = [];

  for (const arg of argv) {
    if (arg === '--no-wait') {
      noWait = true;
    } else if (arg === '--verify-only') {
      verifyOnly = true;
    } else {
      messageParts.push(arg);
    }
  }

  const commitMessage =
    messageParts.join(' ').trim() || 'chore: actualizar sitio desde Antigravity';

  return { noWait, verifyOnly, commitMessage };
}

/**
 * Extrae las rutas de archivo reportadas por `git status --porcelain`.
 */
function extractStatusPaths(porcelainOutput) {
  if (!porcelainOutput) {
    return [];
  }

  const paths = [];
  for (const rawLine of porcelainOutput.split(/\r?\n/)) {
    if (!rawLine) continue;
    let filePart = rawLine.slice(3).trim();
    if (filePart.includes(' -> ')) {
      filePart = filePart.split(' -> ').pop().trim();
    }
    if (filePart.startsWith('"') && filePart.endsWith('"')) {
      filePart = filePart.slice(1, -1);
    }
    if (filePart) {
      paths.push(filePart);
    }
  }
  return paths;
}

/**
 * Verifica que no existan archivos sensibles sin ignorar en el árbol de trabajo.
 */
function ensureNoSensitiveFiles(paths) {
  const flagged = paths.filter((filePath) =>
    SENSITIVE_PATTERNS.some((pattern) => pattern.test(filePath))
  );

  if (flagged.length > 0) {
    console.error(
      '❌ Se detectaron posibles archivos sensibles sin ignorar. Se cancela el despliegue:'
    );
    for (const item of flagged) {
      console.error(`   - ${item}`);
    }
    process.exit(1);
  }
}

/**
 * Comprueba si existen cambios preparados en el índice (stage) de Git.
 */
function hasStagedChanges() {
  try {
    execFileSync('git', ['diff', '--cached', '--quiet'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return false;
  } catch {
    return true;
  }
}

/**
 * Espera la cantidad de milisegundos indicada.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extrae la Preview URL de Cloudflare Pages desde el resumen del check-run si está presente.
 */
function extractPreviewUrl(summary) {
  if (!summary) return null;
  const match = summary.match(/https:\/\/[a-z0-9-]+\.3llos\.pages\.dev/i);
  return match ? match[0] : null;
}

/**
 * Consulta la API de GitHub hasta confirmar el resultado del check "Cloudflare Pages".
 */
async function waitForCloudflareDeploy(commitSha) {
  const shortSha = commitSha.slice(0, 7);
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${commitSha}/check-runs`;

  console.log(
    `⏳ Esperando confirmación del despliegue en Cloudflare Pages para ${shortSha}...`
  );

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': '3llos-deploy-script',
        },
      });
    } catch (err) {
      console.warn(
        `⚠️ No se pudo consultar la API de GitHub (${err.message}). El git push sí se completó; Cloudflare Pages despliega automáticamente en ${PRODUCTION_URL}.`
      );
      return;
    }

    if (response.status === 403 || response.status === 429) {
      console.warn(
        `⚠️ Límite de peticiones de la API de GitHub (HTTP ${response.status}). El git push sí tuvo éxito; Cloudflare Pages despliega automáticamente en ${PRODUCTION_URL}.`
      );
      return;
    }

    if (!response.ok) {
      console.warn(
        `⚠️ Respuesta inesperada de la API de GitHub (HTTP ${response.status}). El git push sí tuvo éxito; revisa ${PRODUCTION_URL}.`
      );
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      console.warn(
        `⚠️ No se pudo interpretar la respuesta de GitHub. El git push sí tuvo éxito; revisa ${PRODUCTION_URL}.`
      );
      return;
    }

    const checkRuns = Array.isArray(data?.check_runs) ? data.check_runs : [];
    const cfCheck = checkRuns.find((run) => run?.name === CHECK_NAME);

    if (cfCheck && cfCheck.status === 'completed') {
      if (cfCheck.conclusion === 'success') {
        const previewUrl = extractPreviewUrl(cfCheck.output?.summary);
        console.log(`✅ Despliegue completado en Cloudflare Pages (${shortSha}).`);
        console.log(`🌐 Producción: ${PRODUCTION_URL}`);
        if (previewUrl) {
          console.log(`🔗 Preview: ${previewUrl}`);
        }
        return;
      }

      console.error(
        `❌ El despliegue en Cloudflare Pages falló (conclusión: ${cfCheck.conclusion || 'desconocida'}).`
      );
      if (cfCheck.details_url) {
        console.error(`🔎 Detalles: ${cfCheck.details_url}`);
      }
      process.exit(1);
    }

    if (attempt < MAX_POLL_ATTEMPTS) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.warn(
    `⚠️ Se agotó la espera de 120s para el check "${CHECK_NAME}", pero el git push a origin/main sí se realizó correctamente. Verifica ${PRODUCTION_URL} en unos instantes.`
  );
}

/**
 * Punto de entrada principal del despliegue.
 */
async function main() {
  const { noWait, verifyOnly, commitMessage } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    console.error('❌ No se encontró un repositorio Git válido en la raíz del proyecto.');
    process.exit(1);
  }

  if (!verifyOnly) {
    const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (currentBranch !== 'main') {
      console.error(
        `❌ Estás en la rama "${currentBranch}". El despliegue automático solo está permitido desde la rama "main".`
      );
      process.exit(1);
    }

    const porcelain = runGit(['status', '--porcelain', '-uall']);
    const pendingPaths = extractStatusPaths(porcelain);
    ensureNoSensitiveFiles(pendingPaths);

    if (pendingPaths.length > 0) {
      console.log('📦 Preparando cambios locales...');
      runGit(['add', '-A']);

      if (hasStagedChanges()) {
        console.log(`📝 Creando commit: "${commitMessage}"`);
        runGit(['commit', '-m', commitMessage], { inheritStdio: true });
      }
    } else {
      console.log('ℹ️ No hay cambios locales nuevos para commitear.');
    }

    console.log('🔄 Obteniendo novedades de origin/main...');
    runGit(['fetch', 'origin', 'main'], { inheritStdio: true });

    const behindCount = Number(runGit(['rev-list', '--count', 'HEAD..origin/main'])) || 0;
    if (behindCount > 0) {
      console.log(
        `🔀 Hay ${behindCount} commit(s) nuevo(s) en origin/main. Integrando con git rebase origin/main...`
      );
      try {
        runGit(['rebase', 'origin/main'], { inheritStdio: true });
      } catch (err) {
        console.error(
          '❌ Falló git rebase origin/main (posible conflicto). Abortando rebase para dejar el repo seguro...'
        );
        try {
          runGit(['rebase', '--abort']);
        } catch {
          // Ignorar si no había rebase activo
        }
        console.error(`Detalle: ${err.message}`);
        process.exit(1);
      }
    }

    const aheadCount = Number(runGit(['rev-list', '--count', 'origin/main..HEAD'])) || 0;
    if (aheadCount > 0) {
      console.log(`🚀 Subiendo ${aheadCount} commit(s) a origin/main...`);
      runGit(['push', 'origin', 'main'], { inheritStdio: true });
    } else {
      console.log('✅ La rama origin/main ya está actualizada con HEAD.');
    }
  }

  const headSha = runGit(['rev-parse', 'HEAD']);
  console.log(`📌 HEAD actual: ${headSha.slice(0, 7)}`);

  if (!noWait) {
    await waitForCloudflareDeploy(headSha);
  }
}

main().catch((err) => {
  console.error(`❌ Error inesperado durante el despliegue: ${err.message}`);
  process.exit(1);
});
