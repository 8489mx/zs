import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Sale } from '@/types/domain';

function paymentLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cash') return 'نقدي';
  if (normalized === 'card') return 'بطاقة';
  if (normalized === 'credit') return 'آجل';
  if (normalized === 'mixed') return 'مختلط';
  return value || 'نقدي';
}

export function printPosDraftPreview(options: {
  title?: string;
  customerName?: string;
  paymentLabel?: string;
  branchName?: string;
  locationName?: string;
  items: PosItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  note?: string;
  pageSize?: 'a4' | 'receipt';
}) {
  const rows = (options.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.name || '—')}</td>
      <td>${escapeHtml(item.unitName || 'قطعة')}</td>
      <td>${Number(item.qty || 0)}</td>
      <td>${formatCurrency(Number(item.price || 0))}</td>
      <td>${formatCurrency(Number(item.qty || 0) * Number(item.price || 0))}</td>
    </tr>
  `).join('');
  printHtmlDocument(options.title || (options.pageSize === 'receipt' ? 'معاينة إيصال البيع' : 'معاينة فاتورة الكاشير'), `
    <div class="summary-grid">
      <div class="summary-box"><strong>العميل</strong>${escapeHtml(options.customerName || 'عميل نقدي')}</div>
      <div class="summary-box"><strong>نقطة التشغيل</strong>${escapeHtml(options.branchName || 'المتجر الرئيسي')} / ${escapeHtml(options.locationName || 'المخزن الأساسي')}</div>
      <div class="summary-box"><strong>الدفع</strong>${escapeHtml(paymentLabel(options.paymentLabel))}</div>
    </div>
    <table>
      <thead><tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">لا توجد أصناف</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <div>الإجمالي قبل الضريبة: ${formatCurrency(Number(options.subtotal || 0))}</div>
      <div>الخصم: ${formatCurrency(Number(options.discount || 0))}</div>
      <div>الضريبة: ${formatCurrency(Number(options.taxAmount || 0))}</div>
      <div><strong>الإجمالي النهائي: ${formatCurrency(Number(options.total || 0))}</strong></div>
      <div>عدد البنود: ${Number(options.items?.length || 0)}</div>
      <div>ملاحظة: ${escapeHtml(options.note || '—')}</div>
    </div>
  `, { subtitle: '', pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4' });
}

export function printPostedSaleReceipt(sale: Sale, options: { pageSize?: 'a4' | 'receipt' } = {}) {
  const body = (sale.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.name || '—')}</td>
      <td>${escapeHtml(item.unitName || 'قطعة')}</td>
      <td>${Number(item.qty || 0)}</td>
      <td>${formatCurrency(Number(item.price || 0))}</td>
      <td>${formatCurrency(Number(item.total || 0))}</td>
    </tr>
  `).join('');
  printHtmlDocument(`${options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة'} ${sale.docNo || sale.id}`, `
    <div class="summary-grid">
      <div class="summary-box"><strong>العميل</strong>${escapeHtml(sale.customerName || 'عميل نقدي')}</div>
      <div class="summary-box"><strong>التاريخ</strong>${escapeHtml(sale.date || '—')}</div>
      <div class="summary-box"><strong>نقطة التشغيل</strong>${escapeHtml(sale.branchName || 'المتجر الرئيسي')} / ${escapeHtml(sale.locationName || 'المخزن الأساسي')}</div>
      <div class="summary-box"><strong>الدفع</strong>${escapeHtml(paymentLabel(sale.paymentChannel || sale.paymentType))}</div>
    </div>
    <table>
      <thead><tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${body || '<tr><td colspan="5">لا توجد أصناف</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <div>الإجمالي قبل الضريبة: ${formatCurrency(Number(sale.subTotal || 0))}</div>
      <div>الخصم: ${formatCurrency(Number(sale.discount || 0))}</div>
      <div>الضريبة: ${formatCurrency(Number(sale.taxAmount || 0))}</div>
      <div><strong>الإجمالي النهائي: ${formatCurrency(Number(sale.total || 0))}</strong></div>
      <div>المدفوع: ${formatCurrency(Number(sale.paidAmount || 0))}</div>
      <div>المتبقي: ${formatCurrency(Math.max(0, Number(sale.total || 0) - Number(sale.paidAmount || 0)))}</div>
      <div>ملاحظات: ${escapeHtml(sale.note || '—')}</div>
    </div>
  `, { subtitle: '', pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4' });
}
