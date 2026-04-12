import { printPosDraftPreview } from '@/lib/pos-printing';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { usePosWorkspace } from '@/features/pos/hooks/usePosWorkspace';

export type PosWorkspaceState = ReturnType<typeof usePosWorkspace>;

export const POS_SHORTCUTS = [
  { key: 'F2', label: 'تركيز البحث' },
  { key: 'F3', label: 'قارئ الباركود' },
  { key: 'F4', label: 'تعليق الفاتورة' },
  { key: 'F6', label: 'إعادة طباعة آخر فاتورة' },
  { key: 'F8', label: 'معاينة الطباعة' },
  { key: 'F9', label: 'إتمام البيع / ريسيت' },
  { key: 'F12', label: 'طباعة A4' },
  { key: 'Esc', label: 'تفريغ السلة' },
] as const;

export function getSelectedCustomerName(pos: PosWorkspaceState) {
  return (pos.customersQuery.data || []).find((customer) => String(customer.id) === String(pos.customerId))?.name || 'عميل نقدي';
}

export function getStartupIssues(pos: PosWorkspaceState) {
  return [
    !pos.hasOperationalSetup ? 'أكمل تعريف المتجر ونقطة التشغيل من الإعدادات قبل استخدام شاشة الكاشير.' : '',
    !pos.hasCatalogReady ? 'أضف صنفًا واحدًا على الأقل قبل بدء البيع.' : '',
    pos.requiresCashierShift && !pos.ownOpenShift ? 'لا توجد وردية مفتوحة لهذا المستخدم. افتح وردية من شاشة الخزنة ثم ارجع للكاشير.' : '',
  ].filter(Boolean);
}

export function getWorkflowSteps(pos: PosWorkspaceState) {
  return [
    { key: 'pick', title: '1. اختر الأصناف', hint: pos.cart.length ? `${pos.cart.length} عنصر داخل السلة` : 'ابدأ بالبحث أو الباركود' },
    { key: 'review', title: '2. راجع الدفع', hint: pos.paymentType === 'credit' ? 'تحقق من العميل والمديونية' : `المتبقي الآن ${pos.amountDue > 0 ? 'غير مكتمل' : 'مكتمل'}` },
    { key: 'submit', title: '3. أكد الفاتورة', hint: pos.canShowLastSaleActions ? 'بعد الحفظ: F9 ريسيت و F12 A4' : pos.canSubmitSale ? 'جاهزة للإتمام بـ F9' : pos.canSubmitHint || 'أكمل المطلوب أولًا' },
  ];
}

export function getNextStepLabel(pos: PosWorkspaceState) {
  return pos.canSubmitSale
    ? 'كل شيء جاهز. راجع السلة ثم أكد البيع مباشرة.'
    : pos.canSubmitHint || 'ابدأ بإضافة صنف واحد على الأقل إلى السلة.';
}

export function printCurrentPosDraft(pos: PosWorkspaceState, customerName: string) {
  if (!pos.cart.length) return;
  printPosDraftPreview({
    title: 'معاينة فاتورة الكاشير',
    customerName,
    paymentLabel: pos.paymentType === 'credit' ? 'آجل' : pos.paymentChannel === 'mixed' ? 'مختلط' : pos.paymentChannel === 'card' ? 'شبكة' : 'نقدي',
    branchName: SINGLE_STORE_MODE ? 'المتجر الرئيسي' : (pos.currentBranch?.name || 'الرئيسي'),
    locationName: pos.currentLocation?.name || 'المخزن الأساسي',
    items: pos.cart,
    subtotal: pos.totals.subTotal,
    discount: pos.totals.discountValue,
    taxAmount: pos.totals.taxAmount,
    total: pos.totals.total,
    note: pos.note,
    pageSize: pos.settingsQuery.data?.paperSize === 'receipt' ? 'receipt' : 'a4',
    settings: pos.settingsQuery.data || null,
  });
}
