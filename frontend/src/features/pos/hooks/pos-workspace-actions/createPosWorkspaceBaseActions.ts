import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { downloadCsvFile } from '@/lib/browser';
import {
  addPosItem,
  getProductPrice,
  isNegativeStockSalesAllowed,
  removePosItem,
  updatePosItemQtyWithOptions,
} from '@/features/pos/lib/pos.domain';
import { buildSaleLineKey, computeDraftTotal, matchProductByCode } from '@/features/pos/lib/pos-workspace.helpers';
import {
  formatWeightedBarcodeQuantity,
  matchProductByWeightedCode,
  parseWeightedBarcode,
} from '@/features/pos/lib/weighted-barcode';
import { clearDraftSnapshot } from '@/features/pos/lib/pos.persistence';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

function toMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function formatQty(value: number, isWeighted = false) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: isWeighted ? 3 : 0,
  }).format(Number(value || 0));
}

function resolveSaleUnit(product: Product, unitId?: string) {
  return product.units?.find((entry) => String(entry.id || '') === String(unitId || ''))
    || product.units?.find((entry) => entry.isSaleUnit)
    || product.units?.[0];
}

function resolveAvailableQty(product: Product, unitMultiplier: number, isWeighted = false) {
  const raw = Number(product.stock || 0) / Math.max(unitMultiplier || 1, 1);
  return isWeighted ? Number(raw.toFixed(3)) : Math.floor(raw);
}

function findLineQty(cart: PosItem[], lineKey: string) {
  return Number(cart.find((item) => item.lineKey === lineKey)?.qty || 0);
}

function getAddProductErrorMessage(
  error: unknown,
  product: Product,
  context: { availableQty?: number; currentQty?: number; requestedQty?: number; isWeighted?: boolean } = {},
) {
  const message = error instanceof Error ? error.message : '';
  const availableQty = Number(context.availableQty || 0);
  const currentQty = Number(context.currentQty || 0);
  const requestedQty = Number(context.requestedQty || 0);
  const isWeighted = context.isWeighted === true;

  if (availableQty <= 0) {
    return 'المخزون غير متاح لهذا الصنف.';
  }

  if (currentQty > 0 && currentQty >= availableQty) {
    return `لا يمكن إضافة كمية أكبر. المتاح من الصنف ${formatQty(availableQty, isWeighted)}، والموجود في السلة ${formatQty(currentQty, isWeighted)}.`;
  }

  if (requestedQty > 0 && requestedQty > availableQty) {
    return `الكمية المطلوبة أكبر من المخزون المتاح. المتاح حاليًا: ${formatQty(availableQty, isWeighted)}.`;
  }

  if (message.includes('غير متاح للبيع') || message.includes('المخزون')) {
    return 'المخزون غير متاح لهذا الصنف.';
  }

  if (message.includes('الكمية المطلوبة أكبر')) {
    return `الكمية المطلوبة أكبر من المخزون المتاح. المتاح حاليًا: ${formatQty(availableQty, isWeighted)}.`;
  }

  return message || `تعذر إضافة "${product.name}" إلى السلة.`;
}

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

  function handleAddProduct(
    product: Product,
    unitId?: string,
    options: { quantity?: number; isWeighted?: boolean; sourceBarcode?: string } = {},
  ) {
    const lineKey = unitId ? resolveUnitLineKey(product, unitId) : buildSaleLineKey(product, params.priceType);
    const allowNegativeStockSales = isNegativeStockSalesAllowed(params.settings);
    const unit = resolveSaleUnit(product, unitId);
    const isWeighted = options.isWeighted === true;
    const availableQty = allowNegativeStockSales
      ? Number.MAX_SAFE_INTEGER
      : resolveAvailableQty(product, Number(unit?.multiplier || 1), isWeighted);
    const requestedQty = Number(options.quantity ?? 1);
    const currentQty = findLineQty(params.cart, lineKey);

    if (!allowNegativeStockSales && availableQty <= 0) {
      const friendlyMessage = getAddProductErrorMessage(null, product, {
        availableQty,
        currentQty,
        requestedQty,
        isWeighted,
      });
      params.setSubmitMessage(friendlyMessage);
      params.setScannerMessage(friendlyMessage);
      params.requestBarcodeFocus();
      return false;
    }

    if (!allowNegativeStockSales && currentQty > 0 && currentQty >= availableQty) {
      const friendlyMessage = getAddProductErrorMessage(null, product, {
        availableQty,
        currentQty,
        requestedQty,
        isWeighted,
      });
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
        const friendlyMessage = getAddProductErrorMessage(caughtError, product, {
          availableQty,
          currentQty,
          requestedQty,
          isWeighted,
        });
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
      const friendlyMessage = getAddProductErrorMessage(error, product, {
        availableQty,
        currentQty,
        requestedQty,
        isWeighted,
      });
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
    try {
      const nextCart = updatePosItemQtyWithOptions(params.cart, lineKey, qty, params.products || [], {
        allowNegativeStockSales: isNegativeStockSalesAllowed(params.settings),
      });

      params.setSelectedLineKey(lineKey);
      params.setCart(nextCart);
      params.setSubmitMessage('');
      params.setPostSaleSaleKey('');
      // Do not force barcode focus here. Quantity editing happens inside the cart, and the
      // cashier must be able to type multi-digit quantities or press +/- repeatedly.
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر تعديل الكمية.');
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
    removeItem,
    fillPaidAmount,
    setPaymentPreset,
    changeSelectedQty,
    editSelectedQty,
    removeSelectedItem,
    selectAdjacentCartLine,
  };
}
