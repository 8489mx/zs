import { printPostedSaleReceipt } from '@/lib/pos-printing';
import { computeDraftTotal } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

function getSaleKey(params: PosWorkspaceActionParams) {
  return String(params.lastSale?.docNo || params.lastSale?.id || '');
}

export function createPosWorkspaceReceiptActions(params: PosWorkspaceActionParams) {
  function hasFreshLastSale() {
    return Boolean(params.lastSale && params.postSaleSaleKey && getSaleKey(params) === params.postSaleSaleKey);
  }

  function completePostSaleCycle(message = 'جاهز لعميل جديد. امسح الباركود التالي مباشرة.') {
    params.setPostSaleSaleKey('');
    params.setSubmitMessage(message);
    params.requestBarcodeFocus();
  }

  function printLastSaleAs(pageSize: 'receipt' | 'a4') {
    if (!params.lastSale) return false;
    printPostedSaleReceipt(params.lastSale, { pageSize, settings: params.settings || null });
    params.requestBarcodeFocus();
    return true;
  }

  function reprintLastSale() {
    if (!printLastSaleAs(params.settings?.paperSize === 'receipt' ? 'receipt' : 'a4')) {
      params.setSubmitMessage('لا توجد فاتورة أخيرة لإعادة طباعتها');
      params.requestBarcodeFocus();
    }
  }

  function reprintLastSaleReceipt() {
    if (!printLastSaleAs('receipt')) {
      reprintLastSale();
    }
  }

  function printReceiptNow() {
    if (!hasFreshLastSale() || !params.lastSale) return;
    printLastSaleAs('receipt');
    params.setSubmitMessage('تمت طباعة الريسيت.');
  }

  function printA4Now() {
    if (!hasFreshLastSale() || !params.lastSale) return;
    printLastSaleAs('a4');
    params.setSubmitMessage('تم فتح طباعة A4.');
  }

  function exportPdfNow() {
    if (!hasFreshLastSale() || !params.lastSale) return;
    const sale = params.lastSale;
    completePostSaleCycle('جارٍ تنزيل ملف PDF بحجم A4. جاهز لعميل جديد.');
    void import('@/lib/pos-printing/pdf')
      .then(({ exportPostedSalePdf }) => exportPostedSalePdf(sale, { settings: params.settings || null }))
      .catch(() => {
        params.setSubmitMessage('تعذر تنزيل PDF. حاول مرة أخرى.');
        params.requestBarcodeFocus();
      });
  }

  return {
    reprintLastSale,
    reprintLastSaleReceipt,
    printReceiptNow,
    printA4Now,
    exportPdfNow,
    completePostSaleCycle,
    heldDraftSummaries: params.heldDrafts.map((draft, index) => ({
      id: draft.id,
      label: `معلقة ${index + 1} - ${new Date(draft.savedAt).toLocaleString('ar-EG')}`,
      total: computeDraftTotal(draft),
      itemsCount: draft.cart.length,
      savedAt: draft.savedAt,
    })),
  };
}
