import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryReportSection } from '@/features/reports/components/sections/InventoryReportSection';

describe('InventoryReportSection', () => {
  it('renders location hotspots and row-level location breakdowns', () => {
    render(
      <InventoryReportSection
        inventoryQuery={{
          isLoading: false,
          isError: false,
          error: null,
          data: {
            rows: [
              {
                id: 'p-1',
                name: 'أرز',
                category: 'بقالة',
                supplier: 'المورد ب',
                stock: 8,
                minStock: 10,
                status: 'low',
                topLocationName: 'المخزن الرئيسي',
                topLocationQty: 5,
                locationsLabel: 'المخزن الرئيسي (الفرع الأول): 5 • المخزن الخلفي (الفرع الأول): 3',
              },
            ],
            summary: {
              totalItems: 1,
              outOfStock: 0,
              lowStock: 1,
              healthy: 0,
              trackedLocations: 2,
              locationHighlights: [
                { locationId: '10', locationName: 'المخزن الرئيسي', branchId: '1', branchName: 'الفرع الأول', totalQty: 5, trackedProducts: 2, attentionItems: 1, lowStockItems: 1, outOfStockItems: 0 },
              ],
            },
            pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, rangeStart: 1, rangeEnd: 1 },
          },
        }}
        exportLowStock={vi.fn()}
        printLowStockList={vi.fn()}
        inventorySearch=""
        onInventorySearchChange={vi.fn()}
        inventoryFilter="attention"
        onInventoryFilterChange={vi.fn()}
        onInventoryPageChange={vi.fn()}
        onInventoryPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('أكثر المواقع احتياجًا للمتابعة')).toBeInTheDocument();
    expect(screen.getAllByText('المخزن الرئيسي')[0]).toBeInTheDocument();
    expect(screen.getByText(/المخزن الخلفي/)).toBeInTheDocument();
  });
});
