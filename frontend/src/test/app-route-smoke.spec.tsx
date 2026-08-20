import { screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installGlobalAppFetchMock, renderAppAt } from '@/test/helpers/mock-app-api';

beforeEach(() => {
  installGlobalAppFetchMock();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const routes = [
  ['/', /الرئيسية/],
  ['/products', /الأصناف/],
  ['/sales', /المبيعات/],
  ['/pos', /الكاشير/],
  ['/cash-drawer', /الورديات/],
  ['/purchases', /المشتريات/],
  ['/inventory', /المخزون/],
  ['/suppliers', /الموردون/],
  ['/customers', /العملاء/],
  ['/accounts', /الحسابات/],
  ['/returns', /المرتجعات/],
  ['/reports/overview', /التقارير/],
  ['/audit', /سجل النشاط/],
  ['/treasury', /الخزينة/],
  ['/services', /الخدمات/],
  ['/settings/overview', /إعدادات/],
] as const;

describe('app route smoke', () => {
  vi.setConfig({ testTimeout: 15000 });
  const queryTimeout = { timeout: 4000 };

  it.each(routes)('loads %s', async (path, title) => {
    await renderAppAt(path);
    expect((await screen.findAllByText(title, undefined, queryTimeout)).length).toBeGreaterThan(0);
  });

  it('shows customer balances on accounts page', async () => {
    await renderAppAt('/accounts');
    expect((await screen.findAllByText(/الحسابات/, undefined, queryTimeout)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('عميل الآجل', undefined, queryTimeout)).length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: 'تحصيل من عميل' }, queryTimeout)).toBeInTheDocument();
  });
});
