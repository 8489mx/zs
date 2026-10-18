import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/ui/data-table';
import { formatCurrency } from '@/lib/format';
import type { PricingPreviewRow } from '@/shared/api/pricing.api';

interface PricingPreviewTableSectionProps {
  previewRows: PricingPreviewRow[];
  previewLoading: boolean;
}

export function PricingPreviewTableSection({
  previewRows,
  previewLoading,
}: PricingPreviewTableSectionProps) {
  const { t } = useTranslation();
  return (
    <FormSection
      title={t('pricing_center.pricing_preview_table_section.s0', "نتائج المعاينة التفصيلية")}
      description={t('pricing_center.pricing_preview_table_section.s1', "تفاصيل الأسعار قبل وبعد والتنبيهات والاستثناءات لكل صنف مشمول في نطاق التسعير المحدد.")}
      actions={previewRows.length ? <span className="nav-pill">{previewRows.length} {t('pricing_center.pricing_preview_table_section.s2', "صنف")}</span> : undefined}
    >
      <DataTable
        density="compact"
        rows={previewRows}
        rowKey={(row: PricingPreviewRow) => String(row.productId)}
        empty={
          previewLoading ? (
            <div className="empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#170e5e', fontSize: '0.9rem', fontWeight: 600 }}>
                {t('pricing_center.pricing_preview_table_section.s3', "جاري احتساب ومحاكاة الأثر على الأصناف...")}
              </p>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
                {t('pricing_center.pricing_preview_table_section.s4', "لا توجد نتائج معاينة بعد. حدد النطاق واضغط على زر")} <strong>{t('pricing_center.pricing_preview_table_section.s5', "“معاينة الأثر”")}</strong>.
              </p>
            </div>
          )
        }
        columns={[
          {
            key: 'name',
            header: t('pricing_center.pricing_preview_table_section.s6', "الصنف والباركود"),
            cell: (row: PricingPreviewRow) => (
              <div>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{row.name}</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.barcode || '—'}</div>
              </div>
            ),
          },
          {
            key: 'kind',
            header: t('pricing_center.pricing_preview_table_section.s7', "النوع"),
            cell: (row: PricingPreviewRow) => (
              <span style={{ fontSize: '0.76rem', color: '#475569' }}>
                {row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : t('pricing_center.pricing_preview_table_section.s8', "عادي")}
              </span>
            ),
          },
          {
            key: 'cost',
            header: t('pricing_center.pricing_preview_table_section.s9', "سعر التكلفة"),
            cell: (row: PricingPreviewRow) => (
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                {formatCurrency(row.costPrice)}
              </span>
            ),
          },
          {
            key: 'stock',
            header: t('pricing_center.pricing_preview_table_section.s10', "المخزون"),
            cell: (row: PricingPreviewRow) => (
              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{row.stockQty}</span>
            ),
          },
          {
            key: 'retail',
            header: t('pricing_center.pricing_preview_table_section.s11', "قطاعي (قبل ← بعد)"),
            cell: (row: PricingPreviewRow) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>{formatCurrency(row.retailPriceBefore)}</span>
                <span style={{ color: '#94a3b8' }}>←</span>
                <strong style={{ color: row.retailPriceAfter !== row.retailPriceBefore ? '#170e5e' : '#0f172a', fontWeight: 800 }}>
                  {formatCurrency(row.retailPriceAfter)}
                </strong>
              </div>
            ),
          },
          {
            key: 'wholesale',
            header: t('pricing_center.pricing_preview_table_section.s12', "جملة (قبل ← بعد)"),
            cell: (row: PricingPreviewRow) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>{formatCurrency(row.wholesalePriceBefore)}</span>
                <span style={{ color: '#94a3b8' }}>←</span>
                <strong style={{ color: row.wholesalePriceAfter !== row.wholesalePriceBefore ? '#170e5e' : '#0f172a', fontWeight: 800 }}>
                  {formatCurrency(row.wholesalePriceAfter)}
                </strong>
              </div>
            ),
          },
          {
            key: 'flags',
            header: t('pricing_center.pricing_preview_table_section.s13', "تنبيهات"),
            cell: (row: PricingPreviewRow) => {
              const flags = [
                row.hasActiveOffer ? t('pricing_center.pricing_preview_table_section.s14', "عرض") : '',
                row.hasCustomerPrice ? t('pricing_center.pricing_preview_table_section.s15', "سعر خاص") : '',
                row.belowCostAfter ? t('pricing_center.pricing_preview_table_section.s16', "أقل من الشراء") : '',
              ].filter(Boolean);

              if (!flags.length) return <span style={{ color: '#94a3b8' }}>—</span>;

              return (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {flags.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: f === 'أقل من الشراء' ? '#fee2e2' : '#fef3c7',
                        color: f === 'أقل من الشراء' ? '#b91c1c' : '#92400e',
                        border: f === 'أقل من الشراء' ? '1px solid #fecaca' : '1px solid #fde68a',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: 'status',
            header: t('pricing_center.pricing_preview_table_section.s17', "الحالة"),
            cell: (row: PricingPreviewRow) => {
              if (row.skipped) {
                return (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '999px', border: '1px solid #fde68a' }}>
                    {t('pricing_center.pricing_preview_table_section.s18', "مستثنى (")}{row.skipReasons.join(' + ')})
                  </span>
                );
              }
              if (row.changed) {
                return (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
                    {t('pricing_center.pricing_preview_table_section.s19', "سيتغير")}
                  </span>
                );
              }
              return (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {t('pricing_center.pricing_preview_table_section.s20', "بدون تغيير")}
                </span>
              );
            },
          },
        ]}
      />
    </FormSection>
  );
}
