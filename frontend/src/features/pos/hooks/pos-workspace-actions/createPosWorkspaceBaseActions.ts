import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { downloadCsvFile } from '@/lib/browser';
import { addPosItem, getProductPrice, removePosItem, updatePosItemQty } from '@/features/pos/lib/pos.domain';
import { buildSaleLineKey, computeDraftTotal, matchProductByCode } from '@/features/pos/lib/pos-workspace.helpers';
import { clearDraftSnapshot } from '@/features/pos/lib/pos.persistence';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

function toMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function createPosWorkspaceBaseActions(params: PosWorkspaceActionParams) {
  function resolveUnitLineKey(product: Product, unitId?: string) {
    const unit = product.units?.find((entry) => String(entry.id || '') === String(unitId || ''))
      || product.units?.find((entry) => entry.isSaleUnit)
      || product.units?.[0];
    return `${product.id}::${unit?.id || unit?.name || ''}::${params.priceType}`;
  }

  function registerRecentProduct(productId: string) {
    params.setRecentProductIds((current) => [productId, ...current.filter((id) => id !== productId)].slice(0, 8));
  }

  function selectCartLine(lineKey: string) {
    params.setSelectedLineKey(lineKey);
  }

  function resetPosDraft() {
    params.setCart([]);
    params.setSelectedLineKey('');
    params.setCustomerId('');
    params.setDiscount(0);
    params.setDiscountApprovalGranted(false);
    params.setDiscountApprovalSecret('');
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

  function handleAddProduct(product: Product, unitId?: string) {
    try {
      const lineKey = unitId ? resolveUnitLineKey(product, unitId) : buildSaleLineKey(product, params.priceType);
      params.setCart((current) => addPosItem(current, product, { priceType: params.priceType, unitId }));
      params.setSelectedLineKey(lineKey);
      params.setLastAddedLineKey(lineKey);
      registerRecentProduct(product.id);
      params.setScannerMessage('');
      params.setSubmitMessage('');
      params.setPostSaleSaleKey('');
      params.requestBarcodeFocus();
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر إضافة الصنف');
      params.requestBarcodeFocus();
    }
  }

  function handleQuickAddCodeSubmit(rawCode?: string, productsOverride?: Product[]) {
    const code = String(rawCode ?? params.quickAddCode).trim();
    const result = matchProductByCode(productsOverride || params.products || [], code);
    if (result.status === 'empty') {
      params.setScannerMessage('اكتب الباركود أولًا.');
      params.requestBarcodeFocus();
      return false;
    }
    if (result.status === 'not-found') {
      params.setScannerMessage('لا يوجد صنف أو وحدة بهذا الباركود.');
      params.requestBarcodeFocus();
      return false;
    }
    if (result.status === 'ambiguous') {
      params.setScannerMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
      params.requestBarcodeFocus();
      return false;
    }
    handleAddProduct(result.match.product, result.match.kind === 'unit' ? result.match.unitId : undefined);
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
    const selectedLine = params.cart.find((item) => item.lineKey === params.selectedLineKey);
    params.setPriceType(nextPriceType);
    params.setCart((current) => current.map((item) => {
      const product = (params.products || []).find((entry) => entry.id === item.productId);
      return product ? {
        ...item,
        priceType: nextPriceType,
        price: getProductPrice(product, nextPriceType, item.qty),
        lineKey: `${item.productId}::${item.unitId || item.unitName}::${nextPriceType}`,
      } : item;
    }));
    if (selectedLine) {
      params.setSelectedLineKey(`${selectedLine.productId}::${selectedLine.unitId || selectedLine.unitName}::${nextPriceType}`);
    }
  }

  function setQty(lineKey: string, qty: number) {
    params.setSelectedLineKey(lineKey);
    params.setCart((current) => updatePosItemQty(current, lineKey, qty, params.products || []));
    params.setPostSaleSaleKey('');
  }

  function removeItem(lineKey: string) {
    params.setCart((current) => removePosItem(current, lineKey));
    if (params.selectedLineKey === lineKey) params.setSelectedLineKey('');
    params.setPostSaleSaleKey('');
  }

  function fillPaidAmount() {
    if (params.paymentType === 'credit') return;
    const total = toMoney(params.totals.total);
    if (params.paymentChannel === 'card') {
      params.setCashAmount(0);
      params.setCardAmount(total);
      return;
    }
    if (params.paymentChannel === 'mixed' && Number(params.cardAmount || 0) > 0) {
      const nextCardAmount = Math.min(total, Math.max(0, toMoney(params.cardAmount)));
      params.setCardAmount(nextCardAmount);
      params.setCashAmount(toMoney(total - nextCardAmount));
      return;
    }
    params.setCashAmount(total);
    params.setCardAmount(0);
  }

  function setPaymentPreset(preset: 'cash' | 'card' | 'credit') {
    params.setSubmitMessage('');
    params.setPostSaleSaleKey('');
    if (preset === 'credit') {
      params.setPaymentType('credit');
      params.setPaymentChannel('credit');
      params.setCashAmount(0);
      params.setCardAmount(0);
      params.requestBarcodeFocus();
      return;
    }
    const total = toMoney(params.totals.total);
    params.setPaymentType('cash');
    if (preset === 'card') {
      params.setPaymentChannel('card');
      params.setCashAmount(0);
      params.setCardAmount(total);
    } else {
      params.setPaymentChannel('cash');
      params.setCashAmount(total);
      params.setCardAmount(0);
    }
    params.requestBarcodeFocus();
  }

  function changeSelectedQty(delta: number) {
    const selectedItem = params.cart.find((item) => item.lineKey === params.selectedLineKey);
    if (!selectedItem) return false;
    setQty(selectedItem.lineKey, Math.max(1, selectedItem.qty + delta));
    return true;
  }

  function editSelectedQty() {
    const selectedItem = params.cart.find((item) => item.lineKey === params.selectedLineKey);
    if (!selectedItem || typeof window === 'undefined') return false;
    const rawValue = window.prompt(`أدخل الكمية الجديدة للصنف: ${selectedItem.name}`, String(selectedItem.qty));
    if (rawValue == null) return false;
    const nextQty = Number(rawValue || 0);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      params.setSubmitMessage('الكمية يجب أن تكون أكبر من صفر.');
      params.requestBarcodeFocus();
      return false;
    }
    setQty(selectedItem.lineKey, Math.round(nextQty));
    params.requestBarcodeFocus();
    return true;
  }

  function removeSelectedItem() {
    if (!params.selectedLineKey) return false;
    removeItem(params.selectedLineKey);
    params.requestBarcodeFocus();
    return true;
  }

  function selectAdjacentCartLine(direction: 'next' | 'prev') {
    if (!params.cart.length) return false;
    const currentIndex = params.cart.findIndex((item) => item.lineKey === params.selectedLineKey);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const offset = direction === 'next' ? 1 : -1;
    const nextIndex = (baseIndex + offset + params.cart.length) % params.cart.length;
    params.setSelectedLineKey(params.cart[nextIndex]?.lineKey || '');
    return true;
  }

  return {
    resetPosDraft,
    handleAddProduct,
    handleQuickAddCodeSubmit,
    exportHeldDrafts,
    applyPriceType,
    registerRecentProduct,
    selectCartLine,
    setQty,
    removeItem,
    fillPaidAmount,
    setPaymentPreset,
    changeSelectedQty,
    editSelectedQty,
    removeSelectedItem,
    selectAdjacentCartLine,
  };
}
