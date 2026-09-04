import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScalePluExportModal } from './ScalePluExportModal';
import { createTestQueryClient } from '@/test/test-query-client';
import type { Product } from '@/types/domain';

const mockTriggerDownload = vi.fn();
const mockDownloadExcelFile = vi.fn();

vi.mock('@/lib/browser', () => ({
  triggerDownload: (...args: any[]) => mockTriggerDownload(...args),
  downloadExcelFile: (...args: any[]) => mockDownloadExcelFile(...args),
}));

vi.mock('@/features/products/api/products.api', () => ({
  productsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

const testProducts: Product[] = [
  {
    id: '1',
    name: 'جبنة بيضاء بالكيلو',
    barcode: '101',
    categoryId: 'c1',
    supplierId: '',
    costPrice: 50,
    retailPrice: 80,
    wholesalePrice: 70,
    stock: 25,
    minStock: 5,
    units: [{ id: 'u1', name: 'كجم', factor: 1, price: 80, barcode: '101' }],
    offers: [],
  } as any,
  {
    id: '2',
    name: 'زيت عباد الشمس',
    barcode: '62211112222',
    categoryId: 'c2',
    supplierId: '',
    costPrice: 60,
    retailPrice: 75,
    wholesalePrice: 70,
    stock: 10,
    minStock: 2,
    units: [{ id: 'u2', name: 'قطعة', factor: 1, price: 75, barcode: '62211112222' }],
    offers: [],
  } as any,
];

function renderModal(props: Partial<React.ComponentProps<typeof ScalePluExportModal>> = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ScalePluExportModal
        open
        onClose={vi.fn()}
        products={testProducts}
        categoryNames={{ c1: 'ألبان وجبن', c2: 'زيوت' }}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('ScalePluExportModal', () => {
  it('renders correctly and filters weighted products by default', () => {
    renderModal();
    expect(screen.getByText(/تصدير ملف موازين الباركود الإلكترونية/)).toBeDefined();
    expect(screen.getByText('جبنة بيضاء بالكيلو')).toBeDefined();
    // Default scope is weighted only, so oil (قطعة) should not be in the initial preview
    expect(screen.queryByText('زيت عباد الشمس')).toBeNull();
  });

  it('triggers CSV download when clicking download button', () => {
    renderModal();
    const downloadBtn = screen.getByText(/تحميل ملف CSV للميزان/);
    fireEvent.click(downloadBtn);
    expect(mockTriggerDownload).toHaveBeenCalled();
  });

  it('triggers Excel download when clicking excel button', async () => {
    renderModal();
    const excelBtn = screen.getByText(/تصدير ملف Excel/);
    fireEvent.click(excelBtn);
    expect(mockDownloadExcelFile).toHaveBeenCalled();
  });
});
