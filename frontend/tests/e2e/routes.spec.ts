import { test, expect } from '@playwright/test';
import { installMockApi } from './helpers/mockApi';

const routes = [
  { path: '/', title: 'الرئيسية' },
  { path: '/products', title: 'الأصناف' },
  { path: '/sales', title: 'المبيعات' },
  { path: '/pos', title: 'الكاشير' },
  { path: '/cash-drawer', title: 'الورديات' },
  { path: '/purchases', title: 'المشتريات' },
  { path: '/inventory', title: 'المخزون' },
  { path: '/suppliers', title: 'الموردون' },
  { path: '/customers', title: 'العملاء' },
  { path: '/accounts', title: 'الحسابات' },
  { path: '/returns', title: 'المرتجعات' },
  { path: '/reports/overview', title: 'التقارير' },
  { path: '/audit', title: 'سجل النشاط' },
  { path: '/treasury', title: 'الخزينة' },
  { path: '/services', title: 'الخدمات' },
  { path: '/settings/overview', title: 'إعدادات' },
];

test.describe('route smoke coverage', () => {
  for (const route of routes) {
    test(`loads ${route.path}`, async ({ page }) => {
      const mock = await installMockApi(page);
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: new RegExp(route.title) }).first()).toBeVisible();
      await mock.expectNoClientErrors();
    });
  }

  test('accounts page shows customer balances data', async ({ page }) => {
    const mock = await installMockApi(page);
    await page.goto('/accounts');
    await expect(page.locator('option', { hasText: 'عميل الآجل' })).toHaveCount(1);
    await expect(page.getByText('تحصيل من عميل')).toBeVisible();
    await mock.expectNoClientErrors();
  });
});
