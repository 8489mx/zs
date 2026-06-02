import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosProductsPanel } from './PosProductsPanel';
import type { Product } from '@/types/domain';

function createProduct(index: number): Product {
  const suffix = String(index).padStart(3, '0');
  return {
    id: `product-${suffix}`,
    name: `Product ${suffix}`,
    barcode: `barcode-${suffix}`,
    categoryId: 'category-1',
    supplierId: 'supplier-1',
    costPrice: 10,
    retailPrice: 20,
    wholesalePrice: 18,
    stock: 10,
    minStock: 1,
    notes: '',
    units: [],
  };
}

describe('PosProductsPanel', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('caps touch mode results by default and reveals more products on demand', async () => {
    const user = userEvent.setup();
    const products = Array.from({ length: 85 }, (_, index) => createProduct(index + 1));

    render(
      <PosProductsPanel
        search=""
        onSearchChange={vi.fn()}
        onSearchSubmitFirstResult={() => false}
        priceType="retail"
        onPriceTypeChange={vi.fn()}
        products={products}
        recentProducts={[]}
        onAddProduct={vi.fn()}
        productFilter="all"
        onProductFilterChange={vi.fn()}
        searchInputRef={createRef<HTMLInputElement>()}
        posMode="touch"
      />,
    );

    expect(screen.getByText('Product 060')).toBeInTheDocument();
    expect(screen.queryByText('Product 061')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'عرض المزيد' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'عرض المزيد' }));

    expect(screen.getByText('Product 061')).toBeInTheDocument();
    expect(screen.getByText('Product 085')).toBeInTheDocument();
  });

  it('uses the current input value on Enter and does not fall back to the previously selected product', async () => {
    const user = userEvent.setup();
    const onSearchSubmitFirstResult = vi.fn(() => false);
    const onAddProduct = vi.fn();
    const products = Array.from({ length: 3 }, (_, index) => createProduct(index + 1));

    render(
      <PosProductsPanel
        search="barcode-002"
        onSearchChange={vi.fn()}
        onSearchSubmitFirstResult={onSearchSubmitFirstResult}
        priceType="retail"
        onPriceTypeChange={vi.fn()}
        products={products}
        recentProducts={[]}
        onAddProduct={onAddProduct}
        productFilter="all"
        onProductFilterChange={vi.fn()}
        searchInputRef={createRef<HTMLInputElement>()}
        posMode="scanner"
      />,
    );

    await user.click(screen.getByPlaceholderText('اضرب الباركود هنا أو اكتب الاسم ثم Enter'));
    await user.keyboard('{Enter}');

    expect(onSearchSubmitFirstResult).toHaveBeenCalledWith('barcode-002');
    expect(onAddProduct).not.toHaveBeenCalled();
  });
});
