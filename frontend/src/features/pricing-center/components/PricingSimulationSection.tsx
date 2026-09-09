import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';

interface PricingSimulationSectionProps {
  summary: any;
  previewLoading: boolean;
  runPreview: () => void;
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
  summary,
  previewLoading,
  runPreview,
  matchedTotal,
  affectedTotal,
  skippedTotal,
  invBefore,
  invAfter,
  invDiff,
  marginBefore,
  marginAfter,
  marginDiff,
}: PricingSimulationSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FormSection
        title="المحاكاة المالية الفورية"
        className="h-full"
        bodyClassName="flex-1 flex flex-col justify-between"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
          
          {/* 1. Inventory Value Comparative */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
              قيمة المخزون (بسعر البيع)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{formatCurrency(invBefore)}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>←</span>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(invAfter)}</strong>
              </div>
              {invDiff !== 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: invDiff > 0 ? '#f0fdf4' : '#fef2f2',
                    color: invDiff > 0 ? '#16a34a' : '#dc2626',
                    border: invDiff > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  }}
                >
                  {invDiff > 0 ? `+${formatCurrency(invDiff)}` : formatCurrency(invDiff)}
                </span>
              )}
            </div>
          </div>

          {/* 2. Profit Margin Comparative */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
              هامش الربح الإجمالي للمخزون
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{formatCurrency(marginBefore)}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>←</span>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(marginAfter)}</strong>
              </div>
              {marginDiff !== 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: marginDiff > 0 ? '#f0fdf4' : '#fef2f2',
                    color: marginDiff > 0 ? '#16a34a' : '#dc2626',
                    border: marginDiff > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  }}
                >
                  {marginDiff > 0 ? `+${formatCurrency(marginDiff)}` : formatCurrency(marginDiff)}
                </span>
              )}
            </div>
          </div>

          {/* 3. Direct Impact Breakdown */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
              تفصيل نطاق الأصناف المتأثرة
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
              <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>المشمول</div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>{matchedTotal}</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>سيتأثر</div>
                <strong style={{ fontSize: '0.92rem', color: '#16a34a', fontWeight: 700 }}>{affectedTotal}</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#b45309' }}>مستثنى</div>
                <strong style={{ fontSize: '0.92rem', color: '#b45309', fontWeight: 700 }}>{skippedTotal}</strong>
              </div>
            </div>
          </div>

          {/* 4. Cost Safety Indicator */}
          {summary ? (
            <div
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                background: summary.belowCostCount > 0 ? '#fffbeb' : '#f0fdf4',
                border: summary.belowCostCount > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: summary.belowCostCount > 0 ? '#92400e' : '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {summary.belowCostCount > 0 ? (
                  <>
                    <AlertTriangleIcon size={14} color="#d97706" />
                    <span>{summary.belowCostCount} صنف سينخفض عن سعر الشراء والتكلفة!</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon size={14} color="#16a34a" />
                    <span>جميع الأسعار المعدلة أعلى من سعر التكلفة</span>
                  </>
                )}
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                اضغط على تحديث المعاينة لاحتساب الأثر وفحص التكلفة
              </span>
            </div>
          )}

          {/* 5. Action CTA */}
          <Button
            onClick={runPreview}
            disabled={previewLoading}
            style={{ width: '100%', minHeight: '38px', fontSize: '0.86rem', fontWeight: 700, marginTop: 'auto' }}
          >
            {previewLoading ? 'جاري الحساب...' : 'تحديث المعاينة الآن'}
          </Button>

        </div>
      </FormSection>
    </div>
  );
}
