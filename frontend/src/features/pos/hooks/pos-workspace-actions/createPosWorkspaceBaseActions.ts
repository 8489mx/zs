import {
  addPosItem,
  getProductPrice,
  isNegativeStockSalesAllowed,
  removePosItem,
  updatePosItemQtyWithOptions,
  updatePosItemNotes,
  updatePosItemModifiers,
} from '@/features/pos/lib/pos.domain';
import { buildSaleLineKey, matchProductByCode } from '@/features/pos/lib/pos-workspace.helpers';
import {
  formatWeightedBarcodeQuantity,
  matchProductByWeightedCode,
  parseWeightedBarcode,
} from '@/features/pos/lib/weighted-barcode';
import {
  exportHeldDraftRows,
  findLineQty,
  getAddProductErrorMessage,
  resetPosDraftState,
  resolveAvailableQty,
  resolveSaleUnit,
  toMoney,
} from '@/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions.helpers';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

export function createPosWorkspaceBaseActions(params: PosWorkspaceActionParams) {
  function resolveUnitLineKey(product: Product, unitId?: string) {
    const unit = resolveSaleUnit(product, unitId);
    return `${product.id}::${unit?.id || unit?.name || ''}::${params.priceType}`;
  }

  function registerRecentProduct(productId: string) {
    params.setRecentProductIds((current) => [productId, ...current.filter((id) => id !== productId)].slice(0, 8));
  }

  function selectCartLine(lineKey: string) {
    params.setSelectedLineKey(lineKey);
  }

  function resetPosDraft() {
    resetPosDraftState(params);
  }

  function handleAddProduct(
    product: Product,
    unitId?: string,
    options: { quantity?: number; isWeighted?: boolean; sourceBarcode?: string } = {},
  ) {
    const lineKey = unitId ? resolveUnitLineKey(product, unitId) : buildSaleLineKey(product, params.priceType);
    const allowNegativeStockSales = isNegativeStockSalesAllowed(params.settings) || !!product.hasBom;
    const unit = resolveSaleUnit(product, unitId);
    const isWeighted = options.isWeighted === true;
    const availableQty = allowNegativeStockSales
      ? Number.MAX_SAFE_INTEGER
      : resolveAvailableQty(product, Number(unit?.multiplier || 1), isWeighted);
    const requestedQty = Number(options.quantity ?? 1);
    const currentQty = findLineQty(params.cart, lineKey);

    if (!allowNegativeStockSales && availableQty <= 0) {
      const friendlyMessage = getAddProductErrorMessage(null, product, { availableQty, currentQty, requestedQty, isWeighted });
      params.setSubmitMessage(friendlyMessage);
      params.setScannerMessage(friendlyMessage);
      params.requestBarcodeFocus();
      return false;
    }

    if (!allowNegativeStockSales && currentQty > 0 && currentQty >= availableQty) {
      const friendlyMessage = getAddProductErrorMessage(null, product, { availableQty, currentQty, requestedQty, isWeighted });
      params.setSubmitMessage(friendlyMessage);
      params.setScannerMessage(friendlyMessage);
      params.requestBarcodeFocus();
      return false;
    }

    try {
      let caughtError: unknown = null;
      params.setCart((currentCart) => {
        try {
          return addPosItem(currentCart, product, {
            priceType: params.priceType,
            unitId,
            allowNegativeStockSales,
            quantity: options.quantity,
            isWeighted: options.isWeighted,
            sourceBarcode: options.sourceBarcode,
          });
        } catch (error) {
          caughtError = error;
          return currentCart;
        }
      });

      if (caughtError) {
        const friendlyMessage = getAddProductErrorMessage(caughtError, product, { availableQty, currentQty, requestedQty, isWeighted });
        params.setSubmitMessage(friendlyMessage);
        params.setScannerMessage(friendlyMessage);
        params.requestBarcodeFocus();
        return false;
      }

      params.setSelectedLineKey(lineKey);
      params.setLastAddedLineKey(lineKey);
      registerRecentProduct(product.id);
      params.setScannerMessage('');
      params.setSubmitMessage('');
      params.setPostSaleSaleKey('');
      params.requestBarcodeFocus();
      return true;
    } catch (error) {
      const friendlyMessage = getAddProductErrorMessage(error, product, { availableQty, currentQty, requestedQty, isWeighted });
      params.setSubmitMessage(friendlyMessage);
      params.setScannerMessage(friendlyMessage);
      params.requestBarcodeFocus();
      return false;
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
      const weightedBarcode = parseWeightedBarcode(code, params.settings);
      if (weightedBarcode) {
        const weightedResult = matchProductByWeightedCode(productsOverride || params.products || [], weightedBarcode.productCode);
        if (weightedResult.status === 'matched') {
          const added = handleAddProduct(
            weightedResult.match.product,
            weightedResult.match.kind === 'unit' ? weightedResult.match.unitId : undefined,
            { quantity: weightedBarcode.quantity, isWeighted: true, sourceBarcode: weightedBarcode.rawCode },
          );
          if (!added) return false;
          params.setSearch('');
          params.setQuickAddCode('');
          params.setScannerMessage(`تمت إضافة ${weightedResult.match.product.name} بوزن ${formatWeightedBarcodeQuantity(weightedBarcode.quantity)}.`);
          return true;
        }
        if (weightedResult.status === 'ambiguous') {
          params.setScannerMessage(`كود الميزان ${weightedBarcode.productCode} مرتبط بأكثر من صنف أو وحدة. راجع كود الصنف أولًا.`);
          params.requestBarcodeFocus();
          return false;
        }
        params.setScannerMessage(`باركود ميزان: لم يتم العثور على كود الصنف ${weightedBarcode.productCode}.`);
        params.requestBarcodeFocus();
        return false;
      }
      params.setScannerMessage('لا يوجد صنف أو وحدة بهذا الباركود.');
      params.requestBarcodeFocus();
      return false;
    }
    if (result.status === 'ambiguous') {
      params.setScannerMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
      params.requestBarcodeFocus();
      return false;
    }
    const added = handleAddProduct(result.match.product, result.match.kind === 'unit' ? result.match.unitId : undefined);
    if (!added) return false;
    params.setSearch('');
    params.setQuickAddCode('');
    params.setScannerMessage(
      result.match.kind === 'unit' && result.match.unitName
        ? `تمت إضافة ${result.match.product.name} بوحدة ${result.match.unitName}.`
        : `تمت إضافة ${result.match.product.name} إلى السلة.`,
    );
    return true;
  }

  function exportHeldDrafts() {
    exportHeldDraftRows(params);
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
    try {
      const nextCart = updatePosItemQtyWithOptions(params.cart, lineKey, qty, params.products || [], {
        allowNegativeStockSales: isNegativeStockSalesAllowed(params.settings),
      });
      params.setSelectedLineKey(lineKey);
      params.setCart(nextCart);
      params.setSubmitMessage('');
      params.setPostSaleSaleKey('');
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر تعديل الكمية.');
    }
  }

  function setItemNote(lineKey: string, notes: string) {
    try {
      const nextCart = updatePosItemNotes(params.cart, lineKey, notes);
      params.setSelectedLineKey(lineKey);
      params.setCart(nextCart);
    } catch (error) {
      params.setSubmitMessage('تعذر تعديل الملاحظات.');
    }
  }

  function setItemModifiers(lineKey: string, modifiers: any[]) {
    try {
      const nextCart = updatePosItemModifiers(params.cart, lineKey, modifiers);
      params.setSelectedLineKey(lineKey);
      params.setCart(nextCart);
    } catch (error) {
      params.setSubmitMessage('تعذر تعديل الإضافات.');
    }
  }

  function removeItem(lineKey: string) {
    params.setCart((current) => removePosItem(current, lineKey));
    if (params.selectedLineKey === lineKey) params.setSelectedLineKey('');
    params.setPostSaleSaleKey('');
  }

  function fillPaidAmount() {
    if (params.paymentType === 'credit') return;
    const total = toMoney(params.totals.total);
    if (params.paymentChannel === 'wallet' || params.paymentChannel === 'instapay') {
      params.setCashAmount(0);
      params.setCardAmount(0);
      params.setTransferAmount(total);
      return;
    }
    if (params.paymentChannel === 'card') {
      params.setCashAmount(0);
      params.setCardAmount(total);
      params.setTransferAmount(0);
      return;
    }
    if (params.paymentChannel === 'mixed' && Number(params.cardAmount || 0) > 0) {
      const nextCardAmount = Math.min(total, Math.max(0, toMoney(params.cardAmount)));
      params.setCardAmount(nextCardAmount);
      params.setCashAmount(toMoney(total - nextCardAmount));
      params.setTransferAmount(0);
      return;
    }
    params.setCashAmount(total);
    params.setCardAmount(0);
    params.setTransferAmount(0);
  }

  function setPaymentPreset(preset: 'cash' | 'card' | 'wallet' | 'instapay' | 'credit') {
    params.setSubmitMessage('');
    params.setPostSaleSaleKey('');
    if (preset === 'credit') {
      params.setPaymentType('credit');
      params.setPaymentChannel('credit');
      params.setCashAmount(0);
      params.setCardAmount(0);
      params.setTransferAmount(0);
      params.requestBarcodeFocus();
      return;
    }
    const total = toMoney(params.totals.total);
    params.setPaymentType('cash');
    params.setTransferAmount(0);
    if (preset === 'card') {
      params.setPaymentChannel('card');
      params.setCashAmount(0);
      params.setCardAmount(total);
    } else if (preset === 'wallet' || preset === 'instapay') {
      params.setPaymentChannel(preset);
      params.setCashAmount(0);
      params.setCardAmount(0);
      params.setTransferAmount(total);
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
    const minQty = selectedItem.isWeighted === true ? 0.001 : 1;
    const nextQty = selectedItem.isWeighted === true
      ? Number((Number(selectedItem.qty || 0) + delta).toFixed(3))
      : Number(selectedItem.qty || 1) + delta;
    setQty(selectedItem.lineKey, Math.max(minQty, nextQty));
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
      return false;
    }
    setQty(selectedItem.lineKey, selectedItem.isWeighted === true ? Number(nextQty.toFixed(3)) : Math.round(nextQty));
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
    setItemNote,
    setItemModifiers,
    removeItem,
    fillPaidAmount,
    setPaymentPreset,
    changeSelectedQty,
    editSelectedQty,
    removeSelectedItem,
    selectAdjacentCartLine,
  };
}
