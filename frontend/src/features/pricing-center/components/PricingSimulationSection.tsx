import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/components/data-table';
import { AlertTriangleIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';

interface PricingSimulationSectionProps {
  summary: any;
  previewRows: any[];
  previewLoading: boolean;
  matchedTotal: number;
  affectedTotal: number;
  skippedTotal: number;
  invBefore: number;
  invAfter: number;
  invDiff: number;
  marginBefore: number;
  marginAfter: number;
  marginDiff: number;
}

export function PricingSimulationSection({
  previewRows,
  previewLoading,
  matchedTotal,
  affectedTotal,
  skippedTotal,
  invAfter,
  invDiff,
  marginAfter,
  marginDiff,
}: PricingSimulationSectionProps) {
  return (
    <FormSection
      title="المحاكاة المالية الفورية"
      description="تقدير شامل لتأثير القرار على إجمالي قيمة المخزون الحالي، هامش الربحية، وهوامش الأمان قبل الحفظ."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>أصناف النطاق المستهدف</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{matchedTotal} صنف</div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>مطابقة للفلاتر</span>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>الأصناف المتأثرة فعلياً</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{affectedTotal} صنف</div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>تم استبعاد {skippedTotal} صنف</span>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>قيمة المخزون بالبيع</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{formatCurrency(invAfter)}</div>
          <span style={{ fontSize: '0.72rem', color: invDiff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
            {invDiff >= 0 ? `+${formatCurrency(invDiff)}` : formatCurrency(invDiff)}
          </span>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>إجمالي هامش الربح</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{formatCurrency(marginAfter)}</div>
          <span style={{ fontSize: '0.72rem', color: marginDiff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
            {marginDiff >= 0 ? `+${formatCurrency(marginDiff)}` : formatCurrency(marginDiff)}
          </span>
        </div>
      </div>

      <DataTable
        getRowKey={(row: any, i) => String(row.id || row.barcode || i)}
        data={previewRows}
        loading={previewLoading}
        emptyMessage="لم يتم تشغيل المعاينة بعد. اضغط على 'معاينة الأثر' بالأعلى لتوليد التقرير."
        columns={[
          {
            id: 'name',
            header: 'الصنف',
            render: (row: any) => (
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.barcode || row.sku || '—'}</div>
              </div>
            ),
          },
          {
            id: 'cost',
            header: 'التكلفة',
            render: (row: any) => formatCurrency(row.costPrice),
          },
          {
            id: 'retailBefore',
            header: 'القطاعي الحالي',
            render: (row: any) => formatCurrency(row.retailPriceBefore),
          },
          {
            id: 'retailAfter',
            header: 'القطاعي المقترح',
            render: (row: any) => (
              <span style={{ fontWeight: 800, color: '#170e5e' }}>
                {formatCurrency(row.retailPriceAfter)}
              </span>
            ),
          },
          {
            id: 'stock',
            header: 'الرصيد',
            render: (row: any) => `${row.stockQty} وحدة`,
          },
          {
            id: 'status',
            header: 'الحالة',
            render: (row: any) => (
              row.status === 'applied' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                  <CheckCircleIcon size={13} color="#16a34a" />
                  <span>تعديل</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.75rem', fontWeight: 700 }}>
                  <AlertTriangleIcon size={13} color="#d97706" />
                  <span>مستثنى ({row.statusReason})</span>
                </span>
              )
            ),
          },
        ]}
      />
    </FormSection>
  );
}
