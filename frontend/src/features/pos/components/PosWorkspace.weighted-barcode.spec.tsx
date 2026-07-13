import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PosWorkspace } from '@/features/pos/components/PosWorkspace';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { posApi } from '@/features/pos/api/pos.api';

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
      lookupProducts: vi.fn(),
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

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 0,
})) as any;

describe('PosWorkspace - Weighted Barcodes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
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
    vi.mocked(posApi.lookupProducts).mockImplementation(async (params = {}) => {
      console.log('posApi.lookupProducts called with params:', params);
      if (!params.barcode && !params.q) {
        return [{ id: 1, name: 'dummy catalog item', barcode: '123', sellPrice: 10, costPrice: 5 } as any];
      }
      if (params.barcode === '2000009015751' || params.q === '2000009015751') return [];
      
      if (params.barcode === '00009' || params.q === '9') {
        return [{
          id: 9,
          name: 'جبنه رومي 00009',
          barcode: '00009',
          styleCode: null,
          categoryName: 'Dairy',
          retailPrice: 100,
          wholesalePrice: 90,
          globalStock: 10,
          units: [],
        } as any];
      }
      return [];
    });

    renderWorkspace();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter')).toBeInTheDocument();
    });

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

    // Verify backend was called correctly with proper operational context
    // The component defaults to branch b1 (from our mock and settings)
    // Wait, the default is whatever usePosOperationalContext resolves. We mocked branches to have b1,b2. 
    // And settings has no currentBranchId so it picks branches[0] which is b1 ('single_location').
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

    vi.mocked(posApi.lookupProducts).mockImplementation(async (params = {}) => {
      console.log('posApi.lookupProducts called with params:', params);
      if (!params.barcode && !params.q) {
        return [{ id: 1, name: 'dummy catalog item', barcode: '123', sellPrice: 10, costPrice: 5 } as any];
      }
      if (params.barcode === '00002' || params.q === '2') {
        return [{
          id: 2,
          name: 'جبنه شيدر 00002',
          barcode: '00002',
          styleCode: null,
          categoryName: 'Dairy',
          retailPrice: 200,
          wholesalePrice: 180,
          globalStock: 5,
          units: [],
        } as any];
      }
      return [];
    });

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter')).toBeInTheDocument();
      expect(screen.queryByText('أضف صنفًا واحدًا على الأقل قبل بدء البيع.')).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter');
    
    // Simulate scanner
    fireEvent.change(searchInput, { target: { value: '2000002001355' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      const addedItemName = screen.getByText('جبنه شيدر 00002');
      expect(addedItemName).toBeInTheDocument();
    });

    const qtyInput = screen.getByLabelText('الكمية');
    expect(qtyInput).toHaveValue(0.135);

    expect(posApi.lookupProducts).toHaveBeenCalledWith(expect.objectContaining({
      barcode: '00002',
      branchId: 'b2',
      locationId: 'l2',
    }));
  });

  it('displays the correct error message if the weighted barcode product does not exist in backend', async () => {
    vi.mocked(posApi.lookupProducts).mockImplementation(async (params = {}) => {
      console.log('posApi.lookupProducts called with params:', params);
      if (!params.barcode && !params.q) {
        return [{ id: 1, name: 'dummy catalog item', barcode: '123', sellPrice: 10, costPrice: 5 } as any];
      }
      return []; // Return empty for everything else
    });

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter')).toBeInTheDocument();
      expect(screen.queryByText('أضف صنفًا واحدًا على الأقل قبل بدء البيع.')).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter');
    
    // Simulate scanner for a non-existent weighted product
    fireEvent.change(searchInput, { target: { value: '2000009015751' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('باركود ميزان: لم يتم العثور على كود الصنف 00009.')).toBeInTheDocument();
    });
  });
});
