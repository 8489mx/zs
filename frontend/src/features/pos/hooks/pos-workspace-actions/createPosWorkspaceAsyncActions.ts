import type { FormEvent } from 'react';
import type { Customer, Sale } from '@/types/domain';
import { getPostSalePrintHint, getPostSalePrintMode } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import { catalogApi } from '@/lib/api/catalog';
import { isNegativeStockSalesAllowed } from '@/features/pos/lib/pos.domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';
import type { createPosWorkspaceBaseActions } from '@/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions';
import { extractCreatedEntityId } from '@/lib/api/extract-created-entity-id';
import { storefrontApi } from '@/features/storefront/api/storefront.api';

function getSaleKey(sale: Sale | null) {
  if (!sale) return '';
  return String(sale.docNo || sale.id || '');
}

interface SubmitOptions {
  fastCash?: boolean;
  managerPin?: string;
}

function getSubmitSaleErrorMessage(error: unknown) {
  const raw = error instanceof Error ? String(error.message || '').trim() : '';
  const normalized = raw.toLowerCase();
  if (
    normalized.includes('الكمية المطلوبة أكبر من المخزون المتاح')
    || normalized.includes('insufficient stock')
    || normalized.includes('stock')
    || normalized.includes('inventory')
  ) {
    return 'الكمية المطلوبة أكبر من المخزون المتاح. راجع الكميات في السلة قبل إتمام البيع.';
  }
  return raw || 'تعذر حفظ الفاتورة';
}

function matchesCreatedCustomer(customer: Customer, name: string, phone: string) {
  const customerName = String(customer.name || '').trim();
  const customerPhone = String(customer.phone || '').trim();
  if (phone) return customerName === name && customerPhone === phone;
  return customerName === name;
}

