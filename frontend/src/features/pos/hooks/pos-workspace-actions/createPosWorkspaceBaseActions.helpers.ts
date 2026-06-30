import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { downloadExcelFile } from '@/lib/browser';
import { computeDraftTotal } from '@/features/pos/lib/pos-workspace.helpers';
import { clearDraftSnapshot } from '@/features/pos/lib/pos.persistence';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

export function toMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function formatQty(value: number, isWeighted = false) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: isWeighted ? 3 : 0,
  }).format(Number(value || 0));
}

export function resolveSaleUnit(product: Product, unitId?: string) {
  return product.units?.find((entry) => String(entry.id || '') === String(unitId || ''))
    || product.units?.find((entry) => entry.isSaleUnit)
    || product.units?.[0];
}

export function resolveAvailableQty(product: Product, unitMultiplier: number, isWeighted = false) {
  const raw = Number(product.stock || 0) / Math.max(unitMultiplier || 1, 1);
  return isWeighted ? Number(raw.toFixed(3)) : Math.floor(raw);
}

export function findLineQty(cart: PosItem[], lineKey: string) {
  return Number(cart.find((item) => item.lineKey === lineKey)?.qty || 0);
}

export function getAddProductErrorMessage(
  error: unknown,
  product: Product,
  context: { availableQty?: number; currentQty?: number; requestedQty?: number; isWeighted?: boolean } = {},
) {
  const message = error instanceof Error ? error.message : '';
  const availableQty = Number(context.availableQty || 0);
  const currentQty = Number(context.currentQty || 0);
  const requestedQty = Number(context.requestedQty || 0);
  const isWeighted = context.isWeighted === true;

  if (availableQty <= 0) return 'المخزون غير متاح لهذا الصنف.';
  if (currentQty > 0 && currentQty >= availableQty) {
    return `لا يمكن إضافة كمية أكبر. المتاح من الصنف ${formatQty(availableQty, isWeighted)}، والموجود في السلة ${formatQty(currentQty, isWeighted)}.`;
  }
  if (requestedQty > 0 && requestedQty > availableQty) {
    return `الكمية المطلوبة أكبر من المخزون المتاح. المتاح حاليًا: ${formatQty(availableQty, isWeighted)}.`;
  }
  if (message.includes('غير متاح للبيع') || message.includes('المخزون')) return 'المخزون غير متاح لهذا الصنف.';
  if (message.includes('الكمية المطلوبة أكبر')) return `الكمية المطلوبة أكبر من المخزون المتاح. المتاح حاليًا: ${formatQty(availableQty, isWeighted)}.`;
  return message || `تعذر إضافة "${product.name}" إلى السلة.`;
}

export function resetPosDraftState(params: PosWorkspaceActionParams) {
  params.setCart([]);
  params.setSelectedLineKey('');
  params.setCustomerId('');
  params.setDiscount(0);
  params.setDiscountApprovalGranted(false);
  params.setDiscountApprovalSecret('');
  params.setCashAmount(0);
  params.setCardAmount(0);
  params.setTransferAmount(0);
  params.setPaymentType('cash');
  params.setPaymentChannel('cash');
  params.setNote('');
  params.setSearch('');
  params.setPriceType('retail');
  params.setBranchId(SINGLE_STORE_MODE ? String(params.branches[0]?.id || '') : '');
  params.setLocationId(SINGLE_STORE_MODE ? String(params.locations[0]?.id || '') : '');
  params.setQuickAddCode('');
  params.setScannerMessage('');
  params.setLastAddedLineKey('');
  params.setSubmitMessage('');
  params.setPostSaleSaleKey('');
  clearDraftSnapshot();
  params.requestBarcodeFocus();
}

export function exportHeldDraftRows(params: PosWorkspaceActionParams) {
  if (!params.heldDrafts.length) return;
  downloadExcelFile(
    'pos-held-drafts.csv',
    ['id', 'savedAt', 'itemsCount', 'total', 'customerId', 'branchId', 'locationId', 'priceType'],
    params.heldDrafts.map((draft) => [
      draft.id,
      draft.savedAt,
      draft.cart.length,
      computeDraftTotal(draft),
      draft.customerId || '',
      draft.branchId || '',
      draft.locationId || '',
      draft.priceType || 'retail',
    ]),
  );
}
