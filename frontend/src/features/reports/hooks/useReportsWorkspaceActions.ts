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
    const { inventoryApi } = await import('@/shared/api/inventory.api');
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
      <table style="border: 1px solid #e2e8f0; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
            <th style="border: 1px solid #e2e8f0; text-align: right;">رقم المستند</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">من</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">إلى</th>
            <th style="border: 1px solid #e2e8f0; text-align: center;">الحالة</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">التاريخ</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">المُسلّم</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">المستلم / السائق</th>
            <th style="border: 1px solid #e2e8f0; text-align: center;">الكمية الإجمالية</th>
          </tr>
        </thead>
        <tbody>${transfers.map((t) => {
          const fromLocation = escapeHtml(t.fromLocationName || t.fromBranchName || '—');
          const toLocation = escapeHtml(t.toLocationName || t.toBranchName || '—');
          const dispatcher = escapeHtml(t.createdBy || 'النظام');
          const receiver = escapeHtml(t.recipientName || '—');
          const totalQty = integerFormatter(t.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0);
          
          const statusColor = t.status === 'received' ? '#16a34a' : t.status === 'sent' ? '#ea580c' : '#dc2626';
          const statusText = t.status === 'received' ? 'مستلم' : t.status === 'sent' ? 'مرسل' : 'ملغي';
          
          let rowHtml = `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="border: 1px solid #e2e8f0;"><strong>${escapeHtml(t.docNo)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${fromLocation}</td>
            <td style="border: 1px solid #e2e8f0;">${toLocation}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center; color: ${statusColor}; font-weight: bold;">${statusText}</td>
            <td style="border: 1px solid #e2e8f0;">${new Date(t.date).toLocaleString('ar-EG')}</td>
            <td style="border: 1px solid #e2e8f0;">${dispatcher}</td>
            <td style="border: 1px solid #e2e8f0;">${receiver}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${totalQty}</td>
          </tr>`;

          if (detailed && t.items && t.items.length > 0) {
             const itemsDetails = t.items.map(item => `
               <div style="display: inline-flex; align-items: center; background: #fff; padding: 2px 8px; border-radius: 6px; margin: 2px; font-size: 0.9em; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                 ${escapeHtml(item.productName)} <strong style="color: #0369a1; padding-right: 6px; font-size: 1.05em; font-weight: 800;">(${item.qty})</strong>
               </div>
             `).join('');
             rowHtml += `<tr><td colspan="8" style="padding: 10px 16px; border-bottom: 2px solid #cbd5e1; background: #f8fafc; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
               <div style="font-weight: 800; margin-bottom: 6px; font-size: 0.9em; color: #475569; display: flex; align-items: center; gap: 4px;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                 تفاصيل الأصناف:
               </div>
               <div style="display: flex; flex-wrap: wrap; gap: 4px;">${itemsDetails}</div>
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

  const printSalesRegisterReport = async (detailed: boolean = false) => {
    const { salesApi } = await import('@/features/sales/api/sales.api');
    const { getSalePaymentLabel } = await import('@/features/sales/lib/sales-workspace.helpers');
    const allSales = await salesApi.listAll();
    
    const sales = allSales.rows.filter(s => {
      if (!s.date) return false;
      const sTime = new Date(s.date).getTime();
      const fromTime = new Date(submittedRange.from).getTime();
      const toTime = new Date(submittedRange.to).getTime();
      return sTime >= fromTime && sTime <= toTime;
    });

    if (!sales.length) {
      alert('لا توجد مبيعات في هذه الفترة المحددة.');
      return;
    }

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    const dateRangeText = `من ${new Date(submittedRange.from).toLocaleDateString('ar-EG', dateOptions)} الساعة 12:00 ص إلى ${new Date(submittedRange.to).toLocaleDateString('ar-EG', dateOptions)} الساعة 11:59 م`;
    const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    printHtmlDocument(detailed ? `سجل المبيعات (تفصيلي) ${shortDateRange}` : `سجل المبيعات (ملخص) ${shortDateRange}`, `
      <div class="meta-grid">
        <div class="meta-box"><strong>عدد الفواتير</strong><span>${sales.length}</span></div>
        <div class="meta-box"><strong>إجمالي المبيعات</strong><span>${formatCurrency(totalSalesAmount)}</span></div>
      </div>
      <table style="border: 1px solid #e2e8f0; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
            <th style="border: 1px solid #e2e8f0; text-align: right;">الفاتورة</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">العميل</th>
            <th style="border: 1px solid #e2e8f0; text-align: center;">الحالة</th>
            <th style="border: 1px solid #e2e8f0; text-align: center;">الدفع</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">الإجمالي</th>
            <th style="border: 1px solid #e2e8f0; text-align: right;">التاريخ</th>
          </tr>
        </thead>
        <tbody>${sales.map((sale) => {
          const statusColor = sale.status === 'completed' || sale.status === 'paid' ? '#16a34a' : sale.status === 'cancelled' || sale.status === 'refunded' ? '#dc2626' : '#ea580c';
          
          let rowHtml = `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="border: 1px solid #e2e8f0;"><strong>${escapeHtml(sale.docNo || sale.id)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${escapeHtml(sale.customerName || 'عميل نقدي')}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center; color: ${statusColor}; font-weight: bold;">${escapeHtml(sale.status || '')}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center;">${escapeHtml(getSalePaymentLabel(sale))}</td>
            <td style="border: 1px solid #e2e8f0;"><strong>${formatCurrency(sale.total || 0)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${escapeHtml(sale.date || '')}</td>
          </tr>`;

          if (detailed && sale.items && sale.items.length > 0) {
             const itemsDetails = sale.items.map(item => `
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
    `, { 
      subtitle: detailed ? 'سجل تفصيلي للفواتير شاملاً بيانات الأصناف المباعة' : 'سجل ملخص لعمليات البيع', 
      headerDetailsHtml: `<strong>النطاق:</strong> ${escapeHtml(dateRangeText)}`,
      pageSize: 'A4', 
      layout: 'centered',
      footerHtml: `<div>${escapeHtml(dateRangeText)}</div>` 
    });
  };

  const printPurchasesRegisterReport = async (detailed: boolean = false) => {
    const { purchasesApi } = await import('@/features/purchases/api/purchases.api');
    const allPurchases = await purchasesApi.listAll();
    
    const purchases = allPurchases.rows.filter(p => {
      if (!p.date) return false;
      const pTime = new Date(p.date).getTime();
      const fromTime = new Date(submittedRange.from).getTime();
      const toTime = new Date(submittedRange.to).getTime();
      return pTime >= fromTime && pTime <= toTime;
    });

    if (!purchases.length) {
      alert('لا توجد مشتريات في هذه الفترة المحددة.');
      return;
    }

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    const dateRangeText = `من ${new Date(submittedRange.from).toLocaleDateString('ar-EG', dateOptions)} الساعة 12:00 ص إلى ${new Date(submittedRange.to).toLocaleDateString('ar-EG', dateOptions)} الساعة 11:59 م`;
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (p.total || 0), 0);

    printHtmlDocument(detailed ? `سجل المشتريات (تفصيلي) ${shortDateRange}` : `سجل المشتريات (ملخص) ${shortDateRange}`, `
      <div class="meta-grid">
        <div class="meta-box"><strong>عدد الفواتير</strong><span>${purchases.length}</span></div>
        <div class="meta-box"><strong>إجمالي المشتريات</strong><span>${formatCurrency(totalPurchasesAmount)}</span></div>
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
        <tbody>${purchases.map((purchase) => {
          const statusColor = purchase.status === 'completed' || purchase.status === 'paid' ? '#16a34a' : purchase.status === 'cancelled' || purchase.status === 'refunded' ? '#dc2626' : '#ea580c';
          
          let rowHtml = `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="border: 1px solid #e2e8f0;"><strong>${escapeHtml(purchase.docNo || purchase.id)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${escapeHtml(purchase.supplierName || '—')}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center; color: ${statusColor}; font-weight: bold;">${escapeHtml(purchase.status || '')}</td>
            <td style="border: 1px solid #e2e8f0; text-align: center;">${escapeHtml(purchase.paymentType || '')}</td>
            <td style="border: 1px solid #e2e8f0;"><strong>${formatCurrency(purchase.total || 0)}</strong></td>
            <td style="border: 1px solid #e2e8f0;">${escapeHtml(purchase.date || '')}</td>
          </tr>`;

          if (detailed && purchase.items && purchase.items.length > 0) {
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
    `, { 
      subtitle: detailed ? 'سجل تفصيلي للفواتير شاملاً بيانات الأصناف' : 'سجل ملخص لعمليات الشراء', 
      headerDetailsHtml: `<strong>النطاق:</strong> ${escapeHtml(dateRangeText)}`,
      pageSize: 'A4', 
      layout: 'centered',
      footerHtml: `<div>${escapeHtml(dateRangeText)}</div>` 
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
    printSalesRegisterReport,
    printPurchasesRegisterReport,
  };
}
