import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guard for the production deploy and backup invariants DEPLOY-1..DEPLOY-6
// (ARCHITECTURE_INVARIANTS.md §2.7, docs/DEPLOYMENT_PIPELINE.md).
// Each of these was a real production incident on 2026-09-22: the old flow deleted dist and rebuilt
// on the 1-OCPU server (1754 failed PM2 restarts), and the nightly backup had silently not run for
// three weeks. Nothing fails functionally when these regress — production just goes down during
// every deploy or loses its backups. If one of these fails, the test is almost always right.

const ROOT = join(__dirname, '..', '..', '..');
// Normalised to LF: Windows checkouts get CRLF (core.autocrlf) and the regexes below match on \n.
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');

const workflow = read('.github/workflows/deploy-oracle.yml');
const backupScript = read('deploy/scripts/zsystems-backup.sh');

function remoteScript(): string {
  const match = workflow.match(/<< 'REMOTE'\n([\s\S]*?)\n\s*REMOTE\n/);
  assert.ok(match, "deploy-oracle.yml must run its server steps in a single << 'REMOTE' heredoc");
  return match[1];
}

// DEPLOY-1: nothing is built on the production server.
function testNoBuildOnServer(): void {
  const remote = remoteScript();
  for (const forbidden of [/npm run build/, /vite(\.js)? build/, /nest build/, /tsc\b/]) {
    assert.ok(!forbidden.test(remote), `the server step must not build (found ${forbidden}) — build on the runner`);
  }
  const runnerPart = workflow.replace(remote, '');
  assert.ok(/working-directory: backend[\s\S]*?npm run build/.test(runnerPart), 'backend must be built on the GitHub runner');
  assert.ok(/working-directory: frontend[\s\S]*?npm run build/.test(runnerPart), 'frontend must be built on the GitHub runner');
  assert.ok(/tar -czf release\.tgz backend\/dist frontend\/dist/.test(runnerPart), 'the prebuilt dist folders are shipped as release.tgz');
}

// DEPLOY-2: the live dist folders are never deleted before the new build is in place.
function testNoLiveDistDeletion(): void {
  const remote = remoteScript();
  assert.ok(!/rm -rf ("?\$TARGET_DIR\/)?(backend\/|frontend\/)?dist"?\s*$/m.test(remote), 'never rm -rf a live dist folder');
  assert.ok(/swap_in "\$TARGET_DIR\/backend\/dist"/.test(remote), 'backend/dist is replaced by swap_in (mv), not rebuilt in place');
  assert.ok(/swap_in "\$TARGET_DIR\/frontend\/dist"/.test(remote), 'frontend/dist is replaced by swap_in (mv), not rebuilt in place');
}

// DEPLOY-3: migrations run before the new code goes live; a failed health check rolls back.
function testMigrationOrderAndRollback(): void {
  const remote = remoteScript();
  const migrateAt = remote.indexOf('npm run migration:run');
  const swapAt = remote.indexOf('swap_in "$TARGET_DIR/backend/dist"');
  const reloadAt = remote.indexOf('pm2 reload zsystems-backend');
  assert.ok(migrateAt > -1 && swapAt > -1 && reloadAt > -1, 'migrate, swap and reload must all be present');
  assert.ok(migrateAt < swapAt && swapAt < reloadAt, 'order must be: migrate -> swap -> reload');
  assert.ok(/if ! check_health; then[\s\S]*?swap_back "\$TARGET_DIR\/backend\/dist"[\s\S]*?exit 1/.test(remote),
    'an unhealthy deploy must swap the previous build back and fail the job');
  assert.ok(/set -euo pipefail/.test(remote), 'the server step must stop on the first error');
}

// DEPLOY-4: the commit that passed CI is the one deployed.
function testDeploysTestedCommit(): void {
  assert.ok(/github\.event\.workflow_run\.head_sha/.test(workflow), 'deploy must check out workflow_run.head_sha');
  assert.ok(/git reset --hard "\$DEPLOY_SHA"/.test(remoteScript()), 'the server must reset to the same DEPLOY_SHA');
  assert.ok(/cancel-in-progress: false/.test(workflow), 'a running deploy must not be cancelled mid-swap');
}

// DEPLOY-5: the backup produces a valid dump.
function testBackupScript(): void {
  assert.ok(!/docker exec[^\n|]*\s-t\b/.test(backupScript), 'docker exec -t injects \\r into the SQL dump');
  assert.ok(/set -euo pipefail/.test(backupScript), 'a failed pg_dump must fail the backup, not write an empty file');
  assert.ok(/PostgreSQL database dump complete/.test(backupScript), 'the dump must be verified complete before it is kept');
  assert.ok(/\/etc\/zsystems\/backup-par-url/.test(backupScript), 'the off-site upload URL is read from the server, not the repo');
}

// DEPLOY-6: no Object Storage pre-authenticated URL is ever committed (the repo is public).
function testNoCommittedParUrl(): void {
  const par = /objectstorage\.[a-z0-9-]+\.oraclecloud\.com\/p\//;
  for (const [name, text] of [['deploy-oracle.yml', workflow], ['zsystems-backup.sh', backupScript]] as const) {
    assert.ok(!par.test(text), `${name} must not contain a pre-authenticated request URL`);
  }
}

function run(): void {
  testNoBuildOnServer();
  testNoLiveDistDeletion();
  testMigrationOrderAndRollback();
  testDeploysTestedCommit();
  testBackupScript();
  testNoCommittedParUrl();
  // eslint-disable-next-line no-console
  console.log('deploy-pipeline.spec: all deploy and backup invariants hold (DEPLOY-1..DEPLOY-6)');
}

try {
  run();
  process.exit(0);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
}
