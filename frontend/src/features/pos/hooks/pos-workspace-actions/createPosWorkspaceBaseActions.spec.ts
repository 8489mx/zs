import { describe, expect, it, vi } from 'vitest';
import { createPosWorkspaceBaseActions } from '@/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';

vi.mock('@/lib/http', () => ({
  http: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

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
      costPrice: 2,
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

  describe('quantity chunks', () => {
    it('removes the last chunk and then removes the item entirely when the last chunk is removed', () => {
      const weightedItem: PosItem = {
        lineKey: 'p1::u1::retail',
        productId: 'p1',
        name: 'Tea',
        unitId: 'u1',
        unitName: 'كجم',
        unitMultiplier: 1,
        price: 10,
        costPrice: 5,
        qty: 0.385,
        stockLimit: 10,
        currentStock: 10,
        minStock: 0,
        priceType: 'retail',
        isWeighted: true,
        quantityChunks: [0.135, 0.250],
      };
      
      const setCart = vi.fn();
      const actions = createPosWorkspaceBaseActions(makeParams({ cart: [weightedItem], setCart }));
      
      // First decrement removes 0.250, leaving 0.135
      actions.changeLineQtyByDelta('p1::u1::retail', -1);
      const updatedCart1 = setCart.mock.calls[0][0];
      expect(updatedCart1[0].qty).toBe(0.135);
      expect(updatedCart1[0].quantityChunks).toEqual([0.135]);
      
      // Second decrement removes 0.135, leaving empty array -> line should be removed
      const actions2 = createPosWorkspaceBaseActions(makeParams({ cart: updatedCart1, setCart }));
      actions2.changeLineQtyByDelta('p1::u1::retail', -1);
      
      // Inside changeLineQtyByDelta, removeItem calls setCart via a function, so we simulate it
      const updatedCart2Fn = setCart.mock.calls[1][0];
      const updatedCart2 = updatedCart2Fn(updatedCart1);
      expect(updatedCart2.length).toBe(0); // Line removed completely
    });

    it('repeats the last chunk when incrementing a weighted barcode item', () => {
      const weightedItem: PosItem = {
        lineKey: 'p1::u1::retail',
        productId: 'p1',
        name: 'Tea',
        unitId: 'u1',
        unitName: 'كجم',
        unitMultiplier: 1,
        price: 10,
        costPrice: 5,
        qty: 0.135,
        stockLimit: 10,
        currentStock: 10,
        minStock: 0,
        priceType: 'retail',
        isWeighted: true,
        quantityChunks: [0.135],
      };
      
      const setCart = vi.fn();
      const actions = createPosWorkspaceBaseActions(makeParams({ cart: [weightedItem], setCart }));
      
      actions.changeLineQtyByDelta('p1::u1::retail', 1);
      const updatedCart = setCart.mock.calls[0][0];
      expect(updatedCart[0].qty).toBe(0.270);
      expect(updatedCart[0].quantityChunks).toEqual([0.135, 0.135]);
    });

    it('rejects increment if stock limit is exceeded', () => {
      const weightedItem: PosItem = {
        lineKey: 'p1::u1::retail',
        productId: 'p1',
        name: 'Tea',
        unitId: 'u1',
        unitName: 'كجم',
        unitMultiplier: 1,
        price: 10,
        costPrice: 5,
        qty: 0.135,
        stockLimit: 0.200, // limited stock!
        currentStock: 0.200,
        minStock: 0,
        priceType: 'retail',
        isWeighted: true,
        quantityChunks: [0.135],
      };
      
      const setSubmitMessage = vi.fn();
      const actions = createPosWorkspaceBaseActions(makeParams({ cart: [weightedItem], setSubmitMessage }));
      
      const result = actions.changeLineQtyByDelta('p1::u1::retail', 1);
      expect(result).toBe(false);
      expect(setSubmitMessage).toHaveBeenCalledWith('الكمية المطلوبة أكبر من المخزون المتاح.');
    });

    it('uses a step of 0.001 for manual weighted items (isWeighted = true but no chunks)', () => {
      const manualWeightedItem: PosItem = {
        lineKey: 'p1::u1::retail',
        productId: 'p1',
        name: 'Tea',
        unitId: 'u1',
        unitName: 'كجم',
        unitMultiplier: 1,
        price: 10,
        costPrice: 5,
        qty: 0.270,
        stockLimit: 10,
        currentStock: 10,
        minStock: 0,
        priceType: 'retail',
        isWeighted: true, // marked as weighted but no chunks
      };
      
      const setCart = vi.fn();
      const actions = createPosWorkspaceBaseActions(makeParams({ cart: [manualWeightedItem], setCart }));
      
      actions.changeLineQtyByDelta('p1::u1::retail', 1);
      const updatedCart = setCart.mock.calls[0][0];
      expect(updatedCart[0].qty).toBe(0.271);
      
      actions.changeLineQtyByDelta('p1::u1::retail', -1);
      const updatedCart2 = setCart.mock.calls[1][0];
      expect(updatedCart2[0].qty).toBe(0.269);
    });

    it('clears quantityChunks when the user manually sets a different quantity', () => {
      const weightedItem: PosItem = {
        lineKey: 'p1::u1::retail',
        productId: 'p1',
        name: 'Tea',
        unitId: 'u1',
        unitName: 'كجم',
        unitMultiplier: 1,
        price: 10,
        costPrice: 5,
        qty: 0.270,
        stockLimit: 10,
        currentStock: 10,
        minStock: 0,
        priceType: 'retail',
        isWeighted: true,
        quantityChunks: [0.135, 0.135],
      };
      
      const setCart = vi.fn();
      const actions = createPosWorkspaceBaseActions(makeParams({ cart: [weightedItem], setCart, selectedLineKey: 'p1::u1::retail' }));
      
      // Mock window.prompt
      vi.stubGlobal('prompt', () => '0.200');
      
      actions.editSelectedQty();
      
      const updatedCart = setCart.mock.calls[0][0];
      expect(updatedCart[0].qty).toBe(0.200);
      expect(updatedCart[0].quantityChunks).toBeUndefined(); // Cleared because the user manually edited it
      
      vi.unstubAllGlobals();
    });

    it('works correctly for normal (unweighted) items using steps of 1', () => {
      const normalItem: PosItem = {
        lineKey: 'p1::u1::retail',
        productId: 'p1',
        name: 'Tea',
        unitId: 'u1',
        unitName: 'قطعة',
        unitMultiplier: 1,
        price: 10,
        costPrice: 5,
        qty: 1,
        stockLimit: 10,
        currentStock: 10,
        minStock: 0,
        priceType: 'retail',
        isWeighted: false,
      };
      
      const setCart = vi.fn();
      const actions = createPosWorkspaceBaseActions(makeParams({ cart: [normalItem], setCart }));
      
      actions.changeLineQtyByDelta('p1::u1::retail', 1);
      const updatedCart = setCart.mock.calls[0][0];
      expect(updatedCart[0].qty).toBe(2);
      
      actions.changeLineQtyByDelta('p1::u1::retail', -1);
      const updatedCart2 = setCart.mock.calls[1][0];
      
      // changeLineQtyByDelta uses `Math.max(minQty, nextQty)` where minQty for normal is 1. 
      // So -1 from 1 would become Math.max(1, 0) = 1.
      expect(updatedCart2[0].qty).toBe(1);
    });
  });
});
