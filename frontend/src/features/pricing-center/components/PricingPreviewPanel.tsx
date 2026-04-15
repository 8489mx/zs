import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { formatCurrency } from '@/lib/format';
import type { PricingPreviewResponse } from '@/shared/api/pricing.api';
import { formatPricingMode, formatSkipReason } from '@/features/pricing-center/lib/pricing-center.utils';

interface Props {
  preview: PricingPreviewResponse | null;
  selectedPreviewIds: string[];
  setSelectedPreviewIds: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function PricingPreviewPanel({
  preview,
  selectedPreviewIds,
  setSelectedPreviewIds,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const rows = preview?.rows || [];

  return (
    <Card
      title="نتائج المعاينة"
      description="الجدول يعرض قبل/بعد، مع حالة التوريث، ومفتاح المجموعة، والاستثناءات التي سيتم تخطيها عند التنفيذ."
    >
      <DataTable
        density="compact"
        rows={rows}
        rowKey={(row) => String(row.productId)}
        selection={{
          selectedKeys: selectedPreviewIds,
          onChange: setSelectedPreviewIds,
          checkboxLabel: (row) => `تحديد ${row.name}`,
        }}
        pagination={preview ? {
          page: preview.paging.page,
          pageSize: preview.paging.pageSize,
          totalItems: preview.paging.totalItems,
          onPageChange,
          onPageSizeChange,
          pageSizeOptions: [25, 50, 100, 200],
          itemLabel: 'صنف',
        } : undefined}
        columns={[
          {
            key: 'name',
            header: 'الصنف',
            cell: (row) => (
              <div>
                <strong>{row.name}</strong>
                <div className="muted small">{row.barcode || '—'}</div>
              </div>
            ),
          },
          {
            key: 'kind',
            header: 'النوع',
            cell: (row) => row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : 'عادي',
          },
          {
            key: 'profile',
            header: 'ملف التسعير',
            cell: (row) => (
              <div>
                <strong>{formatPricingMode(row.pricingMode)}</strong>
                <div className="muted small">{row.pricingGroupKey || '—'}</div>
              </div>
            ),
          },
          { key: 'stock', header: 'المخزون', cell: (row) => row.stockQty },
          {
            key: 'retail',
            header: 'قطاعي قبل/بعد',
            cell: (row) => `${formatCurrency(row.retailPriceBefore)} → ${formatCurrency(row.retailPriceAfter)}`,
          },
          {
            key: 'wholesale',
            header: 'جملة قبل/بعد',
            cell: (row) => `${formatCurrency(row.wholesalePriceBefore)} → ${formatCurrency(row.wholesalePriceAfter)}`,
          },
          {
            key: 'flags',
            header: 'تنبيهات',
            cell: (row) => [
              row.hasActiveOffer ? 'عرض' : '',
              row.hasCustomerPrice ? 'سعر خاص' : '',
              row.belowCostAfter ? 'أقل من الشراء' : '',
            ].filter(Boolean).join(' / ') || '—',
          },
          {
            key: 'status',
            header: 'الحالة',
            cell: (row) => row.skipped
              ? `مستثنى: ${row.skipReasons.map(formatSkipReason).join(' + ')}`
              : row.changed
                ? 'سيتغير'
                : 'بدون تغيير',
          },
        ]}
        empty={<div className="empty-state"><p>لا توجد معاينة بعد. اختر النطاق واضغط “معاينة”.</p></div>}
      />
    </Card>
  );
}
