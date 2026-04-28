import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductOfferDialog } from './ProductOfferDialog';
import { createTestQueryClient } from '@/test/test-query-client';
import type { Product } from '@/types/domain';

const { updateMock, invalidateCatalogDomainMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  invalidateCatalogDomainMock: vi.fn(),
}));

vi.mock('@/features/products/api/products.api', () => ({
  productsApi: {
    update: updateMock,
  },
}));

vi.mock('@/app/query-invalidation', () => ({
  invalidateCatalogDomain: invalidateCatalogDomainMock,
}));

const product: Product = {
  id: 'p1',
  name: 'قميص',
  barcode: '111',
  categoryId: '',
  supplierId: '',
  costPrice: 50,
  retailPrice: 100,
  wholesalePrice: 90,
  stock: 10,
  minStock: 1,
  notes: '',
  units: [],
  offers: [],
};

function renderDialog() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductOfferDialog open product={product} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ProductOfferDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 27, 10, 0, 0));
    updateMock.mockResolvedValue({ ...product });
    invalidateCatalogDomainMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('defaults the offer start date to the local date and resets back to it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    const startDate = screen.getByLabelText('تاريخ البداية');
    expect(startDate).toHaveValue('2026-04-27');

    await user.clear(startDate);
    await user.type(startDate, '2026-04-30');
    expect(startDate).toHaveValue('2026-04-30');

    await user.click(screen.getByRole('button', { name: 'إعادة التهيئة' }));
    expect(startDate).toHaveValue('2026-04-27');
  });

  it('allows saving an open-ended offer without forcing an end date', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(screen.getByLabelText('قيمة العرض'), '10');
    await user.click(screen.getByRole('button', { name: 'إضافة العرض' }));

    expect(updateMock).toHaveBeenCalled();
    const payload = updateMock.mock.calls[0][1];
    expect(payload.offers[0]).toMatchObject({ from: '2026-04-27', to: null });
  });
});
