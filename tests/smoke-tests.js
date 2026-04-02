const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { wait, requestJson, waitForHealth, extractCookie } = require('./http-test-helpers');

(async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zstore-smoke-'));
  const dbFile = path.join(tempRoot, 'smoke.db');
  const port = 3311 + Math.floor(Math.random() * 200);
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DB_FILE: dbFile,
    DEFAULT_ADMIN_USERNAME: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
    SESSION_SECRET: 'smoke-test-secret-not-for-production',
    REQUEST_LOGGING: 'false',
    ALLOW_LEGACY_STATE_WRITE: 'false',
    NODE_ENV: 'test',
  };

  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.on('data', (chunk) => { stderr += String(chunk); });

  try {
    await waitForHealth(port);

    const health = await requestJson({ port, pathName: '/api/health' });
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);

    const unauthorized = await requestJson({ port, pathName: '/api/state' });
    assert.equal(unauthorized.status, 401);

    const login = await requestJson({
      method: 'POST',
      port,
      pathName: '/api/auth/login',
      body: { username: 'admin', password: 'AdminPass123!' },
    });
    assert.equal(login.status, 200);
    const cookie = extractCookie(login.headers['set-cookie']);

    const me = await requestJson({ port, pathName: '/api/auth/me', headers: { Cookie: cookie } });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.username, 'admin');

    const sessions = await requestJson({ port, pathName: '/api/auth/sessions', headers: { Cookie: cookie } });
    assert.equal(sessions.status, 200);
    assert.ok(Array.isArray(sessions.body.sessions));
    assert.ok(sessions.body.sessions.length >= 1);

    const report = await requestJson({ port, pathName: '/api/reports/inventory', headers: { Cookie: cookie } });
    assert.equal(report.status, 200);
    assert.ok(report.body && typeof report.body.totalProducts === 'number');
    assert.ok(report.body.summary && typeof report.body.summary.totalProducts === 'number');
    assert.equal(report.body.totalProducts, report.body.summary.totalProducts);

    const dashboardOverview = await requestJson({ port, pathName: '/api/dashboard/overview', headers: { Cookie: cookie } });
    assert.equal(dashboardOverview.status, 200);
    assert.ok(dashboardOverview.body);
    assert.ok(dashboardOverview.body.summary);
    assert.equal(typeof dashboardOverview.body.summary.totalProducts, 'number');
    assert.ok(Array.isArray(dashboardOverview.body.lowStock));

    const logout = await requestJson({ method: 'POST', port, pathName: '/api/auth/logout', headers: { Cookie: cookie } });
    assert.equal(logout.status, 200);

    const afterLogout = await requestJson({ port, pathName: '/api/auth/me', headers: { Cookie: cookie } });
    assert.equal(afterLogout.status, 401);

    console.log('Smoke tests passed');
  } finally {
    server.kill('SIGTERM');
    await wait(500);
    if (!server.killed) server.kill('SIGKILL');
    if (stderr.trim()) {
      console.log(stderr.trim());
    }
  }
})().catch((err) => {
  console.error('Smoke tests failed');
  console.error(err);
  process.exit(1);
});
