import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const routeFiles = [
  'src/features/dashboard/routes.tsx',
  'src/features/products/routes.tsx',
  'src/features/sales/routes.tsx',
  'src/features/pos/routes.tsx',
  'src/features/purchases/routes.tsx',
  'src/features/inventory/routes.tsx',
  'src/features/customers/routes.tsx',
  'src/features/suppliers/routes.tsx',
  'src/features/accounts/routes.tsx',
  'src/features/reports/routes.tsx',
  'src/features/settings/routes.tsx'
];

let failed = false;
for (const rel of routeFiles) {
  const full = path.join(projectRoot, rel);
  const source = fs.readFileSync(full, 'utf8');
  if (!source.includes('createLazyRoute(() => import(')) {
    console.error(`[FAIL] ${rel} is not lazy-loaded.`);
    failed = true;
  }
}

const rootRouter = fs.readFileSync(path.join(projectRoot, 'src/app/router/root-router.tsx'), 'utf8');
for (const token of ["import('@/features/auth/pages/LoginPage')", "import('@/features/not-found/pages/NotFoundPage')"]) {
  if (!rootRouter.includes(token)) {
    console.error(`[FAIL] root-router.tsx is missing lazy route token: ${token}`);
    failed = true;
  }
}

const viteConfig = fs.readFileSync(path.join(projectRoot, 'vite.config.ts'), 'utf8');
for (const token of ['manualChunks(id)', 'vendor-react', 'vendor-router', 'vendor-query', 'vendor-forms']) {
  if (!viteConfig.includes(token)) {
    console.error(`[FAIL] vite.config.ts is missing code splitting token: ${token}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('[PASS] Phase 21 code splitting checks passed.');
