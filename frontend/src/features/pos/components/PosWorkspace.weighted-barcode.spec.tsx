import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PosWorkspace } from '@/features/pos/components/PosWorkspace';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { posApi } from '@/features/pos/api/pos.api';
import { cashDrawerApi } from '@/lib/api/cash-drawer';

// Create a custom query client for testing
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

// Mock modules
vi.mock('@/features/pos/api/pos.api', () => {
  return {
    posApi: {
      lookupProducts: vi.fn().mockResolvedValue([{ id: '1', name: 'dummy catalog item', barcode: '123', retailPrice: 10, costPrice: 5, stock: 10, units: [] }]),
      customers: vi.fn().mockResolvedValue([]),
      settings: vi.fn().mockResolvedValue({
        weightedBarcodeEnabled: true,
        weightedBarcodePrefix: '20',
        weightedBarcodeProductCodeLength: 5,
        weightedBarcodeWeightDigits: 5,
        weightedBarcodeWeightDecimals: 3,
        allowNegativeStockSales: true,
        currentBranchId: 'b1',
      }),
      branches: vi.fn().mockResolvedValue([
        { id: 'b1', name: 'فرع 1', salesStockMode: 'single_location', allowExternalSalesStock: false, defaultStockLocationId: 'l1' },
        { id: 'b2', name: 'فرع 2', salesStockMode: 'all_operational_locations', allowExternalSalesStock: false, defaultStockLocationId: 'l2' },
      ]),
      locations: vi.fn().mockResolvedValue([
        { id: 'l1', name: 'مخزن 1', branchId: 'b1', locationType: 'internal_warehouse', isActive: true },
        { id: 'l2', name: 'مخزن 2', branchId: 'b2', locationType: 'internal_warehouse', isActive: true },
      ]),
      listHeldDrafts: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: {
    listPosProducts: vi.fn().mockResolvedValue([{ id: 1, name: 'dummy', barcode: '123' }]),
  },
}));

vi.mock('@/lib/api/cash-drawer', () => ({
  cashDrawerApi: {
    listPage: vi.fn().mockResolvedValue({
      rows: [{ id: 'shift1', openedById: 'u1', openedByName: 'Tester', docNo: 'SH-01' }],
      totalCount: 1,
    }),
  },
}));

// Mock Auth Store for shifting context
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: any) => {
    const state = { user: { id: 'u1', name: 'Tester', permissions: ['*'], roles: ['admin'] } };
    return typeof selector === 'function' ? selector(state) : state;
  },
  isAdminUser: () => true,
}));

vi.mock('@/lib/http', () => ({
  http: vi.fn(),
  ApiError: class ApiError extends Error {}
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 0,
})) as any;

