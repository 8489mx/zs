import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CashierShift } from '@/types/domain';

export function printCashDrawerShiftReceipt(shift: CashierShift, storeName?: string): void {
  const movementItems = shift.movementItems || [];
  const deliveryItems = movementItems.filter((i) => i.kind === 'delivery');
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

  const totalInflows = Number(shift.cashDrawerCashInTotal || 0);

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; color: #000; direction: rtl; text-align: right; width: 100%;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <h2 style="margin: 0 0 4px; font-size: 15px; font-weight: 800;">${escapeHtml(storeName || 'إغلاق وردية الكاشير')}</h2>
        <div style="font-size: 11px; font-weight: 700;">تقرير تسوية وجرد الوردية</div>
        <div style="font-size: 12px; font-weight: 800; margin-top: 2px;">${escapeHtml(shift.docNo || `SHIFT-${shift.id}`)}</div>
      </div>

      <!-- Shift Meta -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10.5px;">
        <div style="display: flex; justify-content: space-between;">
          <span>الفرع / المخزن:</span>
          <strong>${escapeHtml([shift.branchName, shift.locationName].filter(Boolean).join(' - ') || 'الرئيسي')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>الكاشير:</span>
          <strong>${escapeHtml(shift.openedByName || '—')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>وقت الفتح:</span>
          <strong>${escapeHtml(shift.createdAt ? formatDate(shift.createdAt) : '—')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>وقت الإغلاق:</span>
          <strong>${escapeHtml(shift.closedAt ? formatDate(shift.closedAt) : 'مفتوحة حالياً')}</strong>
        </div>
        ${shift.closedByName ? `
        <div style="display: flex; justify-content: space-between;">
          <span>أغلقت بواسطة:</span>
          <strong>${escapeHtml(shift.closedByName)}</strong>
        </div>` : ''}
      </div>

      <!-- Section 1: Sales & Payment Channels -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [1] مبيعات وقنوات الدفع
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات نقدي (كاش):</span>
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
          <span>إنستاباي (InstaPay):</span>
          <strong>${formatCurrency(shift.instapaySalesTotal || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات آجلة (ذمم):</span>
          <strong>${formatCurrency(shift.creditSalesTotal || 0)}</strong>
        </div>
        ${Number(shift.deliverySalesTotal || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>مبيعات دليفري (تحصيل مناديب):</span>
          <strong>${formatCurrency(shift.deliverySalesTotal || 0)}</strong>
        </div>` : ''}
        ${Number(shift.serviceTotal || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>خدمات سريعة:</span>
          <strong>${formatCurrency(shift.serviceTotal || 0)}</strong>
        </div>` : ''}

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 800;">
          <span>إجمالي الفواتير:</span>
          <span>${formatCurrency(shiftSalesTotal)}</span>
        </div>

        ${freelanceFee > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
          <span>(-) رسوم طيارين (للمندوب):</span>
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
          [2] حركات ومنصرفات وتوريدات الدرج
        </div>

        ${deliveryItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">+ توريدات مناديب (دليفري):</div>
        ${deliveryItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${escapeHtml(item.note)}</span>
            <strong>+${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${manualCashInItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">+ إيداعات نقدية يدوية:</div>
        ${manualCashInItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${escapeHtml(item.note)}</span>
            <strong>+${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${cashOutItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- مسحوبات من الدرج:</div>
        ${cashOutItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${escapeHtml(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${expenseItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- مصروفات تشغيلية:</div>
        ${expenseItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${escapeHtml(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${supplierItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- سداد ودفعات موردين:</div>
        ${supplierItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${escapeHtml(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${returnItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 3px;">- مرتجعات مبيعات نقدية:</div>
        ${returnItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 10px;">
            <span>${escapeHtml(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 4px; font-weight: 800;">
          <span>إجمالي المنصرف من الدرج:</span>
          <span>-${formatCurrency(totalOutflows)}</span>
        </div>
      </div>

      <!-- Section 3: Cash Reconciliation -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [3] جرد الخزينة والنقدية
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>رصيد الفتح (العهدة):</span>
          <strong>${formatCurrency(shift.openingCash || 0)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>(+) مبيعات وخدمات كاش:</span>
          <strong>+${formatCurrency(Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0))}</strong>
        </div>
        ${totalInflows > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>(+) توريدات وإيداعات بالدرج:</span>
          <strong>+${formatCurrency(totalInflows)}</strong>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between;">
          <span>(-) خصومات ومنصرفات الدرج:</span>
          <strong>-${formatCurrency(totalOutflows)}</strong>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 800; font-size: 11.5px;">
          <span>صافي النقدية المتوقعة:</span>
          <span>${formatCurrency(shift.expectedCash || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 11.5px;">
          <span>النقدية الفعلية المعدودة:</span>
          <span>${shift.countedCash == null ? '—' : formatCurrency(shift.countedCash)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; border-top: 1px dashed #000; padding-top: 2px; margin-top: 2px;">
          <span>الفرق (عجز / زيادة):</span>
          <span>${formatCurrency(shift.variance || 0)}</span>
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
