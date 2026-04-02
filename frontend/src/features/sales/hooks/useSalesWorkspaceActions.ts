import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import { salesApi } from '@/features/sales/api/sales.api';
import type { Sale } from '@/types/domain';

export function useSalesWorkspaceActions(params: {
  search: string;
  viewFilter: 'all' | 'cash' | 'credit' | 'cancelled';
  totalItems: number;
  summary?: { totalSales?: number; creditTotal?: number; cancelledCount?: number } | null;
  topCustomers: Array<{ name: string; count: number; total: number }>;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearch: (value: string) => void;
  setViewFilter: (value: 'all' | 'cash' | 'credit' | 'cancelled') => void;
  setSelectedSaleId: (value: string) => void;
  setSaleToCancel: (value: Sale | null) => void;
  setSaleToEdit: (value: Sale | null) => void;
}) {
  const { search, viewFilter, totalItems, summary, topCustomers, setPage, setPageSize, setSearch, setViewFilter, setSelectedSaleId, setSaleToCancel, setSaleToEdit } = params;

  async function exportSalesCsv() {
    const result = await salesApi.listAll({ search, filter: viewFilter });
    downloadCsvFile('sales-register-results.csv', ['docNo', 'customer', 'status', 'paymentType', 'total', 'paidAmount', 'date', 'branch', 'location'], result.rows.map((sale) => [
      sale.docNo || sale.id,
      sale.customerName || 'عميل نقدي',
      sale.status || '',
      sale.paymentType || '',
      sale.total || 0,
      sale.paidAmount || 0,
      sale.date || '',
      sale.branchName || '',
      sale.locationName || ''
    ]));
  }

  function exportTopCustomersCsv() {
    downloadCsvFile('top-customers-sales.csv', ['customer', 'invoices', 'total'], topCustomers.map((customer) => [customer.name, customer.count, customer.total]));
  }

  function resetSalesView() {
    setPage(1);
    setPageSize(30);
    setSearch('');
    setViewFilter('all');
    setSelectedSaleId('');
    setSaleToCancel(null);
    setSaleToEdit(null);
  }

  async function copySalesSummary() {
    if (!totalItems || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    const lines = [
      'ملخص المبيعات الحالي',
      `عدد الفواتير: ${totalItems}`,
      `إجمالي المبيعات: ${formatCurrency(summary?.totalSales || 0)}`,
      `مبيعات آجلة: ${formatCurrency(summary?.creditTotal || 0)}`,
      `فواتير ملغاة: ${summary?.cancelledCount || 0}`
    ];
    if (topCustomers.length) {
      lines.push('أعلى العملاء:');
      topCustomers.forEach((customer, index) => {
        lines.push(`${index + 1}. ${customer.name} - ${customer.count} فاتورة - ${formatCurrency(customer.total)}`);
      });
    }
    await navigator.clipboard.writeText(lines.join('\n'));
  }

  function printTopCustomers() {
    if (!topCustomers.length) return;
    printHtmlDocument('أعلى العملاء في المبيعات', `
      <table>
        <thead><tr><th>العميل</th><th>عدد الفواتير</th><th>الإجمالي</th></tr></thead>
        <tbody>${topCustomers.map((customer) => `<tr><td>${escapeHtml(customer.name)}</td><td>${customer.count}</td><td>${formatCurrency(customer.total)}</td></tr>`).join('')}</tbody>
      </table>
    `, {
      subtitle: 'أفضل العملاء وفق النتائج المطابقة لفلاتر شاشة المبيعات',
      pageSize: 'A4',
    });
  }

  async function printSalesRegister() {
    if (!totalItems) return;
    const result = await salesApi.listAll({ search, filter: viewFilter });
    printHtmlDocument('سجل المبيعات', `
      <div class="meta-grid">
        <div class="meta-box"><strong>عدد الفواتير</strong><span>${result.rows.length}</span></div>
        <div class="meta-box"><strong>إجمالي المبيعات</strong><span>${formatCurrency(summary?.totalSales || 0)}</span></div>
      </div>
      <table>
        <thead><tr><th>الفاتورة</th><th>العميل</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>التاريخ</th></tr></thead>
        <tbody>${result.rows.map((sale) => `<tr><td>${escapeHtml(sale.docNo || sale.id)}</td><td>${escapeHtml(sale.customerName || 'عميل نقدي')}</td><td>${escapeHtml(sale.status || '')}</td><td>${escapeHtml(sale.paymentType || '')}</td><td>${formatCurrency(sale.total || 0)}</td><td>${escapeHtml(sale.date || '')}</td></tr>`).join('')}</tbody>
      </table>
    `, { subtitle: 'نتائج سجل المبيعات الحالية', pageSize: 'A4' });
  }

  return {
    exportSalesCsv,
    exportTopCustomersCsv,
    resetSalesView,
    copySalesSummary,
    printTopCustomers,
    printSalesRegister,
  };
}
