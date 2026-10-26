import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PosCartItemsList } from './PosCartItemsList';
import type { PosItem } from '@/features/pos/types/pos.types';

const mockSettings: { data: any } = {
  data: {},
};

vi.mock('@/shared/hooks/use-catalog-queries', () => ({
  useSettingsQuery: () => mockSettings,
}));

const cart: PosItem[] = [
  { lineKey: 'line-1', productId: 'p1', name: 'قميص', qty: 1, price: 100, costPrice: 80, unitId: 'u1', unitName: 'قطعة', unitMultiplier: 1, stockLimit: 10, currentStock: 10, minStock: 1, priceType: 'retail' },
  { lineKey: 'line-2', productId: 'p2', name: 'حذاء', qty: 2, price: 150, costPrice: 120, unitId: 'u1', unitName: 'قطعة', unitMultiplier: 1, stockLimit: 10, currentStock: 10, minStock: 1, priceType: 'retail' },
];

describe('PosCartItemsList', () => {
  it('marks cart rows with alternating visual classes', () => {
    render(
      <PosCartItemsList
        cart={cart}
        lastAddedLineKey=""
        selectedLineKey=""
        onQtyChange={vi.fn()}
        onRemoveItem={vi.fn()}
        onSelectLine={vi.fn()}
        onItemNoteChange={vi.fn()}
      />,
    );

    const rows = screen.getAllByText(/قميص|حذاء/).map((entry) => entry.closest('.pos-cart-grid-row'));
    expect(rows[0]).toHaveClass('pos-cart-row-odd');
    expect(rows[1]).toHaveClass('pos-cart-row-even');
  });

  it('hides per-item notes button in retail / perfumes mode', () => {
    mockSettings.data = {
      businessIndustry: 'perfumes',
      clothingModuleEnabled: true,
      restaurantModuleEnabled: false,
    };

    render(
      <PosCartItemsList
        cart={cart}
        lastAddedLineKey=""
        selectedLineKey=""
        onQtyChange={vi.fn()}
        onRemoveItem={vi.fn()}
        onSelectLine={vi.fn()}
        onItemNoteChange={vi.fn()}
      />,
    );

    expect(screen.queryByTitle(/إضافة ملاحظة على الصنف/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/إضافة ملاحظة وتجهيز للمطبخ/)).not.toBeInTheDocument();
  });

  it('shows per-item notes button when restaurantModuleEnabled is true', () => {
    mockSettings.data = {
      restaurantModuleEnabled: true,
    };

    render(
      <PosCartItemsList
        cart={cart}
        lastAddedLineKey=""
        selectedLineKey=""
        onQtyChange={vi.fn()}
        onRemoveItem={vi.fn()}
        onSelectLine={vi.fn()}
        onItemNoteChange={vi.fn()}
      />,
    );

    const noteButtons = screen.getAllByTitle(/إضافة ملاحظة وتجهيز للمطبخ/);
    expect(noteButtons.length).toBe(cart.length);
  });
});
