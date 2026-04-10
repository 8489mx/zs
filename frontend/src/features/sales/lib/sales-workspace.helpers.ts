import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Sale } from '@/types/domain';

export type SalesViewFilter = 'all' | 'cash' | 'credit' | 'cancelled';

export function getSalesViewFilterLabel(filter: SalesViewFilter) {
  switch (filter) {
    case 'cash':
      return 'فواتير نقدية';
    case 'credit':
      return 'فواتير آجلة';
    case 'cancelled':
      return 'فواتير ملغاة';
    default:
      return 'كل الفواتير';
  }
}

export function getSalePaymentLabel(sale?: Sale | null) {
  if (!sale) return '—';
  if (sale.paymentType === 'credit') return 'آجل';
  if (sale.paymentChannel === 'mixed') return 'مختلط';
  if (sale.paymentChannel === 'card') return 'بطاقة';
  return 'نقدي';
}

export function printSaleDocument(sale: Sale) {
  const itemsRows = (sale.items || []).map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.unitName || '—')}</td><td>${item.qty}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.total)}</td></tr>`).join('');
  printHtmlDocument(`فاتورة بيع ${sale.docNo || sale.id}`, `
    <div class="meta-grid">
      <div class="meta-box"><strong>العميل</strong><span>${escapeHtml(sale.customerName || 'عميل نقدي')}</span></div>
      <div class="meta-box"><strong>التاريخ</strong><span>${escapeHtml(formatDate(sale.date))}</span></div>
      <div class="meta-box"><strong>الحالة</strong><span>${escapeHtml(sale.status === 'cancelled' ? 'ملغاة' : 'مثبتة')}</span></div>
      <div class="meta-box"><strong>الدفع</strong><span>${escapeHtml(getSalePaymentLabel(sale))}</span></div>
    </div>
    <table>
      <thead><tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="totals">
      <div><strong>الإجمالي:</strong> ${formatCurrency(sale.total)}</div>
      <div><strong>المدفوع:</strong> ${formatCurrency(sale.paidAmount || sale.total)}</div>
      <div><strong>المتبقي:</strong> ${formatCurrency(Math.max(0, Number(sale.total || 0) - Number(sale.paidAmount || sale.total || 0)))}</div>
      <div><strong>نوع الدفع:</strong> ${escapeHtml(getSalePaymentLabel(sale))}</div>
      <div><strong>ملاحظات:</strong> ${escapeHtml(sale.note || '—')}</div>
    </div>
  `, {
    subtitle: 'نسخة موحدة لطباعة فاتورة البيع',
    pageSize: 'A4',
  });
}

export function getSalesNextStep(params: {
  selectedSale?: Sale | null;
  canEditInvoices: boolean;
  totalItems: number;
}) {
  const { selectedSale, canEditInvoices, totalItems } = params;
  if (selectedSale) {
    if (selectedSale.status === 'cancelled') return 'الفاتورة ملغاة. استخدم الطباعة أو راجع السجل فقط.';
    return canEditInvoices
      ? 'يمكنك الآن تعديل الفاتورة أو إلغاؤها أو طباعتها من اللوحة اليمنى.'
      : 'الفاتورة محددة. راجع التفاصيل أو اطبعها من اللوحة اليمنى.';
  }
  return totalItems
    ? 'اختر فاتورة من الجدول حتى تظهر التفاصيل والإجراءات.'
    : 'ابدأ بتخفيف الفلاتر أو افتح الكاشير لإنشاء فاتورة جديدة.';
}

export function buildSalesScopeRows(params: {
  activeFilterLabel: string;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  search: string;
  selectedSale?: Sale | null;
  totalSales: number;
}) {
  const { activeFilterLabel, totalItems, rangeStart, rangeEnd, search, selectedSale, totalSales } = params;
  return [
    { label: 'النطاق الحالي', value: activeFilterLabel },
    { label: 'عدد الفواتير المطابقة', value: `${totalItems}` },
    { label: 'المعروض الآن', value: `${rangeStart}-${rangeEnd}` },
    { label: 'نص البحث', value: search.trim() || 'بدون بحث' },
    { label: 'الفاتورة المحددة', value: selectedSale ? (selectedSale.docNo || selectedSale.id) : 'لا يوجد' },
    { label: 'العميل المحدد', value: selectedSale?.customerName || '—' },
    { label: 'إجمالي النطاق', value: formatCurrency(totalSales || 0) },
  ];
}

export function buildSalesGuidanceCards(params: {
  activeFilterLabel: string;
  salesNextStep: string;
  selectedSale?: Sale | null;
  search: string;
}) {
  const { activeFilterLabel, salesNextStep, selectedSale, search } = params;
  return [
    { key: 'scope', label: 'ما الذي تراه الآن؟', value: activeFilterLabel },
    { key: 'selection', label: 'الإجراء الأنسب الآن', value: salesNextStep },
    { key: 'focus', label: 'التركيز الحالي', value: selectedSale ? `فاتورة ${selectedSale.docNo || selectedSale.id}` : (search.trim() || 'سجل الفواتير بالكامل') },
  ];
}

export function getSaleCancelDescription(sale?: Sale | null) {
  if (!sale) return '';
  return `سيتم إلغاء الفاتورة ${sale.docNo || sale.id} واسترجاع أثرها المحاسبي والمخزني. لا تنفذ هذه العملية بعد وجود مرتجعات أو تسويات لاحقة على العميل.`;
}
