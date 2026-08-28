import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CashierShift } from '@/types/domain';

export function printCashDrawerShiftReceipt(shift: CashierShift, storeName?: string): void {
  const movementItems = shift.movementItems || [];
  const manualCashInItems = movementItems.filter((i) => i.kind === 'cash_in');
  const cashOutItems = movementItems.filter((i) => i.kind === 'cash_out');
  const expenseItems = movementItems.filter((i) => i.kind === 'expense');
  const supplierItems = movementItems.filter((i) => i.kind === 'supplier_payment');
  const returnItems = movementItems.filter((i) => i.kind === 'return');

  const shiftSalesTotal = Number(shift.shiftSalesTotal || 0);
  const freelanceFee = Number(shift.freelanceDeliveryFeeTotal || 0);
  const netStoreSales = Number(shift.netStoreSalesTotal || Math.max(0, shiftSalesTotal - freelanceFee));

  const totalOutflows =
    Number(shift.cashDrawerCashOutTotal || 0) +
    Number(shift.expensesTotal || 0) +
    Number(shift.supplierPaymentsTotal || 0) +
    Number(shift.saleReturnCashRefundTotal || 0);

  const totalInflows = Number(shift.cashDrawerManualCashInTotal || (Number(shift.cashDrawerDeliveryCashInTotal || 0) === 0 ? shift.cashDrawerCashInTotal : 0) || 0);

  const cleanNote = (n: string) => escapeHtml(n.replace(/^وردية\s*#?[A-Z0-9_-]+:\s*/i, '').trim() || n);

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10.5px; line-height: 1.35; color: #000; direction: rtl; text-align: right; width: 100%;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <h2 style="margin: 0 0 2px; font-size: 15px; font-weight: 800;">${escapeHtml(storeName || 'إغلاق وردية الكاشير')}</h2>
        <div style="font-size: 11px; font-weight: 700;">تقرير تسوية وجرد الوردية</div>
      </div>

      <!-- Shift Meta -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 11px;">
          <span>الوردية: <strong>#${escapeHtml(String(shift.id || ''))}</strong> (${escapeHtml(shift.openedByName || 'كاشير')})</span>
          <span>${escapeHtml([shift.branchName, shift.locationName].filter(Boolean).join(' - ') || 'الفرع الرئيسي')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #333; margin-top: 2px;">
          <span>وقت الفتح: ${escapeHtml(shift.createdAt ? formatDate(shift.createdAt) : '—')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #333; margin-top: 1px;">
          <span>وقت الإغلاق: ${escapeHtml(shift.closedAt ? formatDate(shift.closedAt) : 'مفتوحة حالياً')}</span>
        </div>
        ${shift.closedByName && shift.closedByName !== shift.openedByName ? `
        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #000; margin-top: 2px;">
          <span>أُغلقت إدارياً بواسطة:</span>
          <strong>${escapeHtml(shift.closedByName)}</strong>
        </div>` : ''}
      </div>

      <!-- Section 1: Sales & Payment Channels -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [1] المبيعات وطرق الدفع
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات نقدية (كاش):</span>
          <strong>${formatCurrency(shift.cashSalesTotal || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات بطاقات (فيزا):</span>
          <strong>${formatCurrency(shift.cardSalesTotal || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>محافظ إلكترونية:</span>
          <strong>${formatCurrency(shift.walletSalesTotal || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>تحويلات إنستاباي:</span>
          <strong>${formatCurrency(shift.instapaySalesTotal || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات آجلة (شكك / ذمم):</span>
          <strong>${formatCurrency(shift.creditSalesTotal || 0)}</strong>
        </div>
        ${Number(shift.deliverySalesTotal || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات دليفري (تحصيل مناديب):</span>
          <strong>${formatCurrency(shift.deliverySalesTotal || 0)}</strong>
        </div>` : ''}
        ${Number(shift.serviceTotal || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>خدمات وصيانة سريعة:</span>
          <strong>${formatCurrency(shift.serviceTotal || 0)}</strong>
        </div>` : ''}

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 800;">
          <span>إجمالي مبيعات الفواتير:</span>
          <span>${formatCurrency(shiftSalesTotal)}</span>
        </div>

        ${freelanceFee > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
          <span>(-) أجر الطيارين (رسوم توصيل):</span>
          <span>-${formatCurrency(freelanceFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; border-top: 1px dashed #000; padding-top: 2px; margin-top: 2px;">
          <span>صافي مبيعات المتجر:</span>
          <span>${formatCurrency(netStoreSales)}</span>
        </div>` : ''}
      </div>

      <!-- Section 2: Movements and Expenses Breakdown -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [2] حركات ومصروفات الدرج
        </div>

        ${manualCashInItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">+ إيداع نقدي بالدرج (يدوياً):</div>
        ${manualCashInItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${cleanNote(item.note)}</span>
            <strong>+${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${cashOutItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- مسحوبات نقدية من الدرج:</div>
        ${cashOutItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${expenseItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- مصروفات تشغيلية ونثرية:</div>
        ${expenseItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${supplierItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- سداد دفعات موردين:</div>
        ${supplierItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${returnItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- مرتجع مبيعات نقدي (كاش):</div>
        ${returnItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 4px; font-weight: 800;">
          <span>إجمالي الخارج من الدرج:</span>
          <span>-${formatCurrency(totalOutflows)}</span>
        </div>
      </div>

      <!-- Section 3: Cash Reconciliation -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [3] جرد ومطابقة نقدية الدرج
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>رصيد الافتتاح (العهدة):</span>
          <strong>${formatCurrency(shift.openingCash || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>(+) مبيعات نقدية (كاش):</span>
          <strong>+${formatCurrency(Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0))}</strong>
        </div>
        ${totalInflows > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>(+) إيداعات نقدية بالدرج:</span>
          <strong>+${formatCurrency(totalInflows)}</strong>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between;">
          <span>(-) إجمالي المنصرف من الدرج:</span>
          <strong>-${formatCurrency(totalOutflows)}</strong>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 800; font-size: 11.5px;">
          <span>صافي النقدية المتوقعة:</span>
          <span>${formatCurrency(Number(shift.openingCash || 0) + Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0) + totalInflows - totalOutflows)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 11.5px;">
          <span>النقدية الفعلية (المعدودة):</span>
          <span>${shift.countedCash == null ? '—' : formatCurrency(shift.countedCash)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; border-top: 1px dashed #000; padding-top: 2px; margin-top: 2px;">
          <span>الفارق النهائي (عجز / زيادة):</span>
          <span>${formatCurrency(shift.countedCash != null ? Number(shift.countedCash) - (Number(shift.openingCash || 0) + Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0) + totalInflows - totalOutflows) : (shift.variance || 0))}</span>
        </div>
      </div>

      <!-- Notes & Audit -->
      ${shift.openingNote || shift.closeNote || shift.managerReviewNote ? `
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
        ${shift.openingNote ? `<div><strong>ملاحظة الافتتاح:</strong> ${escapeHtml(shift.openingNote)}</div>` : ''}
        ${shift.closeNote ? `<div><strong>ملاحظة الإغلاق:</strong> ${escapeHtml(shift.closeNote)}</div>` : ''}
        ${shift.managerReviewNote ? `<div><strong>ملاحظة اعتماد المدير:</strong> ${escapeHtml(shift.managerReviewNote)}</div>` : ''}
      </div>` : ''}

      <!-- Signatures Footer -->
      <div style="padding-top: 12px; margin-top: 6px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <div>توقيع الكاشير: ........................</div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div>اعتماد الإدارة: ........................</div>
        </div>
      </div>
    </div>
  `;

  printHtmlDocument(`تقرير وردية ${shift.docNo || shift.id}`, html, {
    pageSize: 'receipt',
    layout: 'centered',
  });
}
