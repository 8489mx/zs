# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routes.spec.ts >> route smoke coverage >> loads /sales
- Location: tests/e2e/routes.spec.ts:25:5

# Error details

```
Error: page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:4173/sales
Call log:
  - navigating to "http://127.0.0.1:4173/sales", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e6]:
  - heading "127.0.0.1 is blocked" [level=1] [ref=e7]:
    - generic [ref=e8]: 127.0.0.1 is blocked
  - paragraph [ref=e9]: Your organization doesn’t allow you to view this site
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { installMockApi } from './helpers/mockApi';
  3  | 
  4  | const routes = [
  5  |   { path: '/', title: 'الرئيسية' },
  6  |   { path: '/products', title: 'الأصناف' },
  7  |   { path: '/sales', title: 'المبيعات' },
  8  |   { path: '/pos', title: 'الكاشير' },
  9  |   { path: '/cash-drawer', title: 'الورديات' },
  10 |   { path: '/purchases', title: 'المشتريات' },
  11 |   { path: '/inventory', title: 'المخزون' },
  12 |   { path: '/suppliers', title: 'الموردون' },
  13 |   { path: '/customers', title: 'العملاء' },
  14 |   { path: '/accounts', title: 'الحسابات' },
  15 |   { path: '/returns', title: 'المرتجعات' },
  16 |   { path: '/reports/overview', title: 'التقارير' },
  17 |   { path: '/audit', title: 'سجل النشاط' },
  18 |   { path: '/treasury', title: 'الخزينة' },
  19 |   { path: '/services', title: 'الخدمات' },
  20 |   { path: '/settings/overview', title: 'إعدادات' },
  21 | ];
  22 | 
  23 | test.describe('route smoke coverage', () => {
  24 |   for (const route of routes) {
  25 |     test(`loads ${route.path}`, async ({ page }) => {
  26 |       const mock = await installMockApi(page);
> 27 |       await page.goto(route.path);
     |                  ^ Error: page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:4173/sales
  28 |       await expect(page.getByRole('heading', { name: new RegExp(route.title) }).first()).toBeVisible();
  29 |       await mock.expectNoClientErrors();
  30 |     });
  31 |   }
  32 | 
  33 |   test('accounts page shows customer balances data', async ({ page }) => {
  34 |     const mock = await installMockApi(page);
  35 |     await page.goto('/accounts');
  36 |     await expect(page.locator('option', { hasText: 'عميل الآجل' })).toHaveCount(1);
  37 |     await expect(page.getByText('تحصيل من عميل')).toBeVisible();
  38 |     await mock.expectNoClientErrors();
  39 |   });
  40 | });
  41 | 
```