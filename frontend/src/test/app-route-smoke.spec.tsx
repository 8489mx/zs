import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const today = new Date().toISOString();
const permissions = [
  'dashboard', 'products', 'sales', 'cashDrawer', 'treasury', 'purchases', 'inventory', 'suppliers',
  'customers', 'accounts', 'returns', 'reports', 'audit', 'services', 'settings', 'canManageSettings',
  'canPrint'
];
const customers = [
  { id: 'cust-1', name: 'عميل الآجل', phone: '01000000001', address: 'القاهرة', balance: 150, type: 'credit', creditLimit: 1000, storeCreditBalance: 0 },
  { id: 'cust-2', name: 'عميل نقدي', phone: '01000000002', address: 'الجيزة', balance: 0, type: 'cash', creditLimit: 0, storeCreditBalance: 0 },
];
const suppliers = [
  { id: 'sup-1', name: 'مورد رئيسي', phone: '02000000001', address: 'القاهرة', balance: 320, notes: 'توريد أسبوعي' },
  { id: 'sup-2', name: 'مورد سريع', phone: '02000000002', address: 'الجيزة', balance: 0, notes: '' },
];
const products = [{
  id: 'prod-1', name: 'مياه معدنية', barcode: '111', categoryId: 'cat-1', supplierId: 'sup-1',
  costPrice: 5, retailPrice: 10, wholesalePrice: 8, stock: 20, minStock: 5, notes: '',
  units: [{ id: 'unit-1', name: 'قطعة', multiplier: 1, barcode: '111', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
  offers: [], customerPrices: [], status: 'available', statusLabel: 'متاح'
}];
const summary = {
  sales: { count: 1, total: 100, netSales: 100 },
  purchases: { count: 1, total: 50, netPurchases: 50 },
  expenses: { count: 1, total: 20 },
  returns: { count: 0, total: 0, salesTotal: 0, purchasesTotal: 0 },
  treasury: { cashIn: 100, cashOut: 20, net: 80 },
  commercial: { grossProfit: 50, grossMarginPercent: 50, netOperatingProfit: 30, cogs: 50, informationalOnlyPurchasesInPeriod: 0 },
  topProducts: [{ name: 'مياه معدنية', qty: 10, revenue: 100 }],
};
const dashboardOverview = {
  range: { from: today, to: today },
  summary: { ...summary, totalProducts: 1, totalCustomers: 2, totalSuppliers: 2, lowStockCount: 0, outOfStockCount: 0, activeOffers: 0 },
  stats: {
    productsCount: 1, customersCount: 2, suppliersCount: 2, todaySalesCount: 1, todaySalesAmount: 100,
    todayPurchasesCount: 1, todayPurchasesAmount: 50, inventoryCost: 100, inventorySaleValue: 200,
    customerDebt: 150, supplierDebt: 320, nearCreditLimit: 0, aboveCreditLimit: 0, highSupplierBalances: 1, activeOffers: 0,
  },
  lowStock: [], topToday: [{ productId: 'prod-1', name: 'مياه معدنية', qty: 10, total: 100 }],
  topCustomers: [{ key: 'cust-1', name: 'عميل الآجل', total: 100, count: 1 }],
  topSuppliers: [{ key: 'sup-1', name: 'مورد رئيسي', total: 50, count: 1 }],
  trends: { sales: [{ key: today.slice(0, 10), value: 100 }], purchases: [{ key: today.slice(0, 10), value: 50 }] },
};
const settings = {
  storeName: 'متجر تجريبي', brandName: 'متجر تجريبي', phone: '01000000000', address: 'القاهرة', lowStockThreshold: 5,
  invoiceFooter: 'شكرًا لتعاملكم معنا', invoiceQR: '', taxNumber: '12345', taxRate: 14, taxMode: 'exclusive',
  paperSize: 'receipt', managerPin: '1234', hasManagerPin: true, autoBackup: 'off', accentColor: '#2563eb',
  logoData: '', currentBranchId: 'branch-1', currentLocationId: 'loc-1', theme: 'light'
};
const branches = [{ id: 'branch-1', name: 'الفرع الرئيسي', code: 'MAIN', address: 'القاهرة', phone: '01000000000', isActive: true }];
const locations = [{ id: 'loc-1', name: 'المخزن الرئيسي', branchId: 'branch-1', isActive: true }];

function responseOf(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function pageEnvelope<T>(key: string, rows: T[], summaryObj: Record<string, unknown> = {}) {
  return {
    [key]: rows,
    pagination: { page: 1, pageSize: 20, totalItems: rows.length, totalPages: 1 },
    summary: summaryObj,
  };
}

function apiPayload(pathname: string) {
  if (pathname === '/api/auth/me') {
    return {
      user: { id: 'user-1', username: 'admin', role: 'super_admin', permissions, displayName: 'Admin', branchIds: ['branch-1'], defaultBranchId: 'branch-1' },
      settings: { storeName: settings.storeName, theme: settings.theme },
      security: { mustChangePassword: false, usingDefaultAdminPassword: false },
    };
  }
  if (pathname === '/api/dashboard/overview') return dashboardOverview;
  if (pathname === '/api/reports/summary') return summary;
  if (pathname === '/api/settings') return { settings };
  if (pathname === '/api/branches') return { branches };
  if (pathname === '/api/locations') return { locations };
  if (pathname === '/api/products') return pageEnvelope('products', products, { totalProducts: 1, lowStockCount: 0, outOfStockCount: 0, inventoryCost: 100, inventorySaleValue: 200, activeOffersCount: 0, customerPriceCount: 0 });
  if (pathname === '/api/categories') return { categories: [{ id: 'cat-1', name: 'مشروبات' }] };
  if (pathname === '/api/customers') return pageEnvelope('customers', customers, { totalCustomers: 2, totalBalance: 150, totalCredit: 150, vipCount: 1 });
  if (pathname === '/api/suppliers') return pageEnvelope('suppliers', suppliers, { totalSuppliers: 2, totalBalance: 320, withNotes: 1 });
  if (pathname === '/api/sales') return { sales: [{ id: 'sale-1', createdAt: today, invoiceNumber: 'S-1', customerId: 'cust-1', customerName: 'عميل الآجل', total: 100, paid: 50, due: 50, paymentType: 'credit', items: [] }] };
  if (pathname === '/api/purchases') return pageEnvelope('purchases', [{ id: 'pur-1', createdAt: today, invoiceNumber: 'P-1', supplierId: 'sup-1', supplierName: 'مورد رئيسي', total: 50, paid: 50, due: 0, items: [] }], { totalPurchases: 1, totalAmount: 50, totalDue: 0 });
  if (pathname === '/api/returns') return { returns: [{ id: 'ret-1', createdAt: today, type: 'sale', partyName: 'عميل الآجل', total: 0, items: [] }], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }, summary: { totalReturns: 1, totalAmount: 0 } };
  if (pathname === '/api/reports/customer-balances') return { customers };
  if (/^\/api\/reports\/customers\/[^/]+\/ledger$/.test(pathname)) return { customer: customers[0], entries: [{ id: 'cle-1', date: today, type: 'sale', amount: 100, balance: 150, note: 'فاتورة بيع' }], summary: { debit: 100, credit: 50, balance: 150 }, pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } };
  if (/^\/api\/reports\/suppliers\/[^/]+\/ledger$/.test(pathname)) return { supplier: suppliers[0], entries: [{ id: 'sle-1', date: today, type: 'purchase', amount: 50, balance: 320, note: 'فاتورة شراء' }], summary: { debit: 50, credit: 0, balance: 320 }, pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } };
  if (pathname === '/api/reports/inventory') return { inventory: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { totalItems: 1, lowStockItems: 0, outOfStockItems: 0, inventoryCost: 100, inventorySaleValue: 200 } };
  if (pathname === '/api/cashier-shifts') return { cashierShifts: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { openShifts: 0, totalCashInDrawer: 0 } };
  if (pathname === '/api/treasury-transactions') return { transactions: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { totalIn: 100, totalOut: 20, balance: 80 } };
  if (pathname === '/api/expenses') return { expenses: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { totalExpenses: 20 } };
  if (pathname === '/api/stock-transfers') return { stockTransfers: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { pending: 0, completed: 0 } };
  if (pathname === '/api/stock-movements') return { stockMovements: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { totalIn: 0, totalOut: 0 } };
  if (pathname === '/api/stock-count-sessions') return { stockCountSessions: [], damagedStockRecords: [] };
  if (pathname === '/api/damaged-stock') return { damagedStockRecords: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }, summary: { totalItems: 0 } };
  if (pathname === '/api/backup-snapshots') return { snapshots: [] };
  if (pathname === '/api/users') return { users: [{ id: 'user-1', username: 'admin', displayName: 'Admin', role: 'super_admin', permissions, isActive: true, branchIds: ['branch-1'], defaultBranchId: 'branch-1' }], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } };
  if (pathname.startsWith('/api/admin/')) return { ok: true, generatedAt: today };
  if (pathname === '/api/services') return { services: [{ id: 'svc-1', name: 'صيانة', price: 25, cost: 5, category: 'خدمات', isActive: true, notes: '' }], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }, summary: { totalServices: 1, activeServices: 1 } };
  if (pathname === '/api/audit-logs') return { logs: [{ id: 'log-1', action: 'sale.created', details: 'اختبار', createdAt: today, createdByName: 'Admin' }], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } };
  if (pathname === '/api/held-sales') return { heldSales: [] };
  if (pathname === '/api/health') return { ok: true };
  return { ok: true };
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    return responseOf(apiPayload(url.pathname));
  });
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

async function renderAt(path: string) {
  vi.resetModules();
  window.history.pushState({}, '', path);
  const { AppProviders } = await import('@/app/providers');
  const { AppRouter } = await import('@/app/router');
  render(<AppProviders><AppRouter /></AppProviders>);
}

describe('app route smoke', () => {
  vi.setConfig({ testTimeout: 15000 });
  it.each(routes)('loads %s', async (path, title) => {
    await renderAt(path);
    expect((await screen.findAllByText(title)).length).toBeGreaterThan(0);
  });

  it('shows customer balances on accounts page', async () => {
    await renderAt('/accounts');
    expect((await screen.findAllByText(/الحسابات/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('عميل الآجل')).toBeInTheDocument();
    expect(await screen.findByText('تحصيل من عميل')).toBeInTheDocument();
  });
});
