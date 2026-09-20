import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// `Field` (src/shared/ui/field.tsx) renders its caption as a plain <span> inside a <div>,
// not as a <label>, so getByLabelText cannot associate it with the input. Until that is
// fixed (open item O30) the tests locate the control through its field container.
function fieldInput(caption: string | RegExp): HTMLInputElement {
  const matches = (text: string) => (typeof caption === 'string' ? text === caption : caption.test(text));
  const field = Array.from(document.querySelectorAll('.field')).find(
    (node) => matches(node.querySelector('span')?.textContent?.trim() || ''),
  );
  if (!field) throw new Error(`Field not found: ${caption}`);
  const input = field.querySelector('input');
  if (!input) throw new Error(`Field has no input: ${caption}`);
  return input as HTMLInputElement;
}

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

  it('defaults the offer start date to the local date and resets back to it', () => {
    renderDialog();

    const startDate = fieldInput('تاريخ البداية');
    expect(startDate).toHaveValue('2026-04-27');

    fireEvent.change(startDate, { target: { value: '2026-04-30' } });
    expect(startDate).toHaveValue('2026-04-30');

    fireEvent.click(screen.getByRole('button', { name: 'إعادة التهيئة' }));
    expect(startDate).toHaveValue('2026-04-27');
  });

  it('allows saving an open-ended offer without forcing an end date', async () => {
    renderDialog();

    const startDate = fieldInput('تاريخ البداية');
    expect(startDate).toHaveValue('2026-04-27');

    vi.useRealTimers();

    fireEvent.change(fieldInput(/نسبة الخصم|قيمة الخصم/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /إضافة العرض/ }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const payload = updateMock.mock.calls[0][1];
    // buildUpdatePayload omits a falsy `to` entirely, and the backend replaces the whole
    // offers set per product (catalog-product.service.ts:1412 deletes then re-inserts),
    // so an absent `to` is exactly "no end date" — there is no stale value to merge over.
    expect(payload.offers[0]).toMatchObject({ from: '2026-04-27' });
    expect(payload.offers[0].to).toBeUndefined();
  });
});
