#!/usr/bin/env node
// Performance guard (ARCHITECTURE_INVARIANTS.md §2.6, PERF-5 … PERF-8).
//
//   node scripts/perf-budget-check.mjs          source rules — no build needed, runs in `npm run guards`
//   node scripts/perf-budget-check.mjs --dist   also inspects the last production build in dist/
//
// Why it exists: every rule below was a real regression that shipped silently. Nothing broke
// functionally — every page just downloaded 700KB+ of PDF/QR/Sentry code it never used.
// If this script fails, do not loosen it: move the heavy import behind `import()` / React.lazy.

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const failures = [];
const fail = (message) => failures.push(message);

// Libraries that must never be in the startup (entry) graph. Each has a lazy entry point instead.
const HEAVY_LIBS = [
  'jspdf',
  'html2canvas',
  'html5-qrcode',
  'pdfjs-dist',
  'xlsx',
  'recharts',
  '@sentry/react',
  'browser-image-compression',
];

// ---------------------------------------------------------------------------------------------
// Rule 1 — the static import graph reachable from src/main.tsx contains no heavy library.
// ---------------------------------------------------------------------------------------------
const STATIC_IMPORT_RE = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/gm;

function resolveLocal(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(srcDir, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function packageName(spec) {
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/');
  return spec.split('/')[0];
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const entry = path.join(srcDir, 'main.tsx');
const visited = new Map(); // file -> importer (for the error trail)
const queue = [entry];
visited.set(entry, null);
while (queue.length) {
  const file = queue.shift();
  if (!/\.(tsx?|jsx?)$/.test(file)) continue;
  const code = stripComments(readFileSync(file, 'utf8'));
  for (const match of code.matchAll(STATIC_IMPORT_RE)) {
    const spec = match[1];
    const local = resolveLocal(file, spec);
    if (local) {
      if (!visited.has(local)) {
        visited.set(local, file);
        queue.push(local);
      }
      continue;
    }
    if (spec.startsWith('.') || spec.startsWith('@/')) continue; // unresolved asset (css, json…)
    if (HEAVY_LIBS.includes(packageName(spec))) {
      const trail = [];
      for (let cursor = file; cursor; cursor = visited.get(cursor)) trail.unshift(path.relative(root, cursor));
      fail(`[startup graph] "${spec}" is statically imported at startup via:\n      ${trail.join('\n   -> ')}\n    Load it with import() / React.lazy instead.`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Rule 2 — vite.config.ts keeps the chunking fixes (PERF-5).
// ---------------------------------------------------------------------------------------------
const viteConfig = readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
if (!/vite\/preload-helper[\s\S]{0,400}vendor-runtime/.test(viteConfig)) {
  fail('[vite.config.ts] Vite\'s preload helper must be pinned to the \'vendor-runtime\' chunk (PERF-5). Without it Rollup puts it inside a heavy vendor chunk that every lazy route then preloads.');
}
if (/includes\(\s*['"]\/react\/['"]\s*\)/.test(viteConfig)) {
  fail('[vite.config.ts] Loose substring match on \'/react/\' is forbidden — it also matches @sentry/react. Match exact package names (PERF-5).');
}

// ---------------------------------------------------------------------------------------------
// Rule 3 — the lazy wrappers stay lazy (PERF-6, PERF-7, PERF-8).
// ---------------------------------------------------------------------------------------------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.(spec|test)\.[tj]sx?$/.test(name)) out.push(full);
  }
  return out;
}
const lazyOnlyModules = [
  { target: 'shared/components/CameraBarcodeScannerView', allowedIn: ['shared/components/CameraBarcodeScannerModal.tsx'], why: 'html5-qrcode (~335KB) — import CameraBarcodeScannerModal instead (PERF-6)' },
  { target: 'features/contracting/components/ImportBoqModal', allowedIn: ['features/contracting/components/LazyImportBoqModal.tsx'], why: 'pdfjs-dist (~1MB) — import from LazyImportBoqModal instead (PERF-8)' },
];
for (const file of walk(srcDir)) {
  const rel = path.relative(srcDir, file).replace(/\\/g, '/');
  const code = stripComments(readFileSync(file, 'utf8'));
  for (const match of code.matchAll(STATIC_IMPORT_RE)) {
    const spec = match[1];
    if (spec === '@sentry/react' && rel !== 'lib/error-tracking.ts') {
      fail(`[${rel}] imports @sentry/react statically — use captureErrorToTracking() from '@/lib/error-tracking' (PERF-7).`);
    }
    const local = resolveLocal(file, spec);
    if (!local) continue;
    const localRel = path.relative(srcDir, local).replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');
    for (const rule of lazyOnlyModules) {
      if (localRel === rule.target && !rule.allowedIn.includes(rel)) {
        fail(`[${rel}] statically imports ${rule.target} — ${rule.why}.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Rule 4 (--dist) — the built index.html preloads no heavy vendor chunk; entry chunk within budget.
// ---------------------------------------------------------------------------------------------
if (process.argv.includes('--dist')) {
  const indexHtml = path.join(root, 'dist', 'index.html');
  if (!existsSync(indexHtml)) {
    fail('[dist] dist/index.html not found — run a production build first (only when the owner asks for one).');
  } else {
    const html = readFileSync(indexHtml, 'utf8');
    const forbiddenPreload = /vendor-(jspdf|qrcode|xlsx|recharts|html2canvas|pdfjs|sentry|image-compression)/;
    for (const match of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) {
      if (forbiddenPreload.test(match[1])) fail(`[dist] index.html preloads ${match[1]} on every page load.`);
    }
    const entryMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
    if (entryMatch) {
      const entryFile = path.join(root, 'dist', entryMatch[1].replace(/^\.?\//, ''));
      if (existsSync(entryFile)) {
        const entryKb = Math.round(statSync(entryFile).size / 1024);
        const entryCode = readFileSync(entryFile, 'utf8');
        const importedChunks = [...entryCode.matchAll(/from\s*"([^"]*vendor-[^"]+)"/g)].map((m) => m[1]);
        for (const chunk of importedChunks) {
          if (forbiddenPreload.test(chunk)) fail(`[dist] entry chunk statically imports ${chunk}.`);
        }
        const ENTRY_BUDGET_KB = 650;
        if (entryKb > ENTRY_BUDGET_KB) fail(`[dist] entry chunk is ${entryKb}KB (budget ${ENTRY_BUDGET_KB}KB). Lazy-load what the first screen does not need.`);
        else console.log(`[dist] entry chunk ${entryKb}KB (budget ${ENTRY_BUDGET_KB}KB)`);
      }
    }
  }
}

if (failures.length) {
  console.error(`perf-budget-check: ${failures.length} violation(s)\n`);
  for (const message of failures) console.error(`  - ${message}\n`);
  console.error('See ARCHITECTURE_INVARIANTS.md §2.6 (PERF invariants) before changing this check.');
  process.exit(1);
}
console.log(`perf-budget-check: OK (${visited.size} startup modules scanned, no heavy library in the startup graph)`);
