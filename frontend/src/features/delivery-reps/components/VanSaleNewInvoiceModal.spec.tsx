import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VanSaleNewInvoiceModal } from './VanSaleNewInvoiceModal';
import { createTestQueryClient } from '@/test/test-query-client';

const { mockSalesCreate } = vi.hoisted(() => ({
  mockSalesCreate: vi.fn().mockResolvedValue({ id: 's-100', docNo: 'VS-001', total: 100 }),
}));

vi.mock('@/features/sales/api/sales.api', () => ({
  salesApi: {
    create: mockSalesCreate,
  },
}));

vi.mock('@/features/products/api/products.api', () => ({
  productsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'شاي العروسة', price: 25, retail_price: 25, barcode: '111' },
      { id: '2', name: 'سكر أبيض', price: 35, retail_price: 35, barcode: '222' },
    ]),
  },
}));

vi.mock('@/features/customers/api/customers.api', () => ({
  customersApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe('VanSaleNewInvoiceModal', () => {
  it('renders modal with title and allows searching/adding product to cart', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <VanSaleNewInvoiceModal
          open
          onClose={vi.fn()}
          repId={1}
          repName="محمود المندوب"
        />
      </QueryClientProvider>
    );

    expect(screen.getByText(/بيع مباشر من السيارة/)).toBeDefined();
    expect(screen.getByText(/عميل نقدي \/ طيار/)).toBeDefined();

    // Type in search
    const searchInput = screen.getByPlaceholderText(/ابحث عن صنف أو كود بالسيارة/);
    fireEvent.change(searchInput, { target: { value: 'شاي' } });

    // Expect product to appear in quick search
    const productItem = await screen.findByText('شاي العروسة');
    expect(productItem).toBeDefined();

    // Click to add
    fireEvent.click(productItem);

    // Expect cart item to show with qty 1 and price
    expect(screen.getAllByText(/25/).length).toBeGreaterThan(0);
    expect(screen.getByText('إجمالي الفاتورة')).toBeDefined();
  });
});