describe('PosWorkspace - Weighted Barcodes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    vi.mocked(posApi.customers).mockResolvedValue([]);
    vi.mocked(posApi.listHeldDrafts).mockResolvedValue([]);
    vi.mocked(cashDrawerApi.listPage).mockResolvedValue({
      rows: [{ id: 'shift1', openedById: 'u1', openedByName: 'Tester', docNo: 'SH-01', status: 'open' }],
      totalCount: 1,
    } as any);
    vi.mocked(posApi.branches).mockResolvedValue([
      { id: 'b1', name: 'فرع 1', salesStockMode: 'single_location', allowExternalSalesStock: false, defaultStockLocationId: 'l1' },
      { id: 'b2', name: 'فرع 2', salesStockMode: 'all_operational_locations', allowExternalSalesStock: false, defaultStockLocationId: 'l2' },
    ] as any);
    vi.mocked(posApi.locations).mockResolvedValue([
      { id: 'l1', name: 'مخزن 1', branchId: 'b1', locationType: 'internal_warehouse', isActive: true },
      { id: 'l2', name: 'مخزن 2', branchId: 'b2', locationType: 'internal_warehouse', isActive: true },
    ] as any);
    vi.mocked(posApi.settings).mockResolvedValue({
      weightedBarcodeEnabled: true,
      weightedBarcodePrefix: '20',
      weightedBarcodeProductCodeLength: 5,
      weightedBarcodeWeightDigits: 5,
      weightedBarcodeWeightDecimals: 3,
      allowNegativeStockSales: true,
      currentBranchId: 'b1',
    } as any);
    vi.mocked(posApi.lookupProducts).mockResolvedValue([
      { id: '1', name: 'dummy catalog item', barcode: '123', retailPrice: 10, costPrice: 5, stock: 10, units: [] } as any,
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  const renderWorkspace = () => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PosWorkspace />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('adds product 00009 with qty 1.575 upon scanning 2000009015751 from an empty cache in single_location', async () => {
    // Setup API mock to return product 00009 ONLY when looking up '00009'
    vi.mocked(posApi.lookupProducts).mockImplementation(async (params: any = {}) => {
      if (params.barcode === '2000009015751' || params.q === '2000009015751') return [];
      
      if (params.barcode === '00009' || params.q === '9' || params.barcode === '9' || params.q === '00009') {
        return [{
          id: '9',
          name: 'جبنه رومي 00009',
          barcode: '00009',
          styleCode: null,
          categoryName: 'Dairy',
          retailPrice: 100,
          wholesalePrice: 90,
          globalStock: 10,
          stock: 10,
          units: [],
        } as any];
      }
      return [{ id: '1', name: 'صنف تجريبي 1', barcode: '123', retailPrice: 10, costPrice: 5, stock: 10, units: [] } as any];
    });

    renderWorkspace();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter')).toBeInTheDocument();
      expect(screen.queryByText('أضف صنفًا واحدًا على الأقل قبل بدء البيع.')).not.toBeInTheDocument();
    });
    
    // Give settingsQuery a tiny moment to resolve
    await new Promise(r => setTimeout(r, 50));

    const searchInput = screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter');
    
    // Simulate scanner
    fireEvent.change(searchInput, { target: { value: '2000009015751' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    // Wait for the item to be added to cart
    await waitFor(() => {
      const addedItemName = screen.getByText('جبنه رومي 00009');
      expect(addedItemName).toBeInTheDocument();
    });

    // Check quantity is 1.575
    const qtyInput = screen.getByLabelText('الكمية');
    expect(qtyInput).toHaveValue(1.575);

    expect(posApi.lookupProducts).toHaveBeenCalledWith(expect.objectContaining({
      barcode: '00009',
      branchId: 'b1',
      locationId: 'l1',
    }));
  });

  it('adds product 00002 with qty 0.135 upon scanning 2000002001355 in all_operational_locations', async () => {
    // Override settings to use branch b2 (all_operational_locations)
    vi.mocked(posApi.settings).mockResolvedValueOnce({
      weightedBarcodeEnabled: true,
      weightedBarcodePrefix: '20',
      weightedBarcodeProductCodeLength: 5,
      weightedBarcodeWeightDigits: 5,
      weightedBarcodeWeightDecimals: 3,
      allowNegativeStockSales: true,
      currentBranchId: 'b2'
    } as any);

    vi.mocked(posApi.lookupProducts).mockImplementation(async (params: any = {}) => {
      if (params.barcode === '2000002001355' || params.q === '2000002001355') return [];
      if (params.barcode === '00002' || params.q === '2' || params.barcode === '2' || params.q === '00002') {
        return [{
          id: '2',
          name: 'جبنه شيدر 00002',
          barcode: '00002',
          styleCode: null,
          categoryName: 'Dairy',
          retailPrice: 200,
          wholesalePrice: 180,
          globalStock: 5,
          stock: 5,
          units: [],
        } as any];
      }
      return [{ id: '1', name: 'صنف تجريبي 1', barcode: '123', retailPrice: 10, costPrice: 5, stock: 10, units: [] } as any];
    });

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter')).toBeInTheDocument();
      expect(screen.queryByText('أضف صنفًا واحدًا على الأقل قبل بدء البيع.')).not.toBeInTheDocument();
    });
    await new Promise(r => setTimeout(r, 50));

    const searchInput = screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter');
    
    // Simulate scanner
    fireEvent.change(searchInput, { target: { value: '2000002001355' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      const addedItemName = screen.getByText('جبنه شيدر 00002');
      expect(addedItemName).toBeInTheDocument();
    });

    const qtyInputs = screen.getAllByLabelText('الكمية');
    expect(qtyInputs.some((input) => (input as HTMLInputElement).value === '0.135')).toBe(true);

    expect(posApi.lookupProducts).toHaveBeenCalledWith(expect.objectContaining({
      barcode: '00002',
      branchId: 'b2',
    }));
  });

  it('displays the correct error message if the weighted barcode product does not exist in backend', async () => {
    vi.mocked(posApi.lookupProducts).mockImplementation(async (params: any = {}) => {
      if (params.barcode === '00009' || params.q === '00009' || params.q === '9' || params.barcode === '2000009015751') {
        return [];
      }
      return [{ id: '1', name: 'صنف تجريبي 1', barcode: '123', retailPrice: 10, costPrice: 5, stock: 10, units: [] } as any];
    });

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter')).toBeInTheDocument();
      expect(screen.queryByText('أضف صنفًا واحدًا على الأقل قبل بدء البيع.')).not.toBeInTheDocument();
    });
    await new Promise(r => setTimeout(r, 50));

    const searchInput = screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter');
    
    // Simulate scanner for a non-existent weighted product
    fireEvent.change(searchInput, { target: { value: '2000009015751' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('باركود ميزان: لم يتم العثور على كود الصنف 00009.')).toBeInTheDocument();
    });
  });
});
