import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Purchase } from '@/types/domain';

export type PurchasesViewFilter = 'all' | 'cash' | 'credit' | 'cancelled';

export function getPurchasesViewFilterLabel(filter: PurchasesViewFilter) {
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

export function printPurchaseDocument(purchase: Purchase) {
  const itemsRows = (purchase.items || []).map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.unitName || '—')}</td><td>${item.qty}</td><td>${formatCurrency(item.cost)}</td><td>${formatCurrency(item.total)}</td></tr>`).join('');
  printHtmlDocument(`فاتورة شراء ${purchase.docNo || purchase.id}`, `
    <div class="meta-grid">
      <div class="meta-box"><strong>المورد</strong><span>${escapeHtml(purchase.supplierName || '—')}</span></div>
      <div class="meta-box"><strong>التاريخ</strong><span>${escapeHtml(formatDate(purchase.date))}</span></div>
      <div class="meta-box"><strong>الحالة</strong><span>${escapeHtml(purchase.status || 'posted')}</span></div>
    </div>
    <table>
      <thead><tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>التكلفة</th><th>الإجمالي</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="totals">
      <div><strong>الإجمالي:</strong> ${formatCurrency(purchase.total)}</div>
      <div><strong>نوع الدفع:</strong> ${escapeHtml(purchase.paymentType || 'cash')}</div>
      ${SINGLE_STORE_MODE ? `<div><strong>المخزن:</strong> ${escapeHtml(purchase.locationName || 'المخزن الأساسي')}</div>` : `<div><strong>الفرع:</strong> ${escapeHtml(purchase.branchName || '—')}</div><div><strong>الموقع:</strong> ${escapeHtml(purchase.locationName || '—')}</div>`}
      <div><strong>ملاحظات:</strong> ${escapeHtml(purchase.note || '—')}</div>
    </div>
  `, {
    subtitle: 'نسخة موحدة لطباعة فاتورة الشراء',
    pageSize: 'A4',
  });
}

export function getPurchasesNextStep(params: {
  selectedPurchase?: Purchase | null;
  canEditInvoices: boolean;
  totalItems: number;
}) {
  const { selectedPurchase, canEditInvoices, totalItems } = params;
  if (selectedPurchase) {
    if (selectedPurchase.status === 'cancelled') return 'الفاتورة ملغاة. راجع التفاصيل أو اطبع فقط.';
    return canEditInvoices
      ? 'يمكنك تعديل الفاتورة أو إلغاؤها أو طباعتها من لوحة التفاصيل.'
      : 'الفاتورة محددة. راجع التفاصيل أو اطبعها من اللوحة اليمنى.';
  }
  return totalItems
    ? 'اختر فاتورة من السجل حتى تظهر التفاصيل والإجراءات.'
    : 'ابدأ بإنشاء فاتورة شراء جديدة أو أضف موردًا سريعًا من نفس الشاشة.';
}

export function buildPurchasesScopeRows(params: {
  activeFilterLabel: string;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  search: string;
  selectedPurchase?: Purchase | null;
  totalAmount: number;
}) {
  const { activeFilterLabel, totalItems, rangeStart, rangeEnd, search, selectedPurchase, totalAmount } = params;
  return [
    { label: 'النطاق الحالي', value: activeFilterLabel },
    { label: 'عدد الفواتير المطابقة', value: `${totalItems}` },
    { label: 'المعروض الآن', value: `${rangeStart}-${rangeEnd}` },
    { label: 'نص البحث', value: search.trim() || 'بدون بحث' },
    { label: 'الفاتورة المحددة', value: selectedPurchase ? (selectedPurchase.docNo || selectedPurchase.id) : 'لا يوجد' },
    { label: 'المورد المحدد', value: selectedPurchase?.supplierName || '—' },
    { label: 'إجمالي النطاق', value: formatCurrency(totalAmount || 0) },
  ];
}

export function buildPurchasesGuidanceCards(params: {
  activeFilterLabel: string;
  purchasesNextStep: string;
  selectedPurchase?: Purchase | null;
  search: string;
  topSuppliers: Array<{ name: string }>;
}) {
  const { activeFilterLabel, purchasesNextStep, selectedPurchase, search, topSuppliers } = params;
  return [
    { key: 'scope', label: 'ما الذي تراجعه الآن؟', value: activeFilterLabel },
    { key: 'next', label: 'الخطوة الأنسب الآن', value: purchasesNextStep },
    { key: 'focus', label: 'التركيز الحالي', value: selectedPurchase ? `فاتورة ${selectedPurchase.docNo || selectedPurchase.id}` : (search.trim() || 'سجل المشتريات بالكامل') },
    { key: 'supplier', label: 'المورد في الواجهة', value: selectedPurchase?.supplierName || (topSuppliers[0]?.name ? `الأعلى الآن: ${topSuppliers[0].name}` : 'لا يوجد مورد محدد بعد') },
  ];
}

export function getPurchaseCancelDescription(purchase?: Purchase | null) {
  if (!purchase) return '';
  return `سيتم إلغاء الفاتورة ${purchase.docNo || purchase.id}. سيتم عكس أثرها على المخزون والحسابات، ويُمنع الإلغاء إذا وُجدت مرتجعات أو كان العكس سيؤدي إلى مخزون سالب.`;
}
