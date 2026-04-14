import { useQueryClient } from '@tanstack/react-query';
import { usePosCatalog } from '@/features/pos/hooks/usePosCatalog';
import { usePosSaleMutation } from '@/features/pos/hooks/usePosSaleMutation';
import { createPosWorkspaceActions } from '@/features/pos/hooks/usePosWorkspaceActions';
import { usePosWorkspaceDerived } from '@/features/pos/hooks/usePosWorkspaceDerived';
import { usePosWorkspaceEffects } from '@/features/pos/hooks/usePosWorkspaceEffects';
import { usePosWorkspaceMutations } from '@/features/pos/hooks/usePosWorkspaceMutations';
import { usePosWorkspaceState } from '@/features/pos/hooks/usePosWorkspaceState';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';
import { useAuthStore } from '@/stores/auth-store';

export type PaymentType = 'cash' | 'credit';
export type PaymentChannel = 'cash' | 'card' | 'credit' | 'mixed';
export type PosProductFilter = 'all' | 'offers' | 'priced' | 'low' | 'recent';

export interface PosDraftSnapshot {
  cart: PosItem[];
  customerId: string;
  discount: number;
  paidAmount: number;
  cashAmount: number;
  cardAmount: number;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  note: string;
  search: string;
  priceType: PosPriceType;
  branchId: string;
  locationId: string;
}

export interface HeldPosDraft extends PosDraftSnapshot {
  id: string;
  savedAt: string;
}

function getSaleKey(sale: { docNo?: string | number; id?: string | number } | null) {
  return String(sale?.docNo || sale?.id || '');
}

