/**
 * Verificador estático del proyecto Papubanda:
 * 1. Sintaxis de todos los .js / .mjs propios.
 * 2. Imports y exports ES relativos existentes.
 * 3. Referencias locales (src/href) existentes en HTML.
 * 4. Handlers inline (onclick/onchange/oninput) definidos en el HTML o en sus scripts.
 * 5. Reporte informativo de archivos mayores a 650 líneas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'server']);
const EXCLUDED_PATH_PREFIXES = ['pages/juegos/kisukedreemurr'];
const ALLOWED_HTML_WARNINGS = new Set([
  'pages/juegos/pixel-game.html -> ../../assets/audio/nivel11.mp3'
]);
const LARGE_FILE_THRESHOLD = 650;

const JS_KEYWORDS_AND_GLOBALS = new Set([
  'if', 'else', 'for', 'while', 'switch', 'return', 'typeof', 'new', 'void', 'delete',
  'true', 'false', 'null', 'undefined', 'this', 'event', 'window', 'document', 'history',
  'location', 'alert', 'confirm', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'console', 'Math', 'Number', 'String', 'Boolean', 'Array', 'Object', 'JSON', 'encodeURIComponent'
]);

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function walkRepo(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPosix = toPosix(path.relative(ROOT, fullPath));
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => relPosix === prefix || relPosix.startsWith(`${prefix}/`))) {
      continue;
    }
    if (entry.isDirectory()) {
      results.push(...walkRepo(fullPath));
    } else {
      results.push({ fullPath, relPosix });
    }
  }
  return results;
}

function isEsModuleSource(source) {
  return /^\s*(import|export)\s/m.test(source) || /^\s*export\s*\{/m.test(source);
}

function checkJsSyntax(files, errors) {
  let checked = 0;
  for (const { fullPath, relPosix } of files) {
    if (!relPosix.endsWith('.js') && !relPosix.endsWith('.mjs')) continue;
    checked += 1;
    const source = fs.readFileSync(fullPath, 'utf8');
    try {
      if (relPosix.endsWith('.js') && isEsModuleSource(source)) {
        execFileSync(process.execPath, ['--input-type=module', '--check'], {
          input: source,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } else {
        execFileSync(process.execPath, ['--check', fullPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
    } catch (err) {
      const detail = err.stderr ? err.stderr.toString().split(/\r?\n/).slice(0, 3).join(' | ') : err.message;
      errors.push(`[SINTAXIS] ${relPosix}: ${detail}`);
    }
  }
  return checked;
}

function checkEsImports(files, errors) {
  const importRe = /(?:import|export)\s+(?:[^'"`]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let checked = 0;
  for (const { fullPath, relPosix } of files) {
    if (!relPosix.endsWith('.js') && !relPosix.endsWith('.mjs')) continue;
    const source = fs.readFileSync(fullPath, 'utf8');
    let match;
    while ((match = importRe.exec(source))) {
      const spec = match[1];
      if (!spec.startsWith('.')) continue;
      checked += 1;
      const target = path.resolve(path.dirname(fullPath), spec);
      if (!fs.existsSync(target)) {
        errors.push(`[IMPORT ROTO] ${relPosix} -> ${spec}`);
      }
    }
  }
  return checked;
}

function resolveHtmlLocalRef(htmlFullPath, rawRef) {
  const cleanRef = rawRef.split(/[?#]/)[0].trim();
  if (!cleanRef || /^(https?:|mailto:|javascript:|data:|\/api\/)/i.test(cleanRef)) {
    return null;
  }
  return cleanRef.startsWith('/')
    ? path.resolve(ROOT, cleanRef.slice(1))
    : path.resolve(path.dirname(htmlFullPath), cleanRef);
}

function checkHtmlReferences(files, errors, warnings) {
  const refRe = /(?:src|href)=['"]([^'"]+)['"]/gi;
  let checked = 0;
  for (const { fullPath, relPosix } of files) {
    if (!relPosix.endsWith('.html')) continue;
    const html = fs.readFileSync(fullPath, 'utf8');
    let match;
    while ((match = refRe.exec(html))) {
      const rawRef = match[1];
      if (rawRef.startsWith('#')) continue;
      const target = resolveHtmlLocalRef(fullPath, rawRef);
      if (!target) continue;
      checked += 1;
      if (!fs.existsSync(target)) {
        const cleanRef = rawRef.split(/[?#]/)[0].trim();
        const key = `${relPosix} -> ${cleanRef}`;
        if (ALLOWED_HTML_WARNINGS.has(key)) {
          warnings.push(`[WARN] Referencia conocida ausente: ${key}`);
        } else {
          errors.push(`[HTML REF ROTA] ${key}`);
        }
      }
    }
  }
  return checked;
}

function collectDefinedSymbols(code) {
  const defs = new Set();
  const patterns = [
    /(?:^|[;\s{}])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
    /(?:^|[;\s{}])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm,
    /(?:window|global|globalThis)\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(code))) {
      defs.add(m[1]);
    }
  }
  return defs;
}

function checkInlineHandlers(files, errors) {
  const handlerRe = /\bon(?:click|change|input)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  const callRe = /(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g;
  const scriptSrcRe = /<script\b[^>]*\bsrc=['"]([^'"]+)['"][^>]*>/gi;
  const inlineScriptRe = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

  let checkedCalls = 0;
  for (const { fullPath, relPosix } of files) {
    if (!relPosix.endsWith('.html')) continue;
    const html = fs.readFileSync(fullPath, 'utf8');

    // Reunir código de scripts inline y externos cargados por la página
    let combinedScripts = '';
    let m;
    inlineScriptRe.lastIndex = 0;
    while ((m = inlineScriptRe.exec(html))) {
      combinedScripts += '\n' + m[1];
    }
    scriptSrcRe.lastIndex = 0;
    while ((m = scriptSrcRe.exec(html))) {
      const target = resolveHtmlLocalRef(fullPath, m[1]);
      if (target && fs.existsSync(target)) {
        combinedScripts += '\n' + fs.readFileSync(target, 'utf8');
      }
    }

    const defined = collectDefinedSymbols(combinedScripts);
    handlerRe.lastIndex = 0;
    while ((m = handlerRe.exec(html))) {
      const expr = m[1] !== undefined ? m[1] : m[2];
      if (!expr) continue;
      callRe.lastIndex = 0;
      let callMatch;
      while ((callMatch = callRe.exec(expr))) {
        const fnName = callMatch[2];
        if (JS_KEYWORDS_AND_GLOBALS.has(fnName)) continue;
        checkedCalls += 1;
        if (!defined.has(fnName)) {
          errors.push(`[HANDLER INLINE] ${relPosix} invoca "${fnName}()" pero no se encontró su definición en el HTML ni sus scripts.`);
        }
      }
    }
  }
  return checkedCalls;
}

function reportLargeFiles(files) {
  const large = [];
  for (const { fullPath, relPosix } of files) {
    if (!/\.(js|mjs|css|html)$/i.test(relPosix)) continue;
    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).length;
    if (lines > LARGE_FILE_THRESHOLD) {
      large.push({ relPosix, lines });
    }
  }
  large.sort((a, b) => b.lines - a.lines);
  return large;
}

function main() {
  const files = walkRepo(ROOT);
  const errors = [];
  const warnings = [];

  const jsCount = checkJsSyntax(files, errors);
  const importCount = checkEsImports(files, errors);
  const refCount = checkHtmlReferences(files, errors, warnings);
  const handlerCount = checkInlineHandlers(files, errors);
  const largeFiles = reportLargeFiles(files);

  console.log(`check.mjs: ${jsCount} JS/MJS, ${importCount} imports ES, ${refCount} refs HTML, ${handlerCount} handlers inline.`);

  for (const w of warnings) {
    console.warn(w);
  }

  if (largeFiles.length > 0) {
    console.log(`[INFO] Archivos con más de ${LARGE_FILE_THRESHOLD} líneas:`);
    for (const item of largeFiles) {
      console.log(`  - ${item.relPosix} (${item.lines} líneas)`);
    }
  }

  if (errors.length > 0) {
    console.error(`\nSe encontraron ${errors.length} errores:`);
    for (const err of errors) {
      console.error(' ', err);
    }
    process.exit(1);
  }

  console.log('OK: todas las comprobaciones estáticas pasaron sin errores.');
}

main();
