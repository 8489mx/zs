import { describe, expect, it, vi } from 'vitest';
import { reportsApi } from '@/features/reports/api/reports.api';

const { httpMock } = vi.hoisted(() => ({ httpMock: vi.fn() }));

vi.mock('@/lib/http', () => ({
  http: httpMock,
}));

describe('reportsApi.inventoryPage', () => {
  it('maps stockQty and location metadata into stable report rows', async () => {
    httpMock.mockResolvedValueOnce({
      items: [
        {
          id: 'p-1',
          name: 'أرز',
          stockQty: 8,
          minStock: 10,
          category: 'بقالة',
          supplier: 'المورد ب',
          status: 'low',
          topLocationName: 'المخزن الرئيسي',
          topLocationQty: 5,
          locationsLabel: 'المخزن الرئيسي (الفرع الأول): 5 • المخزن الخلفي (الفرع الأول): 3',
          assignedQty: 8,
          unassignedQty: 0,
          locations: [
            { locationId: '10', locationName: 'المخزن الرئيسي', branchId: '1', branchName: 'الفرع الأول', qty: 5 },
          ],
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, rangeStart: 1, rangeEnd: 1 },
      summary: { totalItems: 1, outOfStock: 0, lowStock: 1, healthy: 0, trackedLocations: 2 },
      locationHighlights: [
        { locationId: '10', locationName: 'المخزن الرئيسي', branchId: '1', branchName: 'الفرع الأول', totalQty: 5, trackedProducts: 2, attentionItems: 1, lowStockItems: 1, outOfStockItems: 0 },
      ],
    });

    const result = await reportsApi.inventoryPage({ filter: 'attention' });

    expect(result.rows[0].stock).toBe(8);
    expect(result.rows[0].topLocationName).toBe('المخزن الرئيسي');
    expect(result.rows[0].locations?.[0]?.qty).toBe(5);
    expect(result.summary.locationHighlights?.[0]?.locationName).toBe('المخزن الرئيسي');
    expect(result.summary.trackedLocations).toBe(2);
  });
});