export function createPosWorkspaceAsyncActions(
  params: PosWorkspaceActionParams,
  base: ReturnType<typeof createPosWorkspaceBaseActions>,
) {
  async function handleQuickCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = params.quickCustomerName.trim();
    const phone = params.quickCustomerPhone.trim();
    const address = params.quickCustomerAddress.trim();
    if (!name) return;
    try {
      const created = await params.quickCustomerMutation.mutateAsync({
        name,
        phone,
        address,
        balance: 0,
        type: 'cash',
        creditLimit: 0,
      });

      let createdCustomerId = extractCreatedEntityId(created);
      if (!createdCustomerId) {
        const refreshedCustomers = await catalogApi.listCustomers();
        const matchedCustomer = [...refreshedCustomers].reverse().find((customer) => matchesCreatedCustomer(customer, name, phone));
        createdCustomerId = matchedCustomer ? String(matchedCustomer.id) : '';
      }

      params.setQuickCustomerName('');
      params.setQuickCustomerPhone('');
      params.setQuickCustomerAddress('');
      if (createdCustomerId) params.setCustomerId(createdCustomerId);
      params.setPostSaleSaleKey('');
      params.setSubmitMessage(createdCustomerId
        ? 'تم إضافة العميل وتحديده داخل فاتورة الكاشير'
        : 'تم إضافة العميل لكن تعذر تحديده تلقائيًا');
      params.requestBarcodeFocus();
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر إضافة العميل');
      params.requestBarcodeFocus();
    }
  }

  async function handleSubmit(options: SubmitOptions = {}) {
    if (params.createSale.isPending) return;
    if (!params.hasOperationalSetup) {
      params.setSubmitMessage('أكمل تعريف المتجر ونقطة التشغيل قبل أول فاتورة.');
      params.requestBarcodeFocus();
      return;
    }
    if (!params.hasCatalogReady) {
      params.setSubmitMessage('أضف الأصناف أولًا قبل استخدام شاشة الكاشير.');
      params.requestBarcodeFocus();
      return;
    }
    if (params.requiresCashierShift && !params.ownOpenShift) {
      params.setSubmitMessage('افتح وردية كاشير أولًا قبل تسجيل فاتورة نقدية أو بطاقة.');
      params.requestBarcodeFocus();
      return;
    }
    if (params.hasZeroPriceLine) {
      params.setSubmitMessage('يوجد صنف بسعر صفر. راجع التسعير قبل إتمام البيع.');
      params.requestBarcodeFocus();
      return;
    }

    const total = Number(params.totals.total || 0);
    const allowNegativeStockSales = isNegativeStockSalesAllowed(params.settings);
    const initialCashAmount = Number(params.cashAmount || 0);
    const initialCardAmount = Number(params.cardAmount || 0);
    const initialTransferAmount = Number(params.transferAmount || 0);
    const initialPaidAmount = params.paymentChannel === 'wallet' || params.paymentChannel === 'instapay'
      ? Number(initialTransferAmount.toFixed(2))
      : Number((initialCashAmount + initialCardAmount).toFixed(2));

    // F2 is a fast-cash shortcut only while the current invoice is NOT explicitly credit.
    // If the cashier selected "آجل", the sale must remain credit and must stay attached to the selected customer.
    const forceFastCash = options.fastCash === true && params.paymentType !== 'credit';

    // Smooth negative-stock cashier flow: when below-stock sales are allowed and no amount was typed,
    // treat a normal cash invoice as fully paid instead of blocking it with an underpaid warning.
    const isCodDelivery = params.orderType === 'delivery' && params.collectionStatus === 'cod';

    const shouldAssumeFullCashPayment = !forceFastCash
      && !isCodDelivery
      && allowNegativeStockSales
      && params.paymentType !== 'credit'
      && params.paymentChannel === 'cash'
      && initialPaidAmount <= 0.0001
      && total > 0;

    const shouldAssumeFullCardPayment = !forceFastCash
      && !isCodDelivery
      && allowNegativeStockSales
      && params.paymentType !== 'credit'
      && params.paymentChannel === 'card'
      && initialPaidAmount <= 0.0001
      && total > 0;

    const shouldAssumeFullTransferPayment = !forceFastCash
      && !isCodDelivery
      && allowNegativeStockSales
      && params.paymentType !== 'credit'
      && (params.paymentChannel === 'wallet' || params.paymentChannel === 'instapay')
      && initialPaidAmount <= 0.0001
      && total > 0;

    const settleAsCash = forceFastCash || shouldAssumeFullCashPayment;
    const settleAsCard = shouldAssumeFullCardPayment;
    const settleAsTransfer = shouldAssumeFullTransferPayment;

    if (params.hasCreditWithoutCustomer && !settleAsCash) {
      params.setSubmitMessage('اختر عميلًا أولًا لأن البيع الآجل يحتاج حساب عميل.');
      params.requestBarcodeFocus();
      return;
    }

    const effectivePaymentType = settleAsCash || settleAsCard || settleAsTransfer ? 'cash' : params.paymentType;
    const effectiveCustomerId = String(params.customerId || '').trim();
    const effectiveCashAmount = effectivePaymentType === 'credit'
      ? initialCashAmount
      : (settleAsCash ? total : initialCashAmount);
    const effectiveCardAmount = effectivePaymentType === 'credit'
      ? initialCardAmount
      : (settleAsCard ? total : initialCardAmount);
    const effectiveTransferAmount = effectivePaymentType === 'credit'
      ? initialTransferAmount
      : (settleAsTransfer ? total : initialTransferAmount);

    const effectivePaidAmount = Number((
      effectiveCashAmount + effectiveCardAmount + effectiveTransferAmount
    ).toFixed(2));

    const transferChannel = params.paymentChannel === 'wallet' ? 'wallet' : 'instapay';
    const effectivePaymentChannel = settleAsCash
      ? 'cash'
      : settleAsCard
        ? 'card'
        : settleAsTransfer
          ? transferChannel
          : (effectiveCashAmount > 0 && (effectiveTransferAmount > 0 || effectiveCardAmount > 0))
            ? 'mixed'
            : (effectiveTransferAmount > 0
              ? transferChannel
              : (effectiveCardAmount > 0 ? 'card' : (params.paymentChannel || 'cash')));

    const isPartialCreditWithCustomer = Boolean(effectiveCustomerId) && effectivePaidAmount < total;
    const isUnderpaid = effectivePaymentType !== 'credit' && !isPartialCreditWithCustomer && !isCodDelivery && effectivePaidAmount < total;

    if ((effectivePaymentType === 'credit' || isPartialCreditWithCustomer) && !effectiveCustomerId) {
      params.setSubmitMessage('اختر عميلًا أولًا لأن البيع الآجل يجب أن يسجل على حساب العميل.');
      params.requestBarcodeFocus();
      return;
    }

    if (isUnderpaid) {
      params.setSubmitMessage('المبلغ المدفوع أقل من المطلوب. أكمل المدفوع أو اختر بيعًا آجلًا.');
      params.requestBarcodeFocus();
      return;
    }

    if (settleAsCash) {
      params.setPaymentType('cash');
      params.setPaymentChannel('cash');
      params.setCashAmount(total);
      params.setCardAmount(0);
      params.setTransferAmount(0);
    } else if (settleAsCard) {
      params.setPaymentType('cash');
      params.setPaymentChannel('card');
      params.setCashAmount(0);
      params.setCardAmount(total);
      params.setTransferAmount(0);
    } else if (settleAsTransfer) {
      params.setPaymentType('cash');
      params.setCashAmount(0);
      params.setCardAmount(0);
      params.setTransferAmount(total);
    }

    params.setPostSaleSaleKey('');

    try {
      const createdSale = await params.createSale.mutateAsync({
        source: 'pos',
        cart: params.cart,
        customerId: effectiveCustomerId,
        customerPhone: params.quickCustomerPhone,
        customerAddress: params.quickCustomerAddress,
        paymentType: (effectivePaymentType === 'credit' || isPartialCreditWithCustomer) ? 'credit' : 'cash',
        paymentChannel: effectivePaymentChannel,
        discount: params.totals.discountValue,
        deliveryFee: params.totals.deliveryFee,
        note: params.note,
        paidAmount: effectivePaidAmount,
        tenderedAmount: effectiveCashAmount,
        payments: [
          ...(effectiveCashAmount > 0 ? [{ paymentChannel: 'cash' as const, amount: effectiveCashAmount }] : []),
          ...(effectiveCardAmount > 0 ? [{ paymentChannel: 'card' as const, amount: effectiveCardAmount }] : []),
          ...(effectiveTransferAmount > 0 ? [{ paymentChannel: (params.paymentChannel === 'wallet' ? 'wallet' as const : 'instapay' as const), amount: effectiveTransferAmount }] : []),
        ],
        taxRate: params.totals.taxRate,
        pricesIncludeTax: params.totals.pricesIncludeTax,
        expectedTotal: total,
        managerPin: options.managerPin || params.discountApprovalSecret || undefined,
        branchId: params.branchId || (params.currentBranch?.id != null ? String(params.currentBranch.id) : null),
        locationId: params.locationId || (params.currentLocation?.id != null ? String(params.currentLocation.id) : null),
        orderType: params.orderType,
        tableNumber: params.tableNumber,
        deliveryRepId: params.deliveryRepId,
        collectionStatus: params.collectionStatus,
        deliveryFeeMode: params.deliveryFeeMode,
      });
      const hydratedSale: Sale = {
        ...(createdSale as Sale),
        cart: params.cart,
      };
      params.setLastSale(hydratedSale);
      const createdSaleKey = getSaleKey(hydratedSale);

      // Link online order if this sale originated from an online store order
      try {
        const rawOnlineId = localStorage.getItem('zs_pos_online_order_id');
        const activeOnlineOrderId = rawOnlineId ? Number(rawOnlineId) : 0;
        const saleId = Number((createdSale as any)?.id || (createdSale as any)?.sale?.id || (typeof createdSale === 'number' ? createdSale : 0));
        if (activeOnlineOrderId > 0 && saleId > 0) {
          void storefrontApi.updateOrderStatus(activeOnlineOrderId, 'delivered', saleId);
          localStorage.removeItem('zs_pos_online_order_id');
          localStorage.removeItem('zs_pos_online_order_number');
        }
      } catch (err) {
        console.warn('Failed to link online order to POS sale:', err);
      }

      base.resetPosDraft();
      params.setPostSaleSaleKey(createdSaleKey);
      const postSalePrintMode = getPostSalePrintMode(params.settings || null);
      params.setSubmitMessage(`تم حفظ فاتورة البيع بنجاح${(createdSale as Sale)?.docNo ? `: ${(createdSale as Sale).docNo}` : ''}. ${getPostSalePrintHint(postSalePrintMode)}`);
      params.requestBarcodeFocus();
    } catch (error) {
      params.setSubmitMessage(getSubmitSaleErrorMessage(error));
      params.requestBarcodeFocus();
    }
  }

  async function approveDiscountOverride(password: string) {
    const normalized = String(password || '').trim();
    const result = await params.discountAuthorizationMutation.mutateAsync(normalized);
    params.setDiscountApprovalGranted(true);
    params.setDiscountApprovalSecret(normalized);
    params.setSubmitMessage('تم اعتماد الخصم لهذه الفاتورة الحالية');
    return result;
  }

  async function holdDraft() {
    if (!params.cart.length) {
      params.setSubmitMessage('لا يمكن تعليق فاتورة فارغة');
      params.requestBarcodeFocus();
      return;
    }
    try {
      const sanitizedItems = params.cart.map((item) => ({
        productId: Number(item.productId || 0),
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        name: String(item.name || '').trim(),
        unitName: String(item.unitName || '').trim(),
        unitMultiplier: Number(item.unitMultiplier || 1),
        priceType: item.priceType === 'wholesale' ? 'wholesale' : 'retail',
      }));
      await params.saveHeldDraftMutation.mutateAsync({
        customerId: params.customerId || null,
        paymentType: params.paymentType,
        discount: params.discount,
        deliveryFee: params.deliveryFee,
        note: params.note,
        search: params.search,
        priceType: params.priceType,
        branchId: params.branchId || (params.currentBranch?.id != null ? String(params.currentBranch.id) : null),
        locationId: params.locationId || (params.currentLocation?.id != null ? String(params.currentLocation.id) : null),
        cashAmount: params.cashAmount,
        cardAmount: params.cardAmount,
        transferAmount: params.transferAmount,
        paymentChannel: params.paymentChannel,
        orderType: params.orderType,
        tableNumber: params.tableNumber,
        ...(params.deliveryRepId && Number(params.deliveryRepId) > 0 ? {
          deliveryRepId: Number(params.deliveryRepId),
          collectionStatus: params.collectionStatus || 'cod',
        } : {}),
        items: sanitizedItems,
      });
      base.resetPosDraft();
      params.setSubmitMessage('تم تعليق الفاتورة الحالية ويمكن استرجاعها لاحقًا');
      params.requestBarcodeFocus();
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر حفظ الفاتورة المعلقة');
      params.requestBarcodeFocus();
    }
  }

  async function recallDraft(draftId: string) {
    const draft = params.heldDrafts.find((entry) => entry.id === draftId);
    if (!draft) return;
    
    // Ensure recalled items have a lineKey so they can be modified/deleted
    const restoredCart = (draft.cart || []).map((item, index) => ({
      ...item,
      lineKey: item.lineKey || `${item.productId}::${item.unitName || 'unit'}::${item.priceType || 'retail'}::recalled-${index}`
    }));
    
    params.setCart(restoredCart);
    params.setCustomerId(draft.customerId);
    params.setDiscount(Number(draft.discount || 0));
    params.setDeliveryFee(Number((draft as any).deliveryFee || 0));
    params.setCashAmount(Number(draft.cashAmount || 0));
    params.setCardAmount(Number(draft.cardAmount || 0));
    params.setTransferAmount(
      Number(
        draft.transferAmount
        || ((draft.paymentChannel === 'wallet' || draft.paymentChannel === 'instapay')
          ? draft.paidAmount || 0
          : 0),
      ),
    );
    params.setPaymentType(draft.paymentType);
    params.setPaymentChannel(draft.paymentChannel);
    params.setNote(draft.note);
    params.setSearch(draft.search);
    params.setPriceType(draft.priceType);
    params.setOrderType(draft.orderType || 'takeaway');
    params.setTableNumber(draft.tableNumber || '');
    params.setDeliveryRepId(draft.deliveryRepId || '');
    params.setCollectionStatus(draft.collectionStatus || 'cod');
    if ((draft as any).deliveryFeeMode) {
      params.setDeliveryFeeMode((draft as any).deliveryFeeMode);
    }
    params.setDiscountApprovalGranted(false);
    params.setDiscountApprovalSecret('');
    await params.deleteHeldDraftMutation.mutateAsync(draftId);
    params.setPostSaleSaleKey('');
    params.setSubmitMessage('تم استرجاع الفاتورة المعلقة');
    params.requestBarcodeFocus();
  }

  return {
    handleQuickCustomerSubmit,
    approveDiscountOverride,
    handleSubmit,
    holdDraft,
    recallDraft,
    deleteDraft: async (draftId: string) => {
      await params.deleteHeldDraftMutation.mutateAsync(draftId);
      params.requestBarcodeFocus();
    },
    clearHeldDrafts: async () => {
      await params.clearHeldDraftsMutation.mutateAsync();
      params.requestBarcodeFocus();
    },
  };
}
