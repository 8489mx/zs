import type { FormEvent } from 'react';
import type { Customer, Sale } from '@/types/domain';
import { getPostSalePrintHint, getPostSalePrintMode } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import { catalogApi } from '@/lib/api/catalog';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';
import type { createPosWorkspaceBaseActions } from '@/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions';

function getSaleKey(sale: Sale | null) {
  if (!sale) return '';
  return String(sale.docNo || sale.id || '');
}

interface SubmitOptions {
  fastCash?: boolean;
}

function extractCustomerId(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const candidate = payload as {
    id?: string | number;
    customer?: { id?: string | number } | null;
    data?: { id?: string | number; customer?: { id?: string | number } | null } | null;
  };
  const id = candidate.id ?? candidate.customer?.id ?? candidate.data?.id ?? candidate.data?.customer?.id ?? '';
  return id === '' || id == null ? '' : String(id);
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
    if (!name) return;
    try {
      const created = await params.quickCustomerMutation.mutateAsync({
        name,
        phone,
        address: '',
        balance: 0,
        type: 'cash',
        creditLimit: 0,
      });

      let createdCustomerId = extractCustomerId(created);
      if (!createdCustomerId) {
        const refreshedCustomers = await catalogApi.listCustomers();
        const matchedCustomer = [...refreshedCustomers].reverse().find((customer) => matchesCreatedCustomer(customer, name, phone));
        createdCustomerId = matchedCustomer ? String(matchedCustomer.id) : '';
      }

      params.setQuickCustomerName('');
      params.setQuickCustomerPhone('');
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
    if (params.hasCreditWithoutCustomer && !options.fastCash) {
      params.setSubmitMessage('اختر عميلًا أولًا لأن البيع الآجل يحتاج حساب عميل.');
      params.requestBarcodeFocus();
      return;
    }
    if (params.hasZeroPriceLine) {
      params.setSubmitMessage('يوجد صنف بسعر صفر. راجع التسعير قبل إتمام البيع.');
      params.requestBarcodeFocus();
      return;
    }

    const effectivePaymentType = options.fastCash ? 'cash' : params.paymentType;
    const effectivePaymentChannel = options.fastCash ? 'cash' : params.paymentChannel;
    const effectiveCashAmount = options.fastCash ? Number(params.totals.total || 0) : Number(params.cashAmount || 0);
    const effectiveCardAmount = options.fastCash ? 0 : Number(params.cardAmount || 0);
    const effectivePaidAmount = effectivePaymentType === 'credit'
      ? 0
      : Number((effectiveCashAmount + effectiveCardAmount).toFixed(2));
    const isUnderpaid = effectivePaymentType !== 'credit' && effectivePaidAmount < Number(params.totals.total || 0);

    if (isUnderpaid) {
      params.setSubmitMessage('المبلغ المدفوع أقل من المطلوب. أكمل المدفوع أو اختر بيعًا آجلًا.');
      params.requestBarcodeFocus();
      return;
    }

    if (options.fastCash) {
      params.setPaymentType('cash');
      params.setPaymentChannel('cash');
      params.setCashAmount(Number(params.totals.total || 0));
      params.setCardAmount(0);
    }

    params.setPostSaleSaleKey('');

    try {
      const createdSale = await params.createSale.mutateAsync({
        cart: params.cart,
        customerId: options.fastCash ? '' : params.customerId,
        paymentType: effectivePaymentType,
        paymentChannel: effectivePaymentChannel,
        discount: params.totals.discountValue,
        note: params.note,
        paidAmount: effectivePaidAmount,
        payments: effectivePaymentType === 'credit' ? [] : [
          ...(effectiveCashAmount > 0 ? [{ paymentChannel: 'cash' as const, amount: effectiveCashAmount }] : []),
          ...(effectiveCardAmount > 0 ? [{ paymentChannel: 'card' as const, amount: effectiveCardAmount }] : []),
        ],
        taxRate: params.totals.taxRate,
        pricesIncludeTax: params.totals.pricesIncludeTax,
        expectedTotal: Number(params.totals.total || 0),
        managerPin: params.discountApprovalSecret || undefined,
        branchId: params.branchId || (params.currentBranch?.id != null ? String(params.currentBranch.id) : null),
        locationId: params.locationId || (params.currentLocation?.id != null ? String(params.currentLocation.id) : null),
      });
      params.setLastSale(createdSale as Sale);
      const createdSaleKey = getSaleKey(createdSale as Sale);
      base.resetPosDraft();
      params.setPostSaleSaleKey(createdSaleKey);
      const postSalePrintMode = getPostSalePrintMode(params.settings || null);
      params.setSubmitMessage(`تم حفظ فاتورة البيع بنجاح${(createdSale as Sale)?.docNo ? `: ${(createdSale as Sale).docNo}` : ''}. ${getPostSalePrintHint(postSalePrintMode)}`);
      params.requestBarcodeFocus();
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر حفظ الفاتورة');
      params.requestBarcodeFocus();
    }
  }

  async function holdDraft() {
    if (!params.cart.length) {
      params.setSubmitMessage('لا يمكن تعليق فاتورة فارغة');
      params.requestBarcodeFocus();
      return;
    }
    try {
      await params.saveHeldDraftMutation.mutateAsync({
        customerId: params.customerId || null,
        paymentType: params.paymentType,
        discount: params.discount,
        note: params.note,
        search: params.search,
        priceType: params.priceType,
        branchId: params.branchId || (params.currentBranch?.id != null ? String(params.currentBranch.id) : null),
        locationId: params.locationId || (params.currentLocation?.id != null ? String(params.currentLocation.id) : null),
        cashAmount: params.cashAmount,
        cardAmount: params.cardAmount,
        managerPin: params.discountApprovalSecret || undefined,
        items: params.cart,
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
    params.setCart(draft.cart);
    params.setCustomerId(draft.customerId);
    params.setDiscount(Number(draft.discount || 0));
    params.setCashAmount(Number(draft.cashAmount || 0));
    params.setCardAmount(Number(draft.cardAmount || 0));
    params.setPaymentType(draft.paymentType);
    params.setPaymentChannel(draft.paymentChannel);
    params.setNote(draft.note);
    params.setSearch(draft.search);
    params.setPriceType(draft.priceType);
    params.setDiscountApprovalGranted(false);
    params.setDiscountApprovalSecret('');
    params.setBranchId(draft.branchId);
    params.setLocationId(draft.locationId);
    await params.deleteHeldDraftMutation.mutateAsync(draftId);
    params.setPostSaleSaleKey('');
    params.setSubmitMessage('تم استرجاع الفاتورة المعلقة');
    params.requestBarcodeFocus();
  }

  return {
    handleQuickCustomerSubmit,
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
