import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
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
  const { t } = useTranslation();
  const rows = preview?.rows || [];

  return (
    <FormSection
      title={t('pricing_center.pricing_preview_panel.s0', "نتائج المعاينة")}
      description={t('pricing_center.pricing_preview_panel.s1', "الجدول يعرض قبل/بعد، مع حالة التوريث، ومفتاح المجموعة، والاستثناءات التي سيتم تخطيها عند التنفيذ.")}
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
          itemLabel: t('pricing_center.pricing_preview_panel.s2', "صنف"),
        } : undefined}
        columns={[
          {
            key: 'name',
            header: t('pricing_center.pricing_preview_panel.s3', "الصنف"),
            cell: (row) => (
              <div>
                <strong>{row.name}</strong>
                <div className="muted small">{row.barcode || '—'}</div>
              </div>
            ),
          },
          {
            key: 'kind',
            header: t('pricing_center.pricing_preview_panel.s4', "النوع"),
            cell: (row) => row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : t('pricing_center.pricing_preview_panel.s5', "عادي"),
          },
          {
            key: 'profile',
            header: t('pricing_center.pricing_preview_panel.s6', "ملف التسعير"),
            cell: (row) => (
              <div>
                <strong>{formatPricingMode(row.pricingMode)}</strong>
                <div className="muted small">{row.pricingGroupKey || '—'}</div>
              </div>
            ),
          },
          { key: 'stock', header: t('pricing_center.pricing_preview_panel.s7', "المخزون"), cell: (row) => row.stockQty },
          {
            key: 'retail',
            header: t('pricing_center.pricing_preview_panel.s8', "قطاعي قبل/بعد"),
            cell: (row) => `${formatCurrency(row.retailPriceBefore)} → ${formatCurrency(row.retailPriceAfter)}`,
          },
          {
            key: 'wholesale',
            header: t('pricing_center.pricing_preview_panel.s9', "جملة قبل/بعد"),
            cell: (row) => `${formatCurrency(row.wholesalePriceBefore)} → ${formatCurrency(row.wholesalePriceAfter)}`,
          },
          {
            key: 'flags',
            header: t('pricing_center.pricing_preview_panel.s10', "تنبيهات"),
            cell: (row) => [
              row.hasActiveOffer ? t('pricing_center.pricing_preview_panel.s11', "عرض") : '',
              row.hasCustomerPrice ? t('pricing_center.pricing_preview_panel.s12', "سعر خاص") : '',
              row.belowCostAfter ? t('pricing_center.pricing_preview_panel.s13', "أقل من الشراء") : '',
            ].filter(Boolean).join(' / ') || '—',
          },
          {
            key: 'status',
            header: t('pricing_center.pricing_preview_panel.s14', "الحالة"),
            cell: (row) => row.skipped
              ? `مستثنى: ${row.skipReasons.map(formatSkipReason).join(' + ')}`
              : row.changed
                ? t('pricing_center.pricing_preview_panel.s15', "سيتغير")
                : t('pricing_center.pricing_preview_panel.s16', "بدون تغيير"),
          },
        ]}
        empty={<div className="empty-state"><p>{t('pricing_center.pricing_preview_panel.s17', "لا توجد معاينة بعد. اختر النطاق واضغط “معاينة”.")}</p></div>}
      />
    </FormSection>
  );
}
