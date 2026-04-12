import { exportPostedSalePdf, printPostedSaleReceipt } from '@/lib/pos-printing';
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

  function reprintLastSale() {
    if (!params.lastSale) return;
    printPostedSaleReceipt(params.lastSale, { pageSize: params.settings?.paperSize === 'receipt' ? 'receipt' : 'a4', settings: params.settings || null });
    params.requestBarcodeFocus();
  }

  function printReceiptNow() {
    if (!hasFreshLastSale() || !params.lastSale) return;
    printPostedSaleReceipt(params.lastSale, { pageSize: 'receipt', settings: params.settings || null });
    completePostSaleCycle('تمت طباعة الريسيت. جاهز لعميل جديد.');
  }

  function printA4Now() {
    if (!hasFreshLastSale() || !params.lastSale) return;
    printPostedSaleReceipt(params.lastSale, { pageSize: 'a4', settings: params.settings || null });
    completePostSaleCycle('تم فتح طباعة A4. جاهز لعميل جديد.');
  }

  function exportPdfNow() {
    if (!hasFreshLastSale() || !params.lastSale) return;
    const sale = params.lastSale;
    completePostSaleCycle('جارٍ تنزيل ملف PDF بحجم A4. جاهز لعميل جديد.');
    void exportPostedSalePdf(sale, { settings: params.settings || null }).catch(() => {
      params.setSubmitMessage('تعذر تنزيل PDF. حاول مرة أخرى.');
      params.requestBarcodeFocus();
    });
  }

  return {
    reprintLastSale,
    printReceiptNow,
    printA4Now,
    exportPdfNow,
    heldDraftSummaries: params.heldDrafts.map((draft, index) => ({
      id: draft.id,
      label: `معلقة ${index + 1} - ${new Date(draft.savedAt).toLocaleString('ar-EG')}`,
      total: computeDraftTotal(draft),
      itemsCount: draft.cart.length,
    })),
  };
}
