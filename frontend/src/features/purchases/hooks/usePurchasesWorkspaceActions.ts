import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import type { Purchase } from '@/types/domain';

export function usePurchasesWorkspaceActions(params: {
  search: string;
  viewFilter: 'all' | 'cash' | 'credit' | 'cancelled';
  totalItems: number;
  summary?: { totalAmount?: number; creditTotal?: number; cancelledCount?: number } | null;
  topSuppliers: Array<{ name: string; count: number; total: number }>;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearch: (value: string) => void;
  setViewFilter: (value: 'all' | 'cash' | 'credit' | 'cancelled') => void;
  setSelectedPurchaseId: (value: string) => void;
  setPurchaseToCancel: (value: Purchase | null) => void;
  setPurchaseToEdit: (value: Purchase | null) => void;
}) {
  const { search, viewFilter, totalItems, summary, topSuppliers, setPage, setPageSize, setSearch, setViewFilter, setSelectedPurchaseId, setPurchaseToCancel, setPurchaseToEdit } = params;

  async function exportPurchasesCsv() {
    const result = await purchasesApi.listAll({ search, filter: viewFilter });
    downloadCsvFile('purchases-register-results.csv', ['docNo', 'supplier', 'status', 'paymentType', 'total', 'date', 'branch', 'location'], result.rows.map((purchase) => [
      purchase.docNo || purchase.id,
      purchase.supplierName || '',
      purchase.status || '',
      purchase.paymentType || '',
      purchase.total || 0,
      purchase.date || '',
      purchase.branchName || '',
      purchase.locationName || ''
    ]));
  }

  function exportTopSuppliersCsv() {
    downloadCsvFile('top-suppliers-purchases.csv', ['supplier', 'invoices', 'total'], topSuppliers.map((supplier) => [supplier.name, supplier.count, supplier.total]));
  }

  function resetPurchasesView() {
    setPage(1);
    setPageSize(25);
    setSearch('');
    setViewFilter('all');
    setSelectedPurchaseId('');
    setPurchaseToCancel(null);
    setPurchaseToEdit(null);
  }

  async function copyPurchasesSummary() {
    if (!totalItems || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    const lines = [
      'ملخص المشتريات الحالي',
      `عدد الفواتير: ${totalItems}`,
      `إجمالي المشتريات: ${formatCurrency(summary?.totalAmount || 0)}`,
      `مشتريات آجلة: ${formatCurrency(summary?.creditTotal || 0)}`,
      `فواتير ملغاة: ${summary?.cancelledCount || 0}`
    ];
    if (topSuppliers.length) {
      lines.push('أعلى الموردين:');
      topSuppliers.forEach((supplier, index) => {
        lines.push(`${index + 1}. ${supplier.name} - ${supplier.count} فاتورة - ${formatCurrency(supplier.total)}`);
      });
    }
    await navigator.clipboard.writeText(lines.join('\n'));
  }

  function printTopSuppliers() {
    if (!topSuppliers.length) return;
    printHtmlDocument('أعلى الموردين في المشتريات', `
      <table>
        <thead><tr><th>المورد</th><th>عدد الفواتير</th><th>الإجمالي</th></tr></thead>
        <tbody>${topSuppliers.map((supplier) => `<tr><td>${escapeHtml(supplier.name)}</td><td>${supplier.count}</td><td>${formatCurrency(supplier.total)}</td></tr>`).join('')}</tbody>
      </table>
    `, {
      subtitle: 'أفضل الموردين وفق النتائج المطابقة لفلاتر شاشة المشتريات',
      pageSize: 'A4',
    });
  }

  async function printPurchasesRegister() {
    if (!totalItems) return;
    const result = await purchasesApi.listAll({ search, filter: viewFilter });
    printHtmlDocument('سجل المشتريات', `
      <div class="meta-grid">
        <div class="meta-box"><strong>عدد الفواتير</strong><span>${result.rows.length}</span></div>
        <div class="meta-box"><strong>إجمالي المشتريات</strong><span>${formatCurrency(summary?.totalAmount || 0)}</span></div>
      </div>
      <table>
        <thead><tr><th>الفاتورة</th><th>المورد</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>التاريخ</th></tr></thead>
        <tbody>${result.rows.map((purchase) => `<tr><td>${escapeHtml(purchase.docNo || purchase.id)}</td><td>${escapeHtml(purchase.supplierName || '')}</td><td>${escapeHtml(purchase.status || '')}</td><td>${escapeHtml(purchase.paymentType || '')}</td><td>${formatCurrency(purchase.total || 0)}</td><td>${escapeHtml(purchase.date || '')}</td></tr>`).join('')}</tbody>
      </table>
    `, { subtitle: 'نتائج سجل المشتريات الحالية', pageSize: 'A4' });
  }

  return {
    exportPurchasesCsv,
    exportTopSuppliersCsv,
    resetPurchasesView,
    copyPurchasesSummary,
    printTopSuppliers,
    printPurchasesRegister,
  };
}
