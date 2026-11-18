/**
 * Hook Stop de Antigravity para garantizar que los cambios realizados en la rama main
 * queden commiteados, sincronizados con origin/main y desplegados en https://3llos.pages.dev.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Imprime la respuesta JSON esperada por Antigravity y finaliza con código 0.
 */
function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
}

/**
 * Lee todo el contenido de stdin de forma asíncrona.
 */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', () => {
      resolve('');
    });
  });
}

/**
 * Ejecuta un comando de Git de solo lectura dentro del repositorio.
 */
function runGit(repoRoot, args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function main() {
  try {
    const rawInput = await readStdin();
    const cleanedInput = rawInput.replace(/^\uFEFF/, '').trim();
    let payload = {};
    if (cleanedInput) {
      try {
        payload = JSON.parse(cleanedInput);
      } catch {
        respond({ decision: 'allow' });
      }
    }

    // Permitir salir si no terminó por respuesta normal, si ya hubo continuación previa o si hay tareas en curso
    if (
      (payload.terminationReason && payload.terminationReason !== 'NO_TOOL_CALL') ||
      payload.continuationActive === true ||
      payload.fullyIdle === false
    ) {
      respond({ decision: 'allow' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const fallbackRoot = path.resolve(__dirname, '..', '..');
    const repoRoot = payload.cwd ? path.resolve(payload.cwd) : fallbackRoot;
    const gitDir = path.join(repoRoot, '.git');

    if (!fs.existsSync(gitDir)) {
      respond({ decision: 'allow' });
    }

    // No interferir si hay un rebase o merge en progreso
    if (
      fs.existsSync(path.join(gitDir, 'rebase-merge')) ||
      fs.existsSync(path.join(gitDir, 'rebase-apply')) ||
      fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))
    ) {
      respond({ decision: 'allow' });
    }

    const branch = runGit(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch !== 'main') {
      respond({ decision: 'allow' });
    }

    const status = runGit(repoRoot, ['status', '--porcelain']);
    let ahead = 0;
    try {
      ahead = Number(runGit(repoRoot, ['rev-list', '--count', '@{u}..HEAD'])) || 0;
    } catch {
      ahead = 0;
    }

    if (status.length > 0 || ahead > 0) {
      respond({
        decision: 'continue',
        reason:
          'Quedan cambios locales sin commitear o commits sin pushear en la rama main. Según GEMINI.md, salvo que el usuario haya pedido explícitamente no subir cambios todavía, ejecuta `npm.cmd run deploy -- "<tipo>: <descripción>"` (o `node scripts/deploy.mjs "<tipo>: <descripción>"`) para hacer commit, sincronizar con `origin/main` y desplegar automáticamente en https://3llos.pages.dev, y luego confirma el resultado al usuario.',
      });
    }

    respond({ decision: 'allow' });
  } catch {
    respond({ decision: 'allow' });
  }
}

main();
