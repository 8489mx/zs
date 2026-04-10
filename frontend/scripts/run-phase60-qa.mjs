import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const node = process.execPath;
const scripts = [
  'functional-smoke.mjs',
  'feature-route-map.mjs',
  'api-contract-alignment.mjs',
  'api-envelope-check.mjs',
  'route-qa.mjs',
  'critical-flow-check.mjs',
  'release-candidate-check.mjs',
  'release-audit.mjs',
];

for (const script of scripts) {
  execFileSync(node, [resolve(__dirname, script)], { cwd: root, stdio: 'inherit' });
}

console.log('phase60_qa_passed');
