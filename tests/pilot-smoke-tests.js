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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zstore-pilot-smoke-'));
  const dbFile = path.join(tempRoot, 'pilot-smoke.db');
  const port = 3711 + Math.floor(Math.random() * 200);
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DB_FILE: dbFile,
    DEFAULT_ADMIN_USERNAME: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
    SESSION_SECRET: 'pilot-smoke-secret-not-for-production',
    REQUEST_LOGGING: 'false',
    ALLOW_LEGACY_STATE_WRITE: 'false',
    NODE_ENV: 'test',
    SINGLE_STORE_MODE: 'true',
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

    const login = await api('POST', port, '/api/auth/login', '', { username: 'admin', password: 'AdminPass123!' });
    assert.equal(login.status, 200);
    const adminCookie = extractCookie(login.headers['set-cookie']);

    const settings = await api('PUT', port, '/api/settings', adminCookie, {
      storeName: 'Pilot Smoke Store',
      taxMode: 'exclusive',
      managerPin: '1234',
      paperSize: '80mm',
      invoiceFooter: 'شكرا لزيارتكم',
    });
    assert.equal(settings.status, 200);

    const branch = await api('POST', port, '/api/branches', adminCookie, { name: 'الفرع الرئيسي', code: 'MAIN' });
    assert.equal(branch.status, 201);
    const branchId = branch.body.branchId;

    const location = await api('POST', port, '/api/locations', adminCookie, { name: 'المخزن الرئيسي', code: 'WH1', branchId });
    assert.equal(location.status, 201);

    const category = await api('POST', port, '/api/categories', adminCookie, { name: 'Pilot Category' });
    assert.equal(category.status, 201);
    const categoryId = category.body.categories.find((item) => item.name === 'Pilot Category').id;

    const product = await api('POST', port, '/api/products', adminCookie, {
      name: 'Pilot Product',
      barcode: 'PILOT-001',
      categoryId,
      costPrice: 10,
      retailPrice: 15,
      wholesalePrice: 14,
      stock: 7,
      minStock: 1,
      units: [{ name: 'قطعة', multiplier: 1, barcode: 'PILOT-001' }],
    });
    assert.equal(product.status, 201);
    const productId = product.body.products.find((item) => item.name === 'Pilot Product').id;

    const cashierCreate = await api('POST', port, '/api/users', adminCookie, {
      username: 'pilot_cashier',
      password: 'Cashier123!',
      role: 'cashier',
      permissions: ['dashboard', 'sales', 'customers', 'cashDrawer'],
      name: 'Pilot Cashier',
      isActive: true,
      mustChangePassword: false,
    });
    assert.equal(cashierCreate.status, 201);

    const cashierLogin = await api('POST', port, '/api/auth/login', '', { username: 'pilot_cashier', password: 'Cashier123!' });
    assert.equal(cashierLogin.status, 200);
    const cashierCookie = extractCookie(cashierLogin.headers['set-cookie']);

    const openShift = await api('POST', port, '/api/cashier-shifts/open', cashierCookie, { openingCash: 100 });
    assert.equal(openShift.status, 201);
    const shiftId = Number((openShift.body.cashierShifts || [])[0]?.id || 0);
    assert.ok(shiftId > 0);

    const heldDraft = await api('POST', port, '/api/held-sales', cashierCookie, {
      paymentType: 'cash',
      cashAmount: 15,
      cardAmount: 0,
      items: [{ productId, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail', name: 'Pilot Product' }],
      note: 'pilot hold draft',
    });
    assert.equal(heldDraft.status, 201);
    const heldId = Number(heldDraft.body.draft?.id || 0);
    assert.ok(heldId > 0);

    const heldList = await api('GET', port, '/api/held-sales', cashierCookie);
    assert.equal(heldList.status, 200);
    assert.ok((heldList.body.heldSales || []).some((entry) => Number(entry.id) === heldId));

    const sale = await api('POST', port, '/api/sales', cashierCookie, {
      paymentType: 'cash',
      cashAmount: 10,
      cardAmount: 20,
      payments: [
        { paymentChannel: 'cash', amount: 10 },
        { paymentChannel: 'card', amount: 20 },
      ],
      items: [
        { productId, qty: 2, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail' }
      ],
      note: 'pilot smoke sale split',
    });
    assert.equal(sale.status, 201);
    const saleId = sale.body.sale.id;
    assert.equal(String(sale.body.sale.paymentChannel || ''), 'mixed');
    assert.ok(Array.isArray(sale.body.sale.payments));
    assert.equal((sale.body.sale.payments || []).length, 2);

    const saleList = await api('GET', port, '/api/sales', cashierCookie);
    assert.equal(saleList.status, 200);
    assert.ok((saleList.body.sales || []).some((entry) => String(entry.id) === String(saleId)));

    const saleReturn = await api('POST', port, '/api/returns', adminCookie, {
      type: 'sale',
      invoiceId: saleId,
      items: [{ productId, qty: 1, productName: 'Pilot Product' }],
      managerPin: '1234',
      note: 'pilot smoke return',
    });
    assert.equal(saleReturn.status, 201);

    const deleteHeld = await api('DELETE', port, `/api/held-sales/${heldId}`, cashierCookie);
    assert.equal(deleteHeld.status, 200);
    assert.ok(!(deleteHeld.body.heldSales || []).some((entry) => Number(entry.id) === heldId));

    const audit = await api('GET', port, '/api/audit-logs', adminCookie);
    assert.equal(audit.status, 200);
    const auditLogs = audit.body.auditLogs || [];
    assert.ok(auditLogs.some((entry) => String(entry.action || '').includes('فتح وردية كاشير')));
    assert.ok(auditLogs.some((entry) => String(entry.action || '').includes('بيع مختلط')));
    assert.ok(auditLogs.some((entry) => String(entry.action || '').includes('مرتجع بيع')));
    assert.ok(auditLogs.some((entry) => String(entry.action || '').includes('حذف فاتورة معلقة')));
    const mixedSaleAudit = auditLogs.find((entry) => String(entry.action || '').includes('بيع مختلط'));
    assert.ok(String(mixedSaleAudit?.detailsSummary || mixedSaleAudit?.details || '').includes('الدفعات') || String(mixedSaleAudit?.detailsSummary || mixedSaleAudit?.details || '').includes('الدفع'));

    const closeShift = await api('POST', port, `/api/cashier-shifts/${shiftId}/close`, cashierCookie, { countedCash: 95, note: 'pilot smoke close', managerPin: '1234' });
    assert.equal(closeShift.status, 200);

    const printTest = await api('GET', port, '/api/settings', adminCookie);
    assert.equal(printTest.status, 200);
    assert.equal(printTest.body.storeName, 'Pilot Smoke Store');

    console.log('Pilot smoke flow passed');
  } catch (error) {
    console.error(stderr);
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
})();
