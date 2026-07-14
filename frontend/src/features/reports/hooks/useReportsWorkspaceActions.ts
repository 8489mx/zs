import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
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
  const shortDateRange = `${new Date(submittedRange.from).toLocaleDateString('en-GB').replace(/\//g, '-')} إلى ${new Date(submittedRange.to).toLocaleDateString('en-GB').replace(/\//g, '-')}`;
  const todayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

  const exportLowStock = async () => {
    const rows = await reportsApi.listAllInventory({ search: inventorySearch, filter: inventoryFilter });
    downloadExcelFile(`الأصناف النواقص ${todayDate}.xlsx`, ['name', 'stock', 'minStock', 'category', 'supplier', 'topLocation', 'locations', 'status'], rows.map((item) => [item.name, item.stock, item.minStock, item.category, item.supplier, item.topLocationName || '', item.locationsLabel || '', item.status]));
  };

  const exportCustomerBalances = async () => {
    const rows = await reportsApi.listAllCustomerBalances({ search: balancesSearch, filter: balancesFilter });
    downloadExcelFile(`أرصدة العملاء ${todayDate}.xlsx`, ['name', 'phone', 'balance', 'creditLimit'], rows.map((item) => [item.name, item.phone, item.balance, item.creditLimit]));
  };

  const exportExecutiveSummary = () => {
    downloadExcelFile(`التقرير التنفيذي ${shortDateRange}.xlsx`, ['metric', 'value'], executiveRows.map(([metric, value]: [string, number]) => [metric, value]));
  };

  const exportTopProducts = () => {
    downloadExcelFile(`أعلى الأصناف ${shortDateRange}.xlsx`, ['product', 'qty', 'revenue'], topProducts.map((item) => [item.name, item.qty, item.revenue]));
  };

  const printTopProducts = () => {
    if (!topProducts.length) return;
    printHtmlDocument(`أعلى الأصناف ${shortDateRange}`, `
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
    printHtmlDocument(`التقرير التنفيذي ${shortDateRange}`, `
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

  const printInventoryValueReport = async () => {
    const rows = await reportsApi.listAllInventory({ search: inventorySearch, filter: inventoryFilter });
    if (!rows.length) return;
    
    const totalQty = rows.reduce((acc, r) => acc + (r.stock || 0), 0);
    const totalCost = rows.reduce((acc, r) => acc + ((r.stock || 0) * (r.costPrice || 0)), 0);
    const totalRetail = rows.reduce((acc, r) => acc + ((r.stock || 0) * (r.retailPrice || 0)), 0);

    printHtmlDocument(`تقرير جرد وقيمة المخزون ${todayDate}`, `
      <div class="meta-grid">
        <div class="meta-box"><strong>إجمالي الأصناف</strong><span>${rows.length}</span></div>
        <div class="meta-box"><strong>إجمالي الكميات</strong><span>${integerFormatter(totalQty)}</span></div>
        <div class="meta-box"><strong>قيمة التكلفة</strong><span>${formatCurrency(totalCost)}</span></div>
        <div class="meta-box"><strong>القيمة التقديرية (بيع)</strong><span>${formatCurrency(totalRetail)}</span></div>
      </div>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>التكلفة للوحدة</th><th>إجمالي التكلفة</th><th>القسم</th><th>المورد</th><th>أكبر موقع</th></tr></thead>
        <tbody>${rows.map((item: ReportInventoryRow) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(String(item.stock))}</td>
          <td>${formatCurrency(item.costPrice || 0)}</td>
          <td><strong>${formatCurrency((item.costPrice || 0) * (item.stock || 0))}</strong></td>
          <td>${escapeHtml(item.category || '—')}</td>
          <td>${escapeHtml(item.supplier || '—')}</td>
          <td>${escapeHtml(item.topLocationName || '—')}</td>
        </tr>`).join('')}</tbody>
      </table>
    `, { subtitle: 'تقرير تفصيلي لكميات وقيمة البضاعة في المخازن', pageSize: 'A4' });
  };

  const printInventoryMovementsReport = async (locationId: string, detailed: boolean = false) => {
    const { inventoryApi } = await import('@/features/inventory/api/inventory.api');
    const allTransfers = await inventoryApi.listAllTransfers(locationId !== 'all' ? { locationId } : {});
    
    const transfers = allTransfers.filter(t => {
      if (!t.date) return false;
      if (t.status === 'cancelled') return false;
      const tTime = new Date(t.date).getTime();
      const fromTime = new Date(submittedRange.from).getTime();
      const toTime = new Date(submittedRange.to).getTime();
      return tTime >= fromTime && tTime <= toTime;
    });

    if (!transfers.length) {
      alert('لا توجد حركات في هذه الفترة المحددة.');
      return;
    }

    let locationName = 'كل المخازن والفروع';
    if (locationId !== 'all') {
      const match = transfers.find(t => String(t.fromLocationId) === locationId || String(t.toLocationId) === locationId || String(t.fromBranchId) === locationId || String(t.toBranchId) === locationId);
      if (match) {
        locationName = [String(match.fromLocationId), String(match.fromBranchId)].includes(locationId) 
          ? (match.fromLocationName || match.fromBranchName || 'مخزن') 
          : (match.toLocationName || match.toBranchName || 'مخزن');
      }
    }

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    const dateRangeText = `من ${new Date(submittedRange.from).toLocaleDateString('ar-EG', dateOptions)} الساعة 12:00 ص إلى ${new Date(submittedRange.to).toLocaleDateString('ar-EG', dateOptions)} الساعة 11:59 م`;

    printHtmlDocument(detailed ? `تقرير حركات وعمليات المخزن (تفصيلي) ${shortDateRange}` : `تقرير حركات وعمليات المخزن (ملخص) ${shortDateRange}`, `
      <div class="meta-grid">
        <div class="meta-box"><strong>إجمالي الحركات</strong><span>${transfers.length}</span></div>
        <div class="meta-box"><strong>الكمية المحولة</strong><span>${integerFormatter(transfers.reduce((sum, t) => sum + (t.items?.reduce((a, i) => a + (i.qty || 0), 0) || 0), 0))}</span></div>
      </div>
      <table>
        <thead><tr><th>رقم المستند</th><th>من</th><th>إلى</th><th>الحالة</th><th>التاريخ</th><th>المُسلّم</th><th>المستلم / السائق</th><th>الكمية الإجمالية</th></tr></thead>
        <tbody>${transfers.map((t) => {
          const fromLocation = escapeHtml(t.fromLocationName || t.fromBranchName || '—');
          const toLocation = escapeHtml(t.toLocationName || t.toBranchName || '—');
          const dispatcher = escapeHtml(t.createdBy || 'النظام');
          const receiver = escapeHtml(t.recipientName || '—');
          const totalQty = integerFormatter(t.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0);
          
          let rowHtml = `<tr>
            <td><strong>${escapeHtml(t.docNo)}</strong></td>
            <td>${fromLocation}</td>
            <td>${toLocation}</td>
            <td>${t.status === 'received' ? 'مستلم' : t.status === 'sent' ? 'مرسل' : 'ملغي'}</td>
            <td>${new Date(t.date).toLocaleString('ar-EG')}</td>
            <td>${dispatcher}</td>
            <td>${receiver}</td>
            <td><strong>${totalQty}</strong></td>
          </tr>`;

          if (detailed && t.items && t.items.length > 0) {
             const itemsDetails = t.items.map(item => `
               <div style="display: inline-block; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 0.85em; border: 1px solid #e2e8f0;">
                 ${escapeHtml(item.productName)} <strong style="color: #0284c7; padding-right: 4px;">(${item.qty})</strong>
               </div>
             `).join('');
             rowHtml += `<tr><td colspan="8" style="padding: 8px 16px; border-bottom: 2px solid #cbd5e1; background: #f8fafc;">
               <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.85em; color: #475569;">تفاصيل الأصناف:</div>
               ${itemsDetails}
             </td></tr>`;
          }
          return rowHtml;
        }).join('')}</tbody>
      </table>
    `, { 
      subtitle: detailed ? 'تقرير تفصيلي لعمليات الصرف والاستلام مضافاً إليه بنود التحويل' : 'تقرير ملخص لعمليات الصرف والاستلام بين المخازن', 
      headerDetailsHtml: `<strong>الموقع:</strong> ${escapeHtml(locationName)} &nbsp; | &nbsp; <strong>${escapeHtml(dateRangeText)}</strong>`,
      pageSize: 'A4', 
      layout: 'centered',
      footerHtml: `<div>${escapeHtml(dateRangeText)} | ${escapeHtml(locationName)}</div>` 
    });
  };

  const printCustomerBalances = async () => {
    const rows = await reportsApi.listAllCustomerBalances({ search: balancesSearch, filter: balancesFilter });
    if (!rows.length) return;
    printHtmlDocument(`العملاء الأعلى رصيدًا ${todayDate}`, `
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
    exportCustomerBalances,
    printCustomerBalances,
    printInventoryValueReport,
    printInventoryMovementsReport,
  };
}
