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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zstore-imports-'));
  const dbFile = path.join(tempRoot, 'imports.db');
  const port = 3811 + Math.floor(Math.random() * 200);
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DB_FILE: dbFile,
    DEFAULT_ADMIN_USERNAME: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
    SESSION_SECRET: 'import-test-secret-not-for-production',
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

    const customersRes = await api('POST', port, '/api/import/customers', cookie, {
      rows: [{ name: 'Customer A', phone: '0100', openingBalance: 150, type: 'cash', creditLimit: 1000, storeCreditBalance: 25 }]
    });
    assert.equal(customersRes.status, 201);
    assert.equal(customersRes.body.summary.created, 1);
    assert.equal(customersRes.body.customers[0].name, 'Customer A');

    const suppliersRes = await api('POST', port, '/api/import/suppliers', cookie, {
      rows: [{ name: 'Supplier A', phone: '0101', openingBalance: 250, notes: 'imported' }]
    });
    assert.equal(suppliersRes.status, 201);
    assert.equal(suppliersRes.body.summary.created, 1);

    const productsRes = await api('POST', port, '/api/import/products', cookie, {
      rows: [{ name: 'Product A', barcode: '123456789012', category: 'General', supplier: 'Supplier A', costPrice: 10, retailPrice: 15, wholesalePrice: 12, minStock: 3, baseUnit: 'Piece', notes: 'seed' }]
    });
    assert.equal(productsRes.status, 201);
    assert.equal(productsRes.body.summary.created, 1);
    assert.equal(productsRes.body.products[0].name, 'Product A');

    const openingRes = await api('POST', port, '/api/import/opening-stock', cookie, {
      rows: [{ barcode: '123456789012', qty: 7, note: 'opening import' }]
    });
    assert.equal(openingRes.status, 201);
    assert.equal(openingRes.body.summary.updated, 1);
    assert.equal(Number(openingRes.body.products[0].stock), 7);
    assert.ok((openingRes.body.stockMovements || []).some((row) => String(row.reason || '').includes('opening_stock_import')));

    console.log('Import routes tests passed');
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
