import { describe, expect, it, vi } from 'vitest';
import { createPosWorkspaceBaseActions } from '@/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';

const product: Product = {
  id: 'p1',
  name: 'Tea',
  categoryId: '',
  supplierId: '',
  costPrice: 5,
  retailPrice: 10,
  wholesalePrice: 8,
  stock: 10,
  minStock: 0,
  notes: '',
  barcode: '123',
  units: [{ id: 'u1', name: 'قطعة', multiplier: 1, barcode: '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
};

function makeParams(overrides: Partial<PosWorkspaceActionParams> = {}): PosWorkspaceActionParams {
  return {
    cart: [],
    setCart: vi.fn(),
    selectedLineKey: '',
    setSelectedLineKey: vi.fn(),
    customerId: '',
    setCustomerId: vi.fn(),
    discount: 0,
    setDiscount: vi.fn(),
    discountApprovalGranted: false,
    setDiscountApprovalGranted: vi.fn(),
    discountApprovalSecret: '',
    setDiscountApprovalSecret: vi.fn(),
    cashAmount: 0,
    setCashAmount: vi.fn(),
    cardAmount: 0,
    setCardAmount: vi.fn(),
    paymentType: 'cash',
    setPaymentType: vi.fn(),
    paymentChannel: 'cash',
    setPaymentChannel: vi.fn(),
    note: '',
    setNote: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    priceType: 'retail',
    setPriceType: vi.fn(),
    branchId: '',
    setBranchId: vi.fn(),
    locationId: '',
    setLocationId: vi.fn(),
    quickAddCode: '',
    setQuickAddCode: vi.fn(),
    quickCustomerName: '',
    setQuickCustomerName: vi.fn(),
    quickCustomerPhone: '',
    setQuickCustomerPhone: vi.fn(),
    scannerMessage: '',
    setScannerMessage: vi.fn(),
    setSubmitMessage: vi.fn(),
    setLastAddedLineKey: vi.fn(),
    setRecentProductIds: vi.fn(),
    setLastSale: vi.fn(),
    postSaleSaleKey: '',
    setPostSaleSaleKey: vi.fn(),
    requestBarcodeFocus: vi.fn(),
    lastSale: null,
    products: [product],
    branches: [],
    locations: [],
    currentBranch: null,
    currentLocation: null,
    settings: {},
    totals: { discountValue: 0, taxRate: 0, pricesIncludeTax: false, total: 0 },
    paidAmount: 0,
    hasOperationalSetup: true,
    hasCatalogReady: true,
    requiresCashierShift: false,
    ownOpenShift: null,
    hasCreditWithoutCustomer: false,
    hasZeroPriceLine: false,
    hasUnderpaidSale: false,
    heldDrafts: [],
    quickCustomerMutation: { mutateAsync: vi.fn() },
    createSale: { mutateAsync: vi.fn() },
    saveHeldDraftMutation: { mutateAsync: vi.fn() },
    deleteHeldDraftMutation: { mutateAsync: vi.fn() },
    clearHeldDraftsMutation: { mutateAsync: vi.fn() },
    discountAuthorizationMutation: { mutateAsync: vi.fn() },
    ...overrides,
  } as PosWorkspaceActionParams;
}

describe('createPosWorkspaceBaseActions', () => {
  it('adds products against the latest cart state instead of reintroducing stale deleted lines', () => {
    const staleDeletedCart: PosItem[] = [{
      lineKey: 'old::u1::retail',
      productId: 'old',
      name: 'Old',
      itemCode: 'old',
      unitId: 'u1',
      unitName: 'قطعة',
      unitMultiplier: 1,
      price: 4,
      qty: 1,
      stockLimit: 10,
      currentStock: 10,
      minStock: 0,
      priceType: 'retail',
    }];
    const currentCart: PosItem[] = [];
    const setCart = vi.fn((updater: PosItem[] | ((cart: PosItem[]) => PosItem[])) => (
      typeof updater === 'function' ? updater(currentCart) : updater
    ));

    createPosWorkspaceBaseActions(makeParams({ cart: staleDeletedCart, setCart })).handleAddProduct(product);

    expect(setCart).toHaveBeenCalledWith(expect.any(Function));
    expect(setCart.mock.results[0]?.value.map((item: PosItem) => item.productId)).toEqual(['p1']);
  });
});
