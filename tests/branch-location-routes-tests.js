const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { requestJson, waitForHealth, extractCookie } = require('./http-test-helpers');

async function api(method, port, pathName, cookie, body) {
  return requestJson({ method, port, pathName, body, headers: cookie ? { Cookie: cookie } : {} });
}

(async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zstore-branch-location-'));
  const dbFile = path.join(tempRoot, 'branch-location.db');
  const port = 4011 + Math.floor(Math.random() * 200);
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DB_FILE: dbFile,
    DEFAULT_ADMIN_USERNAME: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
    SESSION_SECRET: 'branch-location-test-secret-not-for-production',
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
    const loginRes = await api('POST', port, '/api/auth/login', '', { username: 'admin', password: 'AdminPass123!' });
    assert.equal(loginRes.status, 200);
    const cookie = extractCookie(loginRes.headers['set-cookie']);

    const createBranchRes = await api('POST', port, '/api/branches', cookie, { name: 'Main Branch', code: 'MB' });
    assert.equal(createBranchRes.status, 201);
    const branchId = createBranchRes.body.branchId;
    assert.ok(branchId);

    const updateBranchRes = await api('PUT', port, `/api/branches/${branchId}`, cookie, { name: 'Main Branch Updated', code: 'MB1' });
    assert.equal(updateBranchRes.status, 200);
    assert.ok((updateBranchRes.body.branches || []).some((branch) => branch.id === branchId && branch.name === 'Main Branch Updated'));

    const createLocationRes = await api('POST', port, '/api/locations', cookie, { name: 'Warehouse A', code: 'WH-A', branchId });
    assert.equal(createLocationRes.status, 201);
    const locationId = createLocationRes.body.locationId;
    assert.ok(locationId);

    const updateLocationRes = await api('PUT', port, `/api/locations/${locationId}`, cookie, { name: 'Warehouse B', code: 'WH-B', branchId: '' });
    assert.equal(updateLocationRes.status, 200);
    assert.ok((updateLocationRes.body.locations || []).some((location) => location.id === locationId && location.name === 'Warehouse B'));

    const deleteLocationRes = await api('DELETE', port, `/api/locations/${locationId}`, cookie);
    assert.equal(deleteLocationRes.status, 200);
    assert.equal(deleteLocationRes.body.removedLocationId, locationId);

    const deleteBranchRes = await api('DELETE', port, `/api/branches/${branchId}`, cookie);
    assert.equal(deleteBranchRes.status, 200);
    assert.equal(deleteBranchRes.body.removedBranchId, branchId);

    console.log('Branch/location routes tests passed');
  } catch (error) {
    console.error(error);
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
})();
