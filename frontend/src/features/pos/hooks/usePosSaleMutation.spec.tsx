import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usePosSaleMutation } from '@/features/pos/hooks/usePosSaleMutation';
import type { CreatePosSaleInput } from '@/features/pos/contracts';
import { createTestQueryClient } from '@/test/test-query-client';

const { createSaleMock, invalidateSalesDomainMock } = vi.hoisted(() => ({
  createSaleMock: vi.fn(),
  invalidateSalesDomainMock: vi.fn(),
}));

vi.mock('@/features/pos/api/pos.api', () => ({
  posApi: {
    createSale: createSaleMock,
  },
}));

vi.mock('@/app/query-invalidation', () => ({
  invalidateSalesDomain: invalidateSalesDomainMock,
}));

function createWrapper() {
  const queryClient = createTestQueryClient();

  return {
    queryClient,
    Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

function createSaleInput(): CreatePosSaleInput {
  return {
    cart: [{
      lineKey: 'line-1',
      productId: 'product-1',
      name: 'Product 1',
      unitId: 'unit-1',
      unitName: 'piece',
      unitMultiplier: 1,
      price: 50,
      costPrice: 40,
      qty: 1,
      stockLimit: 10,
      currentStock: 10,
      minStock: 1,
      priceType: 'retail',
    }],
    customerId: '',
    paymentType: 'cash',
    paymentChannel: 'cash',
    discount: 0,
    note: '',
    paidAmount: 50,
    tenderedAmount: 50,
    payments: [{ paymentChannel: 'cash', amount: 50 }],
    taxRate: 0,
    pricesIncludeTax: false,
    expectedTotal: 50,
    branchId: 'branch-1',
    locationId: 'location-1',
  };
}

describe('usePosSaleMutation', () => {
  it('uses the shared sales invalidation flow with dashboard freshness on success', async () => {
    createSaleMock.mockResolvedValueOnce({ id: 'sale-42' });
    invalidateSalesDomainMock.mockResolvedValueOnce(undefined);

    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => usePosSaleMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createSaleInput());
    });

    expect(invalidateSalesDomainMock).toHaveBeenCalledWith(queryClient, {
      saleId: 'sale-42',
      includeDashboard: true,
    });
  });
});
