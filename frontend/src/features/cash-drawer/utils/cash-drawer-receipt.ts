import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CashierShift } from '@/types/domain';

function getDurationStr(from?: string, to?: string): string {
  if (!from) return '—';
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return '—';
  const totalMinutes = Math.floor((end - start) / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} دقيقة`;
  return `${hours} ساعة و ${minutes} دقيقة`;
}

function formatVarianceText(amount: number): string {
  if (Math.abs(amount) < 0.01) return `${formatCurrency(0)} (مطابق)`;
  if (amount < 0) return `${formatCurrency(amount)} (عجز)`;
  return `+${formatCurrency(amount)} (زيادة)`;
}

export function printCashDrawerShiftReceipt(shift: CashierShift, storeName?: string): void {
  const movementItems = shift.movementItems || [];
  const manualCashInItems = movementItems.filter((i) => i.kind === 'cash_in');
  const cashOutItems = movementItems.filter((i) => i.kind === 'cash_out');
  const expenseItems = movementItems.filter((i) => i.kind === 'expense');
  const supplierItems = movementItems.filter((i) => i.kind === 'supplier_payment');
  const returnItems = movementItems.filter((i) => (i.kind as string) === 'return' || (i.kind as string) === 'sale_return');

  const shiftSalesTotal = Number(shift.shiftSalesTotal || 0);
  const freelanceFee = Number(shift.freelanceDeliveryFeeTotal || 0);
  const netStoreSales = Number(shift.netStoreSalesTotal || Math.max(0, shiftSalesTotal - freelanceFee));

  // Calculations
  const rawCashSales = Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0);
  const expectedCard = Number(shift.cardSalesTotal || 0) + Number(shift.serviceCardTotal || 0) - Number(shift.saleReturnCardRefundTotal || 0);
  const expectedWallet = Number(shift.walletSalesTotal || 0);
  const expectedInstapay = Number(shift.instapaySalesTotal || 0);
  const expectedCredit = Number(shift.creditSalesTotal || 0);
  const expectedDelivery = Number(shift.deliverySalesTotal || 0);

  const declaredCash = Number(shift.declaredCash ?? shift.countedCash ?? 0);
  const declaredCard = Number(shift.declaredCardTotal || 0);
  const declaredWallet = Number(shift.declaredWalletTotal || 0);
  const declaredInstapay = Number(shift.declaredInstapayTotal || 0);

  const totalOutflows =
    Number(shift.cashDrawerCashOutTotal || 0) +
    Number(shift.expensesTotal || 0) +
    Number(shift.supplierPaymentsTotal || 0) +
    Number(shift.saleReturnCashRefundTotal || 0);

  const totalInflows = Number(shift.cashDrawerManualCashInTotal || (Number(shift.cashDrawerDeliveryCashInTotal || 0) === 0 ? shift.cashDrawerCashInTotal : 0) || 0);
  const openingCash = Number(shift.openingCash || 0);

  const dynamicExpectedCash = openingCash + rawCashSales + totalInflows - totalOutflows;
  const drawerVariance = (shift.declaredCash ?? shift.countedCash) != null
    ? declaredCash - dynamicExpectedCash
    : Number(shift.variance || 0);

  const cardDiff = declaredCard - expectedCard;
  const walletDiff = declaredWallet - expectedWallet;
  const instapayDiff = declaredInstapay - expectedInstapay;
  const electronicDiff = cardDiff + walletDiff + instapayDiff;
  const totalShiftDiscrepancy = drawerVariance + electronicDiff;

  const declaredTotalSales = declaredCash + declaredCard + declaredWallet + declaredInstapay;

  const cleanNote = (n: string) => escapeHtml(n.replace(/^وردية\s*#?[A-Z0-9_-]+:\s*/i, '').trim() || n);

  const cleanCloseNote = shift.closeNote && !shift.closeNote.startsWith('BLIND_CLOSE:')
    ? shift.closeNote
    : (!shift.closeNoteRaw?.startsWith('BLIND_CLOSE:') && shift.closeNoteRaw ? shift.closeNoteRaw : '');

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10.5px; line-height: 1.35; color: #000; direction: rtl; text-align: right; width: 100%;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
        <h2 style="margin: 0 0 2px; font-size: 15px; font-weight: 800;">${escapeHtml(storeName || 'إغلاق وردية الكاشير')}</h2>
        <div style="font-size: 11px; font-weight: 700;">تقرير تسوية وجرد الوردية الشامل</div>
      </div>

      <!-- Shift Meta -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 6px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 11px;">
          <span>الوردية: <strong>#${escapeHtml(String(shift.id || shift.docNo || ''))}</strong> (${escapeHtml(shift.openedByName || 'كاشير')})</span>
          <span>${escapeHtml([shift.branchName, shift.locationName].filter(Boolean).join(' - ') || 'الفرع الرئيسي')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #222; margin-top: 2px;">
          <span>وقت الفتح: ${escapeHtml(shift.createdAt ? formatDate(shift.createdAt) : '—')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #222; margin-top: 1px;">
          <span>وقت الإغلاق: ${escapeHtml(shift.closedAt ? formatDate(shift.closedAt) : 'مفتوحة حالياً')}</span>
          <span>(المدة: <strong>${getDurationStr(shift.createdAt, shift.closedAt)}</strong>)</span>
        </div>
        ${shift.closedByName && shift.closedByName !== shift.openedByName ? `
        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #000; margin-top: 2px;">
          <span>أُغلقت إدارياً بواسطة:</span>
          <strong>${escapeHtml(shift.closedByName)}</strong>
        </div>` : ''}
      </div>

      <!-- Section 1: Sales & Payment Channels Comparison Table -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 4px; background: #eee; padding: 2px 4px; display: flex; justify-content: space-between;">
          <span>[1] مطابقة المبيعات وقنوات التحصيل</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 2px;">
          <thead>
            <tr style="border-bottom: 1px solid #000; font-weight: 800; background: #f8fafc;">
              <th style="text-align: right; padding: 2px 1px;">القناة</th>
              <th style="text-align: center; padding: 2px 1px;">النظام</th>
              <th style="text-align: center; padding: 2px 1px;">الإقرار</th>
              <th style="text-align: center; padding: 2px 1px;">الفرق</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding: 3px 1px;"><strong>كاش (نقدي)</strong></td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(rawCashSales)}</td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(declaredCash)}</td>
              <td style="text-align: center; padding: 3px 1px; font-weight: 700;">${drawerVariance === 0 ? 'مطابق' : formatCurrency(drawerVariance)}</td>
            </tr>
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding: 3px 1px;"><strong>بطاقات (فيزا)</strong></td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(expectedCard)}</td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(declaredCard)}</td>
              <td style="text-align: center; padding: 3px 1px; font-weight: 700;">${cardDiff === 0 ? 'مطابق' : formatCurrency(cardDiff)}</td>
            </tr>
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding: 3px 1px;"><strong>محافظ إلكترونية</strong></td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(expectedWallet)}</td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(declaredWallet)}</td>
              <td style="text-align: center; padding: 3px 1px; font-weight: 700;">${walletDiff === 0 ? 'مطابق' : formatCurrency(walletDiff)}</td>
            </tr>
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding: 3px 1px;"><strong>تحويل إنستاباي</strong></td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(expectedInstapay)}</td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(declaredInstapay)}</td>
              <td style="text-align: center; padding: 3px 1px; font-weight: 700;">${instapayDiff === 0 ? 'مطابق' : formatCurrency(instapayDiff)}</td>
            </tr>
            ${expectedCredit > 0 ? `
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding: 3px 1px;"><strong>آجل (ذمم عملاء)</strong></td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(expectedCredit)}</td>
              <td style="text-align: center; padding: 3px 1px; color: #555;">ذمة عميل</td>
              <td style="text-align: center; padding: 3px 1px; color: #888;">—</td>
            </tr>` : ''}
            ${expectedDelivery > 0 ? `
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding: 3px 1px;"><strong>دليفري (مناديب)</strong></td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(expectedDelivery)}</td>
              <td style="text-align: center; padding: 3px 1px; color: #555;">مع المندوب</td>
              <td style="text-align: center; padding: 3px 1px; color: #888;">—</td>
            </tr>` : ''}
            <tr style="border-top: 1.5px solid #000; font-weight: 800; background: #f1f5f9;">
              <td style="padding: 3px 1px;">إجمالي الفواتير</td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(shiftSalesTotal)}</td>
              <td style="text-align: center; padding: 3px 1px;">${formatCurrency(declaredTotalSales)}</td>
              <td style="text-align: center; padding: 3px 1px; font-weight: 800;">${totalShiftDiscrepancy === 0 ? 'مطابق' : formatCurrency(totalShiftDiscrepancy)}</td>
            </tr>
          </tbody>
        </table>

        ${freelanceFee > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 3px;">
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
        <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [2] حركات ومنصرفات نقدية الدرج
        </div>

        ${manualCashInItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 2px;">+ إيداع نقدي بالدرج (يدوياً):</div>
        ${manualCashInItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 9.5px;">
            <span>${cleanNote(item.note)}</span>
            <strong>+${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${cashOutItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 2px;">- مسحوبات نقدية من الدرج:</div>
        ${cashOutItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 9.5px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${expenseItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 2px;">- مصروفات تشغيلية ونثرية:</div>
        ${expenseItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 9.5px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${supplierItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 2px;">- سداد دفعات موردين:</div>
        ${supplierItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 9.5px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        ${returnItems.length > 0 ? `
        <div style="font-weight: 700; margin-top: 2px;">- مرتجع مبيعات نقدي (كاش):</div>
        ${returnItems.map((item) => `
          <div style="display: flex; justify-content: space-between; padding-right: 6px; font-size: 9.5px;">
            <span>${cleanNote(item.note)}</span>
            <strong>-${formatCurrency(item.amount)}</strong>
          </div>
        `).join('')}` : ''}

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 800;">
          <span>إجمالي المنصرف من الدرج:</span>
          <span>-${formatCurrency(totalOutflows)}</span>
        </div>
      </div>

      <!-- Section 3: Cash Reconciliation Formula -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 4px; background: #eee; padding: 2px 4px;">
          [3] جرد ومطابقة نقدية الدرج (الكاش)
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>رصيد الافتتاح (العهدة):</span>
          <strong>${formatCurrency(openingCash)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>(+) مبيعات نقدية (كاش):</span>
          <strong>+${formatCurrency(rawCashSales)}</strong>
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

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 800;">
          <span>صافي النقدية المتوقعة بالدرج:</span>
          <span>${formatCurrency(dynamicExpectedCash)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800;">
          <span>النقدية الفعلية المعدودة (إقرار):</span>
          <span>${formatCurrency(declaredCash)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; border-top: 1px dashed #000; padding-top: 2px; margin-top: 2px;">
          <span>فارق نقدية الدرج:</span>
          <span>${formatVarianceText(drawerVariance)}</span>
        </div>
      </div>

      <!-- Section 4: Executive Decision & Final Summary -->
      <div style="border: 1.5px solid #000; border-radius: 4px; padding: 6px; margin-bottom: 6px; background: #fafafa;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; text-align: center; border-bottom: 1px solid #000; padding-bottom: 2px;">
          [4] الخلاصة والقرار التنفيذي للوردية
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>النقدية الموردة للخزينة:</span>
          <strong>${formatCurrency(declaredCash)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>فارق نقدية الدرج:</span>
          <strong>${formatVarianceText(drawerVariance)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>فارق المدفوعات الإلكترونية:</span>
          <strong>${formatVarianceText(electronicDiff)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 11.5px; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>إجمالي الفارق النهائي للوردية:</span>
          <span>${formatVarianceText(totalShiftDiscrepancy)}</span>
        </div>
      </div>

      <!-- Section 5: Notes & Audit -->
      ${shift.openingNote || cleanCloseNote || shift.managerReviewNote ? `
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 9.5px;">
        ${shift.openingNote ? `<div><strong>ملاحظة الافتتاح:</strong> ${escapeHtml(shift.openingNote)}</div>` : ''}
        ${cleanCloseNote ? `<div><strong>ملاحظة الإغلاق:</strong> ${escapeHtml(cleanCloseNote)}</div>` : ''}
        ${shift.managerReviewNote ? `<div><strong>ملاحظة اعتماد المدير:</strong> ${escapeHtml(shift.managerReviewNote)}</div>` : ''}
      </div>` : ''}

      <!-- Section 6: Signatures Footer -->
      <div style="padding-top: 8px; margin-top: 4px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 14px;">
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

