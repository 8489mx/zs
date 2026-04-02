const { test, expect, request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function api(context, method, url, data, cookie) {
  const response = await context.fetch(url, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}),
    },
    data,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status(), body, headers: response.headers() };
}

function getSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const match = headers.map((value) => String(value)).find((value) => value.startsWith('session_id='));
  if (!match) return '';
  return match.split(';')[0];
}

async function loginAsAdmin(apiContext, baseURL) {
  const login = await api(apiContext, 'POST', `${baseURL}/api/auth/login`, {
    username: 'admin',
    password: 'AdminPass123!',
  });
  expect(login.status).toBe(200);
  const adminCookie = getSessionCookie(login.headers['set-cookie'] || login.headers['Set-Cookie']);
  expect(adminCookie).toContain('session_id=');
  return adminCookie;
}

async function ensureBranch(apiContext, baseURL, adminCookie) {
  const create = await api(apiContext, 'POST', `${baseURL}/api/branches`, { name: 'الفرع الرئيسي', code: 'MAIN' }, adminCookie);
  if ([200, 201].includes(create.status)) {
    const branchId = Number(create.body.branchId || create.body.id || 0);
    if (branchId > 0) return branchId;
  }

  const list = await api(apiContext, 'GET', `${baseURL}/api/branches`, undefined, adminCookie);
  expect(list.status).toBe(200);
  const branches = Array.isArray(list.body.branches) ? list.body.branches : [];
  const existing = branches.find((item) =>
    String(item.code || '').toUpperCase() === 'MAIN'
    || String(item.name || '').trim() === 'الفرع الرئيسي'
  );
  expect(existing).toBeTruthy();
  return Number(existing.id || existing.branchId || 0);
}

async function ensureLocation(apiContext, baseURL, adminCookie, branchId) {
  const create = await api(apiContext, 'POST', `${baseURL}/api/locations`, {
    name: 'المخزن الرئيسي',
    code: 'WH1',
    branchId,
  }, adminCookie);
  if ([200, 201].includes(create.status)) return;

  const list = await api(apiContext, 'GET', `${baseURL}/api/locations`, undefined, adminCookie);
  expect(list.status).toBe(200);
  const locations = Array.isArray(list.body.locations) ? list.body.locations : [];
  const existing = locations.find((item) =>
    (String(item.code || '').toUpperCase() === 'WH1' || String(item.name || '').trim() === 'المخزن الرئيسي')
    && Number(item.branchId || item.branch_id || branchId) === Number(branchId)
  );
  expect(existing).toBeTruthy();
}

async function ensureCategory(apiContext, baseURL, adminCookie) {
  const create = await api(apiContext, 'POST', `${baseURL}/api/categories`, { name: 'Playwright Category' }, adminCookie);
  if ([200, 201].includes(create.status)) {
    const categories = Array.isArray(create.body.categories) ? create.body.categories : [];
    const created = categories.find((item) => String(item.name || '').trim() === 'Playwright Category');
    if (created) return Number(created.id || 0);
  }

  const list = await api(apiContext, 'GET', `${baseURL}/api/categories`, undefined, adminCookie);
  expect(list.status).toBe(200);
  const categories = Array.isArray(list.body.categories) ? list.body.categories : [];
  const existing = categories.find((item) => String(item.name || '').trim() === 'Playwright Category');
  expect(existing).toBeTruthy();
  return Number(existing.id || 0);
}

async function ensureProduct(apiContext, baseURL, adminCookie, categoryId) {
  const create = await api(apiContext, 'POST', `${baseURL}/api/products`, {
    name: 'Playwright Product',
    barcode: 'PW-001',
    categoryId,
    costPrice: 10,
    retailPrice: 15,
    wholesalePrice: 14,
    stock: 10,
    minStock: 1,
    units: [{ name: 'قطعة', multiplier: 1, barcode: 'PW-001' }],
  }, adminCookie);
  if ([200, 201].includes(create.status)) return;

  const list = await api(apiContext, 'GET', `${baseURL}/api/products`, undefined, adminCookie);
  expect(list.status).toBe(200);
  const products = Array.isArray(list.body.products) ? list.body.products : [];
  const existing = products.find((item) =>
    String(item.barcode || '').trim() === 'PW-001'
    || String(item.name || '').trim() === 'Playwright Product'
  );
  expect(existing).toBeTruthy();
}

async function bootstrapOperationalData(apiContext, baseURL) {
  const adminCookie = await loginAsAdmin(apiContext, baseURL);

  const settings = await api(apiContext, 'PUT', `${baseURL}/api/settings`, {
    storeName: 'Playwright E2E Store',
    taxMode: 'exclusive',
    managerPin: '1234',
    paperSize: '80mm',
    invoiceFooter: 'شكرا لزيارتكم',
  }, adminCookie);
  expect(settings.status).toBe(200);

  const branchId = await ensureBranch(apiContext, baseURL, adminCookie);
  expect(branchId).toBeGreaterThan(0);

  await ensureLocation(apiContext, baseURL, adminCookie, branchId);

  const categoryId = await ensureCategory(apiContext, baseURL, adminCookie);
  expect(categoryId).toBeGreaterThan(0);

  await ensureProduct(apiContext, baseURL, adminCookie, categoryId);
}

