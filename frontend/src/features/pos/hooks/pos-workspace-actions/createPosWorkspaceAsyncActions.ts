import type { FormEvent } from 'react';
import type { Sale } from '@/types/domain';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';
import type { createPosWorkspaceBaseActions } from '@/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions';

export function createPosWorkspaceAsyncActions(
  params: PosWorkspaceActionParams,
  base: ReturnType<typeof createPosWorkspaceBaseActions>,
) {
  async function handleQuickCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = params.quickCustomerName.trim();
    if (!name) return;
    try {
      const created = await params.quickCustomerMutation.mutateAsync({
        name,
        phone: params.quickCustomerPhone.trim(),
        address: '',
        balance: 0,
        type: 'cash',
        creditLimit: 0,
      });
      params.setQuickCustomerName('');
      params.setQuickCustomerPhone('');
      params.setCustomerId(String((created as { id?: string | number } | null)?.id || ''));
      params.setSubmitMessage('تم إضافة العميل وتحديده داخل فاتورة الكاشير');
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر إضافة العميل');
    }
  }

  async function handleSubmit() {
    if (!params.hasOperationalSetup) return params.setSubmitMessage('أكمل تعريف المتجر ونقطة التشغيل قبل أول فاتورة.');
    if (!params.hasCatalogReady) return params.setSubmitMessage('أضف الأصناف أولًا قبل استخدام شاشة الكاشير.');
    if (params.requiresCashierShift && !params.ownOpenShift) return params.setSubmitMessage('افتح وردية كاشير أولًا قبل تسجيل فاتورة نقدية أو بطاقة.');
    if (params.hasCreditWithoutCustomer) return params.setSubmitMessage('اختر عميلًا أولًا لأن البيع الآجل يحتاج حساب عميل.');
    if (params.hasZeroPriceLine) return params.setSubmitMessage('يوجد صنف بسعر صفر. راجع التسعير قبل إتمام البيع.');
    if (params.hasUnderpaidSale) return params.setSubmitMessage('المبلغ المدفوع أقل من المطلوب. أكمل المدفوع أو اختر بيعًا آجلًا.');

    try {
      const createdSale = await params.createSale.mutateAsync({
        cart: params.cart,
        customerId: params.customerId,
        paymentType: params.paymentType,
        paymentChannel: params.paymentChannel,
        discount: params.totals.discountValue,
        note: params.note,
        payments: params.paymentType === 'credit' ? [] : [
          ...(Number(params.cashAmount || 0) > 0 ? [{ paymentChannel: 'cash' as const, amount: Number(params.cashAmount || 0) }] : []),
          ...(Number(params.cardAmount || 0) > 0 ? [{ paymentChannel: 'card' as const, amount: Number(params.cardAmount || 0) }] : []),
        ],
        taxRate: params.totals.taxRate,
        pricesIncludeTax: params.totals.pricesIncludeTax,
        branchId: params.branchId || (params.currentBranch?.id != null ? String(params.currentBranch.id) : null),
        locationId: params.locationId || (params.currentLocation?.id != null ? String(params.currentLocation.id) : null),
      });
      params.setLastSale(createdSale as Sale);
      base.resetPosDraft();
      params.setSubmitMessage(`تم حفظ فاتورة البيع بنجاح${(createdSale as Sale)?.docNo ? `: ${(createdSale as Sale).docNo}` : ''}`);
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر حفظ الفاتورة');
    }
  }

  async function holdDraft() {
    if (!params.cart.length) {
      params.setSubmitMessage('لا يمكن تعليق فاتورة فارغة');
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
        items: params.cart,
      });
      base.resetPosDraft();
      params.setSubmitMessage('تم تعليق الفاتورة الحالية ويمكن استرجاعها لاحقًا');
    } catch (error) {
      params.setSubmitMessage(error instanceof Error ? error.message : 'تعذر حفظ الفاتورة المعلقة');
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
    params.setBranchId(draft.branchId);
    params.setLocationId(draft.locationId);
    await params.deleteHeldDraftMutation.mutateAsync(draftId);
    params.setSubmitMessage('تم استرجاع الفاتورة المعلقة');
  }

  return {
    handleQuickCustomerSubmit,
    handleSubmit,
    holdDraft,
    recallDraft,
    deleteDraft: async (draftId: string) => {
      await params.deleteHeldDraftMutation.mutateAsync(draftId);
    },
    clearHeldDrafts: async () => {
      await params.clearHeldDraftsMutation.mutateAsync();
    },
  };
}