export function usePosWorkspace() {
  const state = usePosWorkspaceState();
  const paidAmount = state.paymentType === 'credit' ? 0 : Number((Number(state.cashAmount || 0) + Number(state.cardAmount || 0)).toFixed(2));
  const { saleProducts, customersQuery, settingsQuery, branchesQuery, locationsQuery, productsQuery } = usePosCatalog(state.search, state.locationId);
  const createSale = usePosSaleMutation();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((entry) => entry.user);
  const mutations = usePosWorkspaceMutations({ queryClient, storedHeld: state.persistedState.heldDrafts });

  const heldDrafts = mutations.heldDraftsQuery.data || [];
  const openShiftRows = mutations.openShiftsQuery.data?.rows || [];

  usePosWorkspaceEffects({
    cart: state.cart,
    customerId: state.customerId,
    discount: state.discount,
    paidAmount,
    cashAmount: state.cashAmount,
    setCashAmount: state.setCashAmount,
    cardAmount: state.cardAmount,
    setCardAmount: state.setCardAmount,
    paymentType: state.paymentType,
    paymentChannel: state.paymentChannel,
    setPaymentChannel: state.setPaymentChannel,
    note: state.note,
    search: state.search,
    priceType: state.priceType,
    branchId: state.branchId,
    setBranchId: state.setBranchId,
    locationId: state.locationId,
    setLocationId: state.setLocationId,
    products: productsQuery.data || [],
    setCart: state.setCart,
    setSubmitMessage: state.setSubmitMessage,
    recentProductIds: state.recentProductIds,
    lastSale: state.lastSale,
    lastAddedLineKey: state.lastAddedLineKey,
    setLastAddedLineKey: state.setLastAddedLineKey,
    selectedLineKey: state.selectedLineKey,
    setSelectedLineKey: state.setSelectedLineKey,
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || [],
  });

  const derived = usePosWorkspaceDerived({
    saleProducts,
    products: productsQuery.data || [],
    customers: customersQuery.data || [],
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || [],
    openShiftRows,
    authUserId: authUser?.id,
    authPermissions: authUser?.permissions || [],
    settings: settingsQuery.data || null,
    heldDrafts,
    recentProductIds: state.recentProductIds,
    productFilter: state.productFilter,
    cart: state.cart,
    discount: state.discount,
    paidAmount,
    paymentType: state.paymentType,
    paymentChannel: state.paymentChannel,
    customerId: state.customerId,
    branchId: state.branchId,
    locationId: state.locationId,
    lastSale: state.lastSale,
  });

  const actions = createPosWorkspaceActions({
    cart: state.cart,
    setCart: state.setCart,
    selectedLineKey: state.selectedLineKey,
    setSelectedLineKey: state.setSelectedLineKey,
    customerId: state.customerId,
    setCustomerId: state.setCustomerId,
    discount: state.discount,
    setDiscount: state.setDiscount,
    cashAmount: state.cashAmount,
    setCashAmount: state.setCashAmount,
    cardAmount: state.cardAmount,
    setCardAmount: state.setCardAmount,
    paymentType: state.paymentType,
    setPaymentType: state.setPaymentType,
    paymentChannel: state.paymentChannel,
    setPaymentChannel: state.setPaymentChannel,
    note: state.note,
    setNote: state.setNote,
    search: state.search,
    setSearch: state.setSearch,
    priceType: state.priceType,
    setPriceType: state.setPriceType,
    branchId: state.branchId,
    setBranchId: state.setBranchId,
    locationId: state.locationId,
    setLocationId: state.setLocationId,
    quickAddCode: state.quickAddCode,
    setQuickAddCode: state.setQuickAddCode,
    quickCustomerName: state.quickCustomerName,
    setQuickCustomerName: state.setQuickCustomerName,
    quickCustomerPhone: state.quickCustomerPhone,
    setQuickCustomerPhone: state.setQuickCustomerPhone,
    scannerMessage: state.scannerMessage,
    setScannerMessage: state.setScannerMessage,
    setSubmitMessage: state.setSubmitMessage,
    setLastAddedLineKey: state.setLastAddedLineKey,
    setRecentProductIds: state.setRecentProductIds,
    setLastSale: state.setLastSale,
    postSaleSaleKey: state.postSaleSaleKey,
    setPostSaleSaleKey: state.setPostSaleSaleKey,
    requestBarcodeFocus: state.requestBarcodeFocus,
    lastSale: state.lastSale,
    products: productsQuery.data || [],
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || [],
    currentBranch: derived.currentBranch,
    currentLocation: derived.currentLocation,
    settings: settingsQuery.data || null,
    totals: derived.totals,
    paidAmount,
    hasOperationalSetup: derived.hasOperationalSetup,
    hasCatalogReady: derived.hasCatalogReady,
    requiresCashierShift: derived.requiresCashierShift,
    ownOpenShift: derived.ownOpenShift,
    hasCreditWithoutCustomer: derived.hasCreditWithoutCustomer,
    hasZeroPriceLine: derived.hasZeroPriceLine,
    hasUnderpaidSale: derived.hasUnderpaidSale,
    heldDrafts,
    quickCustomerMutation: mutations.quickCustomerMutation,
    createSale,
    saveHeldDraftMutation: mutations.saveHeldDraftMutation,
    deleteHeldDraftMutation: mutations.deleteHeldDraftMutation,
    clearHeldDraftsMutation: mutations.clearHeldDraftsMutation,
  });

  async function refetchCatalogs() {
    await Promise.all([
      productsQuery.refetch(),
      customersQuery.refetch(),
      branchesQuery.refetch(),
      locationsQuery.refetch(),
      settingsQuery.refetch(),
      mutations.openShiftsQuery.refetch(),
    ]);
  }

  return {
    search: state.search,
    setSearch: state.setSearch,
    customerId: state.customerId,
    setCustomerId: state.setCustomerId,
    discount: state.discount,
    setDiscount: state.setDiscount,
    paidAmount,
    cashAmount: state.cashAmount,
    setCashAmount: state.setCashAmount,
    cardAmount: state.cardAmount,
    setCardAmount: state.setCardAmount,
    paymentType: state.paymentType,
    setPaymentType: state.setPaymentType,
    paymentChannel: state.paymentChannel,
    setPaymentChannel: state.setPaymentChannel,
    note: state.note,
    setNote: state.setNote,
    cart: state.cart,
    setCart: state.setCart,
    selectedLineKey: state.selectedLineKey,
    setSelectedLineKey: state.setSelectedLineKey,
    priceType: state.priceType,
    branchId: state.branchId,
    setBranchId: state.setBranchId,
    locationId: state.locationId,
    setLocationId: state.setLocationId,
    productFilter: state.productFilter,
    setProductFilter: state.setProductFilter,
    submitMessage: state.submitMessage,
    canShowLastSaleActions: Boolean(state.postSaleSaleKey && state.lastSale && getSaleKey(state.lastSale) === state.postSaleSaleKey && state.submitMessage && !createSale.isError),
    setSubmitMessage: state.setSubmitMessage,
    heldDrafts,
    recentProductIds: state.recentProductIds,
    quickCustomerName: state.quickCustomerName,
    setQuickCustomerName: state.setQuickCustomerName,
    quickCustomerPhone: state.quickCustomerPhone,
    setQuickCustomerPhone: state.setQuickCustomerPhone,
    lastSale: state.lastSale,
    quickAddCode: state.quickAddCode,
    setQuickAddCode: state.setQuickAddCode,
    scannerMessage: state.scannerMessage,
    setScannerMessage: state.setScannerMessage,
    lastAddedLineKey: state.lastAddedLineKey,
    barcodeFocusTick: state.barcodeFocusTick,
    customersQuery,
    settingsQuery,
    branchesQuery,
    locationsQuery,
    productsQuery,
    saleProducts,
    createSale,
    quickCustomerMutation: mutations.quickCustomerMutation,
    refetchCatalogs,
    ...derived,
    ...actions,
  };
}
