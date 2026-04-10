import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const projectRoot = path.resolve(frontendRoot, '..');
const backendEnv = fs.readFileSync(path.join(projectRoot, 'backend', '.env.example'), 'utf8');
const viteConfig = fs.readFileSync(path.join(frontendRoot, 'vite.config.ts'), 'utf8');
const httpClient = fs.readFileSync(path.join(frontendRoot, 'src', 'lib', 'http.ts'), 'utf8');

const portMatch = backendEnv.match(/^APP_PORT=(\d+)$/m);
if (!portMatch) {
  throw new Error('تعذر تحديد APP_PORT من backend/.env.example');
}

const backendPort = portMatch[1];
const expectedProxy = `http://localhost:${backendPort}`;

if (!viteConfig.includes("process.env.VITE_DEV_BACKEND_URL || '" + expectedProxy + "'")) {
  throw new Error(`vite.config.ts must default the dev proxy target to ${expectedProxy}`);
}

if (!httpClient.includes(`:${backendPort}`)) {
  throw new Error(`src/lib/http.ts must preserve the same backend port fallback (:${backendPort})`);
}

console.log(`Frontend dev proxy check passed (backend port ${backendPort}).`);
