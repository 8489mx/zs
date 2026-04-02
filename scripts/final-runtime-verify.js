const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const sqliteModulePath = path.join(projectRoot, 'node_modules', 'better-sqlite3');
const hasBetterSqlite = fs.existsSync(sqliteModulePath);

const steps = [
  ['npm', ['run', 'syntax:check']],
  ['npm', ['test']],
];

if (hasBetterSqlite) {
  steps.push(
    ['npm', ['run', 'smoke-test']],
    ['npm', ['run', 'test:integration']],
  );
} else {
  console.warn('Skipping smoke/integration verification because better-sqlite3 is not installed in this environment.');
}

steps.push(['npm', ['run', 'verify:production:startup']]);
steps.push(['npm', ['run', 'deploy:target:check']]);
steps.push(['npm', ['run', 'launch:gate']]);

let failed = false;
for (const [cmd, args] of steps) {
  console.log(`\n>>> Running: ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    failed = true;
    console.error(`Step failed: ${cmd} ${args.join(' ')}`);
    break;
  }
}

if (failed) {
  console.error('Final runtime verification failed. Fix the failing step before launch.');
  process.exit(1);
}

if (!hasBetterSqlite) {
  console.warn('Runtime verification completed with integration steps skipped. Install dependencies and run verify:runtime again before launch sign-off.');
} else {
  console.log('Final runtime verification passed. Continue with manual transactional checklist before launch sign-off.');
}
