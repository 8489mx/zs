import { formatCurrency } from '@/lib/format';
import { printPostedSaleReceipt } from '@/lib/pos-printing';
import { computeDraftTotal } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

export function createPosWorkspaceReceiptActions(params: PosWorkspaceActionParams) {
  function reprintLastSale() {
    if (!params.lastSale) return;
    printPostedSaleReceipt(params.lastSale, { pageSize: params.settings?.paperSize === 'receipt' ? 'receipt' : 'a4', settings: params.settings || null });
  }

  async function copyLastSaleSummary() {
    if (!params.lastSale || !navigator.clipboard) return;
    const lines = [
      `فاتورة: ${params.lastSale.docNo || params.lastSale.id}`,
      `العميل: ${params.lastSale.customerName || 'عميل نقدي'}`,
      `الإجمالي: ${formatCurrency(Number(params.lastSale.total || 0))}`,
      `التاريخ: ${params.lastSale.date || ''}`,
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    params.setSubmitMessage('تم نسخ ملخص آخر فاتورة.');
  }

  return {
    reprintLastSale,
    copyLastSaleSummary,
    heldDraftSummaries: params.heldDrafts.map((draft, index) => ({
      id: draft.id,
      label: `معلقة ${index + 1} - ${new Date(draft.savedAt).toLocaleString('ar-EG')}`,
      total: computeDraftTotal(draft),
      itemsCount: draft.cart.length,
    })),
  };
}
