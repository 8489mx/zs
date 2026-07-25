import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
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
    downloadExcelFile('purchases-register-results.xlsx', ['docNo', 'supplier', 'status', 'paymentType', 'total', 'date', 'branch', 'location'], result.rows.map((purchase) => [
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
    downloadExcelFile('top-suppliers-purchases.xlsx', ['supplier', 'invoices', 'total'], topSuppliers.map((supplier) => [supplier.name, supplier.count, supplier.total]));
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
      <table style="border: 1px solid #e2e8f0; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
            <th style="border: 1px solid #e2e8f0; text-align: right;">الفاتورة</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">المورد</th>
            <th style="border: 1px solid #e2e8f0; text-align: center;">الحالة</th>
            <th style="border: 1px solid #e2e8f0; text-align: center;">الدفع</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">الإجمالي</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">التاريخ</th>
          </tr>
        </thead>
        <tbody>${result.rows.map((purchase) => {
          const statusColor = purchase.status === 'completed' || purchase.status === 'paid' ? '#16a34a' : purchase.status === 'cancelled' || purchase.status === 'refunded' ? '#dc2626' : '#ea580c';
          
          let rowHtml = `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="border: 1px solid #e2e8f0;"><strong>${escapeHtml(purchase.docNo || purchase.id)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${escapeHtml(purchase.supplierName || '—')}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center; color: ${statusColor}; font-weight: bold;">${escapeHtml(purchase.status || '')}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center;">${escapeHtml(purchase.paymentType || '')}</td>
            <td style="border: 1px solid #e2e8f0;"><strong>${formatCurrency(purchase.total || 0)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${escapeHtml(purchase.date || '')}</td>
          </tr>`;

          if (purchase.items && purchase.items.length > 0) {
             const itemsDetails = purchase.items.map(item => `
               <div style="display: inline-flex; align-items: center; background: #fff; padding: 2px 8px; border-radius: 6px; margin: 2px; font-size: 0.9em; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                 ${escapeHtml(item.name || (item as any).productName)} <strong style="color: #0369a1; padding-right: 6px; font-size: 1.05em; font-weight: 800;">(${item.qty})</strong>
               </div>
             `).join('');
             rowHtml += `<tr><td colspan="6" style="padding: 10px 16px; border-bottom: 2px solid #cbd5e1; background: #f8fafc; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
               <div style="font-weight: 800; margin-bottom: 6px; font-size: 0.9em; color: #475569; display: flex; align-items: center; gap: 4px;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                 تفاصيل الفاتورة:
               </div>
               <div style="display: flex; flex-wrap: wrap; gap: 4px;">${itemsDetails}</div>
             </td></tr>`;
          }
          return rowHtml;
        }).join('')}</tbody>
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
