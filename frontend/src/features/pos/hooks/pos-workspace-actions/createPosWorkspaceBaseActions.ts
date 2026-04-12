import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { downloadCsvFile } from '@/lib/browser';
import { addPosItem, getProductPrice, removePosItem, updatePosItemQty } from '@/features/pos/lib/pos.domain';
import { buildSaleLineKey, computeDraftTotal, matchProductByCode } from '@/features/pos/lib/pos-workspace.helpers';
import { clearDraftSnapshot } from '@/features/pos/lib/pos.persistence';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

export function createPosWorkspaceBaseActions(params: PosWorkspaceActionParams) {
  function registerRecentProduct(productId: string) {
    params.setRecentProductIds((current) => [productId, ...current.filter((id) => id !== productId)].slice(0, 8));
  }

  function resetPosDraft() {
    params.setCart([]);
    params.setCustomerId('');
    params.setDiscount(0);
    params.setCashAmount(0);
    params.setCardAmount(0);
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

  function handleAddProduct(product: Product) {
    try {
      params.setCart((current) => addPosItem(current, product, { priceType: params.priceType }));
      params.setLastAddedLineKey(buildSaleLineKey(product, params.priceType));
      registerRecentProduct(product.id);
      params.setScannerMessage('');
      params.setSubmitMessage('');
      params.setPostSaleSaleKey('');
      params.requestBarcodeFocus();
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر إضافة الصنف');
    }
  }

  function handleQuickAddCodeSubmit(rawCode?: string) {
    const code = String(rawCode ?? params.quickAddCode).trim();
    const result = matchProductByCode(params.products || [], code);
    if (result.status === 'empty') {
      params.setScannerMessage('اكتب الباركود أولًا.');
      return false;
    }
    if (result.status === 'not-found') {
      params.setScannerMessage('لا يوجد صنف أو وحدة بهذا الباركود.');
      return false;
    }
    if (result.status === 'ambiguous') {
      params.setScannerMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
      return false;
    }
    handleAddProduct(result.match.product);
    params.setSearch('');
    params.setQuickAddCode('');
    params.setScannerMessage(result.match.kind === 'unit' && result.match.unitName ? `تمت إضافة ${result.match.product.name} بوحدة ${result.match.unitName}.` : `تمت إضافة ${result.match.product.name} إلى السلة.`);
    return true;
  }

  function exportHeldDrafts() {
    if (!params.heldDrafts.length) return;
    downloadCsvFile(
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

  function applyPriceType(nextPriceType: PosPriceType) {
    params.setPriceType(nextPriceType);
    params.setCart((current) => current.map((item) => {
      const product = (params.products || []).find((entry) => entry.id === item.productId);
      return product ? {
        ...item,
        priceType: nextPriceType,
        price: getProductPrice(product, nextPriceType),
        lineKey: `${item.productId}::${item.unitId || item.unitName}::${nextPriceType}`,
      } : item;
    }));
  }

  return {
    resetPosDraft,
    handleAddProduct,
    handleQuickAddCodeSubmit,
    exportHeldDrafts,
    applyPriceType,
    registerRecentProduct,
    setQty: (lineKey: string, qty: number) => params.setCart((current) => updatePosItemQty(current, lineKey, qty)),
    removeItem: (lineKey: string) => params.setCart((current) => removePosItem(current, lineKey)),
    fillPaidAmount: () => { params.setCashAmount(params.totals.total); params.setCardAmount(0); },
  };
}
