import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const registry = JSON.parse(read('docs/capabilities/registry.json'));
const errors = [];
const files = new Set(), ids = new Set(), owners = new Map();
const index = read('SYSTEM_CAPABILITIES.md');
const modules = fs.readdirSync(path.join(root, 'backend/src/modules'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
for (const d of registry.domains) {
  if (ids.has(d.id) || files.has(d.file)) errors.push(`Duplicate domain/file: ${d.id}`);
  ids.add(d.id); files.add(d.file);
  if (!fs.existsSync(path.join(root, d.file))) { errors.push(`Missing file: ${d.file}`); continue; }
  if (!index.includes(`](${d.file})`)) errors.push(`Not linked from index: ${d.file}`);
  const text = read(d.file);
  if (!text.includes('](SYSTEM_CAPABILITIES.md)') || !text.includes('](docs/capabilities/README.md)')) errors.push(`Missing navigation: ${d.file}`);
  const anchors = [...text.matchAll(/<a id="([^"]+)"/g)].map(m => m[1]);
  if (new Set(anchors).size !== anchors.length) errors.push(`Duplicate explicit anchors: ${d.file}`);
  for (const m of d.modules) {
    if (owners.has(m)) errors.push(`Multiple owners: ${m}`);
    if (!modules.includes(m)) errors.push(`Unknown module: ${m}`);
    owners.set(m, d.file);
  }
}
for (const m of modules) if (!owners.has(m)) errors.push(`Module without documentation owner: ${m}`);
for (const f of fs.readdirSync(root).filter(f => f.endsWith('_CAPABILITIES.md') && f !== 'SYSTEM_CAPABILITIES.md')) if (!files.has(f)) errors.push(`Unregistered capability document: ${f}`);
const manifest = JSON.parse(read('docs/capabilities/migration-manifest.json'));
for (const entry of manifest.sections) {
  if (!files.has(entry.file)) errors.push(`Unknown migration destination: ${entry.file}`);
  else if (!read(entry.file).includes(`<a id="${entry.id}"></a>`)) errors.push(`Missing migration anchor: ${entry.id}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Capability docs OK: ${files.size} domains, ${owners.size} modules, ${manifest.sections.length} migration anchors.`);
