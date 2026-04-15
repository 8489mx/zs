import { printPostedSaleReceipt } from '@/lib/pos-printing';
import { formatCurrency } from '@/lib/format';
import type { AppSettings, Sale } from '@/types/domain';

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

export function printSaleDocument(
  sale: Sale,
  settings?: Partial<AppSettings> | null,
  pageSize: 'a4' | 'receipt' = 'receipt',
) {
  printPostedSaleReceipt(sale, { pageSize, settings });
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