test.beforeAll(async ({ baseURL }) => {
  fs.mkdirSync(path.join(__dirname, '..', '.e2e'), { recursive: true });
  const apiContext = await request.newContext();
  try {
    await bootstrapOperationalData(apiContext, baseURL);
  } finally {
    await apiContext.dispose();
  }
});

test('browser smoke: shift, held cart, split sale, return, audit, close shift', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/login`);
  await page.getByLabel('اسم المستخدم').fill('admin');
  await page.getByLabel('كلمة المرور').fill('AdminPass123!');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto(`${baseURL}/cash-drawer`);
  await expect(page.getByRole('heading', { name: 'الورديات والدرج النقدي' })).toBeVisible();
  await page.getByLabel('رصيد الفتح').fill('100');
  await page.getByLabel('ملاحظة الافتتاح').fill('فتح وردية Playwright');
  await page.getByRole('button', { name: 'فتح الوردية' }).click();
  await expect(page.getByText('تم فتح الوردية بنجاح.')).toBeVisible();

  await page.goto(`${baseURL}/pos`);
  await expect(page.getByRole('heading', { name: 'الكاشير', exact: true })).toBeVisible();
  await page.getByPlaceholder(/بحث/).fill('Playwright Product');
  await page.getByRole('button', { name: /Playwright Product/ }).first().click();
  await expect(page.getByText('Playwright Product')).toBeVisible();
  await page.getByRole('button', { name: 'تعليق الفاتورة' }).click();
  await expect(page.getByText('تم تعليق الفاتورة الحالية ويمكن استرجاعها لاحقًا')).toBeVisible();
  await page.getByRole('button', { name: 'استرجاع' }).click();
  await page.getByLabel('نقدي').fill('10');
  await page.getByLabel('بطاقة').fill('5');
  await page.getByLabel('ملاحظات').fill('بيع تجريبي Playwright');
  await page.getByRole('button', { name: 'إتمام البيع' }).click();
  await expect(page.getByText(/تم حفظ فاتورة البيع بنجاح/)).toBeVisible();

  await page.goto(`${baseURL}/returns`);
  await expect(page.getByRole('heading', { name: 'المرتجعات' })).toBeVisible();
  const invoiceSelect = page.getByLabel('الفاتورة');
  await expect(invoiceSelect).toBeVisible();
  const invoiceOptions = await invoiceSelect.locator('option').allTextContents();
  const targetInvoice = invoiceOptions.find((text) => text && text !== 'اختر الفاتورة');
  expect(targetInvoice).toBeTruthy();
  await invoiceSelect.selectOption({ label: targetInvoice });
  const firstCheckbox = page.locator('table.data-table tbody input[type="checkbox"]').first();
  await firstCheckbox.check();
  await page.locator('table.data-table tbody input[type="number"]').first().fill('1');
  await page.getByRole('button', { name: 'تسجيل مرتجع البيع' }).click();
  await page.getByLabel('اكتب كلمة مرتجع للتأكيد').fill('مرتجع');
  await page.getByLabel('سبب المرتجع').fill('مرتجع آلي لتأكيد المسار');
  await page.getByLabel('رمز اعتماد المدير').fill('1234');
  await page.getByRole('button', { name: 'تسجيل مرتجع البيع' }).last().click();
  await expect(page.getByText('تم حفظ المرتجع بنجاح.')).toBeVisible();

  await page.goto(`${baseURL}/audit`);
  await expect(page.getByRole('heading', { name: 'سجل النشاط' })).toBeVisible();
  await expect(page.getByText('فتح وردية كاشير')).toBeVisible();
  await expect(page.getByText('بيع مختلط')).toBeVisible();
  await expect(page.getByText('مرتجع بيع')).toBeVisible();

  await page.goto(`${baseURL}/cash-drawer`);
  const shiftSelect = page.getByLabel('الوردية المفتوحة').last();
  const shiftOptions = await shiftSelect.locator('option').allTextContents();
  const targetShift = shiftOptions.find((text) => text && text !== 'اختر وردية');
  expect(targetShift).toBeTruthy();
  await shiftSelect.selectOption({ label: targetShift });
  await page.getByLabel('المبلغ المعدود').fill('115');
  await page.getByLabel('ملاحظة الإغلاق').fill('إغلاق آلي من Playwright');
  await page.getByRole('button', { name: 'إغلاق الوردية' }).first().click();
  await page.getByLabel('اكتب كلمة التأكيد للمتابعة').fill('إغلاق');
  await page.getByLabel('رمز اعتماد المدير').fill('1234');
  await page.getByRole('button', { name: 'إغلاق الوردية' }).last().click();
  await expect(page.getByText('تم إغلاق الوردية بنجاح.')).toBeVisible();
});
