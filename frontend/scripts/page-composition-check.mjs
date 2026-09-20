import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceWithBaseline } from './architecture-baseline.mjs';

const root = process.cwd();
const featuresDir = path.join(root, 'src', 'features');

function walkPages(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'pages') {
        for (const file of fs.readdirSync(full)) {
          if (/\.tsx?$/.test(file)) results.push(path.join(full, file));
        }
      } else {
        results.push(...walkPages(full));
      }
    }
  }
  return results;
}

const pages = walkPages(featuresDir);
const violations = [];

for (const pageFile of pages) {
  const source = fs.readFileSync(pageFile, 'utf8');
  const rel = path.relative(root, pageFile).replaceAll('\\', '/');

  if (/from\s+['"][^'"]*\/api\//.test(source)) {
    violations.push(`${rel} imports feature api directly. Page files must go through hooks.`);
  }
  if (/from\s+['"][^'"]*\/schemas\//.test(source)) {
    violations.push(`${rel} imports schemas directly. Page files must compose validated forms/components instead.`);
  }
  if (/from\s+['"]@\/services\/api\//.test(source)) {
    violations.push(`${rel} imports shared services/api directly. Use feature hooks or adapters.`);
  }
  if (/\buseQuery\s*\(/.test(source) || /\buseMutation\s*\(/.test(source)) {
    violations.push(`${rel} contains direct React Query calls. Move data access into feature hooks.`);
  }
  if (/\bfetch\s*\(/.test(source)) {
    violations.push(`${rel} uses fetch directly. Route data access through feature hooks/api adapters.`);
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

enforceWithBaseline({
  name: 'Page composition check',
  baselineFile: path.join(scriptDir, 'baselines', 'page-composition.json'),
  violations,
  hint: 'Page files must go through feature hooks instead of calling the api layer, React Query or fetch directly.',
});
