import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import { reportsApi, type ReportInventoryRow } from '@/features/reports/api/reports.api';
import type { Customer, ReportSummary } from '@/types/domain';
import { formatPercent, integerFormatter } from '@/features/reports/lib/reports-format';

export function useReportsWorkspaceActions({
  report,
  submittedRange,
  rangeDays,
  executiveRows,
  topProducts,
  inventorySearch,
  inventoryFilter,
  balancesSearch,
  balancesFilter,
}: {
  report: ReportSummary | null;
  submittedRange: { from: string; to: string };
  rangeDays: number;
  executiveRows: Array<[string, number]>;
  topProducts: Array<{ name?: string; qty?: number; revenue?: number }>;
  inventorySearch: string;
  inventoryFilter: 'all' | 'attention' | 'low' | 'out';
  balancesSearch: string;
  balancesFilter: 'all' | 'high-balance' | 'over-limit';
}) {
  const exportLowStock = async () => {
    const rows = await reportsApi.listAllInventory({ search: inventorySearch, filter: inventoryFilter });
    downloadCsvFile('low-stock-products.csv', ['name', 'stock', 'minStock', 'category', 'supplier', 'status'], rows.map((item) => [item.name, item.stock, item.minStock, item.category, item.supplier, item.status]));
  };

  const exportCustomerBalances = async () => {
    const rows = await reportsApi.listAllCustomerBalances({ search: balancesSearch, filter: balancesFilter });
    downloadCsvFile('customer-balances.csv', ['name', 'phone', 'balance', 'creditLimit'], rows.map((item) => [item.name, item.phone, item.balance, item.creditLimit]));
  };

  const exportExecutiveSummary = () => {
    downloadCsvFile('executive-summary.csv', ['metric', 'value'], executiveRows.map(([metric, value]: [string, number]) => [metric, value]));
  };

  const exportTopProducts = () => {
    downloadCsvFile('top-products.csv', ['product', 'qty', 'revenue'], topProducts.map((item) => [item.name, item.qty, item.revenue]));
  };

  const printTopProducts = () => {
    if (!topProducts.length) return;
    printHtmlDocument('أعلى الأصناف', `
      <div class="meta-grid">
        <div class="meta-box"><strong>الأيام المغطاة</strong><span>${rangeDays} يوم</span></div>
        <div class="meta-box"><strong>صافي البيع</strong><span>${formatCurrency(report?.sales.netSales || 0)}</span></div>
      </div>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>الإيراد</th></tr></thead>
        <tbody>${topProducts.map((item) => `<tr><td>${escapeHtml(item.name || '—')}</td><td>${integerFormatter(item.qty || 0)}</td><td>${formatCurrency(item.revenue || 0)}</td></tr>`).join('')}</tbody>
      </table>
    `, { subtitle: 'أفضل الأصناف خلال النطاق الحالي', pageSize: 'A4' });
  };

  const printExecutiveSummary = () => {
    if (!report) return;
    printHtmlDocument('التقرير التنفيذي', `
      <div class="meta-grid">
        <div class="meta-box"><strong>الفترة</strong><span>${escapeHtml(submittedRange.from)} → ${escapeHtml(submittedRange.to)}</span></div>
        <div class="meta-box"><strong>الأيام المغطاة</strong><span>${rangeDays} يوم</span></div>
        <div class="meta-box"><strong>صافي الخزينة</strong><span>${formatCurrency(report?.treasury.net || 0)}</span></div>
      </div>
      <table>
        <tbody>
          ${executiveRows.map(([metric, value]: [string, number]) => `<tr><th>${escapeHtml(metric)}</th><td>${metric === 'هامش الربح %' ? formatPercent(Number(value || 0)) : formatCurrency(Number(value || 0))}</td></tr>`).join('')}
        </tbody>
      </table>
    `, { subtitle: 'ملخص قيادي موحد من شاشة التقارير', pageSize: 'A4', footerHtml: `<div>نطاق التقرير: ${escapeHtml(submittedRange.from)} → ${escapeHtml(submittedRange.to)}</div>` });
  };

  const printLowStockList = async () => {
    const rows = await reportsApi.listAllInventory({ search: inventorySearch, filter: inventoryFilter });
    if (!rows.length) return;
    printHtmlDocument('أصناف تحتاج متابعة', `
      <div class="meta">عدد الأصناف المطابقة: ${rows.length}</div>
      <table>
        <thead><tr><th>الصنف</th><th>المخزون</th><th>الحد الأدنى</th><th>القسم</th><th>المورد</th></tr></thead>
        <tbody>${rows.map((item: ReportInventoryRow) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(String(item.stock))}</td><td>${escapeHtml(String(item.minStock || 0))}</td><td>${escapeHtml(item.category || '—')}</td><td>${escapeHtml(item.supplier || '—')}</td></tr>`).join('')}</tbody>
      </table>
    `, { subtitle: 'قائمة متابعة المخزون منخفض الكمية', pageSize: 'A4' });
  };

  const printCustomerBalances = async () => {
    const rows = await reportsApi.listAllCustomerBalances({ search: balancesSearch, filter: balancesFilter });
    if (!rows.length) return;
    printHtmlDocument('العملاء الأعلى رصيدًا', `
      <div class="meta">عدد العملاء المطابقين: ${rows.length}</div>
      <table>
        <thead><tr><th>العميل</th><th>الهاتف</th><th>الرصيد</th><th>حد الائتمان</th></tr></thead>
        <tbody>${rows.map((customer: Customer) => `<tr><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.phone || '—')}</td><td>${formatCurrency(customer.balance || 0)}</td><td>${formatCurrency(customer.creditLimit || 0)}</td></tr>`).join('')}</tbody>
      </table>
    `, { subtitle: 'ذمم العملاء الأعلى ضمن النطاق الحالي', pageSize: 'A4' });
  };

  const copyExecutiveSummary = async () => {
    if (!report || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    const lines = [
      `الفترة: ${submittedRange.from} → ${submittedRange.to}`,
      `الأيام المغطاة: ${rangeDays}`,
      ...executiveRows.map(([metric, value]: [string, number]) => `${metric}: ${metric === 'هامش الربح %' ? formatPercent(Number(value || 0)) : formatCurrency(Number(value || 0))}`),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
  };

  return {
    exportExecutiveSummary,
    printExecutiveSummary,
    copyExecutiveSummary,
    exportTopProducts,
    printTopProducts,
    exportLowStock,
    printLowStockList,
    exportCustomerBalances,
    printCustomerBalances,
  };
}
