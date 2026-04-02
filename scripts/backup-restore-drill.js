#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { wait, requestJson, waitForHealth, extractCookie } = require('../tests/http-test-helpers');
const { runPermissionScenario } = require('../tests/integration/scenarios/permissions');
const { runTransactionalScenario } = require('../tests/integration/scenarios/transactions');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outputJsonPath = path.join(root, 'backup-restore-drill-report.json');
const outputMdPath = path.join(docsDir, 'backup-restore-drill.md');

function findByName(items, name) {
  return (items || []).find((item) => String(item.name || '') === name);
}

async function api(method, port, pathName, cookie, body) {
  return requestJson({ method, port, pathName, body, headers: cookie ? { Cookie: cookie } : {} });
}

(async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zsystems-backup-drill-'));
  const dbFile = path.join(tempRoot, 'drill.db');
  const rollbackDbFile = path.join(tempRoot, 'rollback-before-restore.db');
  const port = 3711 + Math.floor(Math.random() * 200);
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DB_FILE: dbFile,
    DEFAULT_ADMIN_USERNAME: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
    SESSION_SECRET: 'backup-restore-drill-secret-not-for-production',
    REQUEST_LOGGING: 'false',
    ALLOW_LEGACY_STATE_WRITE: 'false',
    ALLOW_RESTORE_USERS: 'true',
    NODE_ENV: 'test',
    SINGLE_STORE_MODE: 'false',
  };

  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.on('data', (chunk) => { stderr += String(chunk); });

  const report = {
    generatedAt: new Date().toISOString(),
    dbFile,
    rollbackDbFile,
    steps: [],
    ok: false,
  };

  function pushStep(name, ok, details = {}) {
    report.steps.push({ name, ok, ...details });
  }

  try {
    await waitForHealth(port);
    pushStep('server_health', true, { port });

    const ctx = {
      assert,
      port,
      wait,
      api,
      extractCookie,
      findByName,
      findById(items, id) {
        return (items || []).find((item) => String(item.id) === String(id));
      },
      sumAmounts(items) {
        return Number((items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2));
      },
    };

    const session = await runPermissionScenario(ctx);
    await runTransactionalScenario(ctx, session);
    pushStep('seed_operational_data', true);

    const backupLogin = await api('POST', port, '/api/auth/login', '', { username: 'backup1', password: 'Backup123!' });
    assert.equal(backupLogin.status, 200);
    const backupCookie = extractCookie(backupLogin.headers['set-cookie']);

    const backupRes = await api('GET', port, '/api/backup', backupCookie);
    assert.equal(backupRes.status, 200);
    const backupPayload = backupRes.body;
    pushStep('export_backup', true, {
      formatVersion: backupPayload.formatVersion,
      hasSnapshot: Boolean(backupPayload && backupPayload.snapshot && backupPayload.snapshot.tables),
    });

    const verifyRes = await api('POST', port, '/api/backup/verify', backupCookie, backupPayload);
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.ok, true);
    pushStep('verify_backup_payload', true, {
      warnings: Array.isArray(verifyRes.body.warnings) ? verifyRes.body.warnings.length : 0,
      errors: Array.isArray(verifyRes.body.errors) ? verifyRes.body.errors.length : 0,
    });

    fs.copyFileSync(dbFile, rollbackDbFile);
    pushStep('prepare_rollback_copy', true);

    const mutatedCategory = await api('POST', port, '/api/categories', session.adminCookie, { name: 'Post Backup Category' });
    assert.equal(mutatedCategory.status, 201);
    const mutatedCustomer = await api('POST', port, '/api/customers', session.adminCookie, {
      name: 'Post Backup Customer',
      phone: '01000000055',
      creditLimit: 50,
    });
    assert.equal(mutatedCustomer.status, 201);
    pushStep('mutate_after_backup', true);

    const dryRunRes = await api('POST', port, '/api/backup/restore?dryRun=true', backupCookie, backupPayload);
    assert.equal(dryRunRes.status, 200);
    assert.equal(dryRunRes.body.ok, true);
    assert.equal(dryRunRes.body.dryRun, true);
    pushStep('restore_dry_run', true);

    const restoreRes = await api('POST', port, '/api/backup/restore', backupCookie, backupPayload);
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.ok, true);
    pushStep('restore_backup', true, {
      blockers: Array.isArray(restoreRes.body.postRestore?.blockers) ? restoreRes.body.postRestore.blockers.length : 0,
    });

    const categoriesAfter = await api('GET', port, '/api/categories', session.adminCookie);
    assert.equal(categoriesAfter.status, 200);
    assert.ok(!(categoriesAfter.body.categories || []).some((item) => item.name === 'Post Backup Category'));

    const customersAfter = await api('GET', port, '/api/customers', session.adminCookie);
    assert.equal(customersAfter.status, 200);
    assert.ok(!(customersAfter.body.customers || []).some((item) => item.name === 'Post Backup Customer'));

    const inventoryAfter = await api('GET', port, '/api/reports/inventory', session.adminCookie);
    assert.equal(inventoryAfter.status, 200);
    assert.ok((inventoryAfter.body.items || []).some((item) => item.name === 'Integration Product'));
    pushStep('post_restore_validation', true, {
      categories: (categoriesAfter.body.categories || []).length,
      customers: (customersAfter.body.customers || []).length,
      inventoryItems: (inventoryAfter.body.items || []).length,
    });

    report.rollbackPlan = [
      '1. Stop the app before restore.',
      `2. Keep a filesystem copy of the database file before restore: ${rollbackDbFile}`,
      '3. Run verify first using /api/backup/verify or the dry-run restore endpoint.',
      '4. If restore fails, replace the active DB file with the rollback copy and restart the app.',
      '5. Re-run /api/health and spot-check inventory, sales summary, and customer balances.',
    ];

    report.ok = true;
  } catch (error) {
    report.ok = false;
    report.error = {
      message: error.message,
      stack: error.stack,
      stderr: stderr.trim(),
    };
    const rollbackAvailable = fs.existsSync(rollbackDbFile);
    pushStep('rollback_plan_ready', rollbackAvailable, { rollbackAvailable });
  } finally {
    server.kill('SIGTERM');
    await wait(500);
    if (!server.killed) server.kill('SIGKILL');
    if (stderr.trim()) report.serverStderr = stderr.trim();
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
    const md = [
      '# Backup / restore drill',
      '',
      `- Generated at: ${report.generatedAt}`,
      `- Passed: ${report.ok ? 'yes' : 'no'}`,
      `- Temporary DB file: ${report.dbFile}`,
      `- Rollback DB copy: ${report.rollbackDbFile}`,
      '',
      '## Steps',
      ...report.steps.map((step) => `- ${step.name}: ${step.ok ? 'passed' : 'failed'}`),
      '',
      '## Rollback plan',
      ...(Array.isArray(report.rollbackPlan) ? report.rollbackPlan.map((line) => `- ${line}`) : ['- rollback copy prepared before restore when available']),
      '',
      ...(report.error ? ['## Error', `- ${report.error.message}`, ''] : []),
    ].join('\n');
    fs.writeFileSync(outputMdPath, md);
    console.log(`[backup-restore-drill] wrote ${path.relative(root, outputJsonPath)}`);
    console.log(`[backup-restore-drill] wrote ${path.relative(root, outputMdPath)}`);
    if (!report.ok) process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
