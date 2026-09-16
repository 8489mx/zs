import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import type { ContractingProjectEvmMetrics } from '../contracting.types';
import { toast } from '@/shared/components/system-alert';

interface ProjectEvmMetricsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

export function ProjectEvmMetricsModal({ open, onClose, projectId, projectName }: ProjectEvmMetricsModalProps) {
  const [metrics, setMetrics] = useState<ContractingProjectEvmMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await contractingApi.getProjectEvmMetrics(projectId);
      setMetrics(data);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل مؤشرات القيمة المكتسبة للمشروع');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const formatCurrency = (val: number = 0) =>
    Number(val || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

  const formatIndex = (val: number = 0) => Number(val || 0).toFixed(2);

  // Helper for KPI styling
  const getIndexColor = (val: number) => {
    if (val >= 1.05) return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'أداء ممتاز' };
    if (val >= 0.95) return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'ضمن الحدود المقبولة' };
    if (val >= 0.85) return { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'تحذير وانحراف طفيف' };
    return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'حرج ويتطلب تدخل' };
  };

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'excellent':
        return { label: 'ممتاز وفائق الكفاءة', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'good':
        return { label: 'جيد ومستقر', bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' };
      case 'at_risk':
        return { label: 'في دائرة الخطر', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
      case 'critical':
      default:
        return { label: 'حرج وعجز في الأداء', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    }
  };

  // SVG S-Curve Chart Renderer
  const renderSCurve = () => {
    if (!metrics || !metrics.sCurvePoints || metrics.sCurvePoints.length === 0) {
      return (
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          لا توجد بيانات تاريخية كافية لرسم منحنى S-Curve تراكمي لهذا المشروع.
        </div>
      );
    }

    const points = metrics.sCurvePoints;
    const maxVal = Math.max(
      ...points.map((p) => Math.max(p.plannedCumulative, p.earnedCumulative, p.actualCumulative)),
      1000,
    );

    const svgWidth = 840;
    const svgHeight = 260;
    const paddingX = 60;
    const paddingY = 30;
    const chartW = svgWidth - paddingX * 2;
    const chartH = svgHeight - paddingY * 2;

    const getX = (idx: number) => paddingX + (idx / Math.max(points.length - 1, 1)) * chartW;
    const getY = (val: number) => svgHeight - paddingY - (val / maxVal) * chartH;

    const plannedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.plannedCumulative)}`).join(' ');
    const earnedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.earnedCumulative)}`).join(' ');
    const actualPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.actualCumulative)}`).join(' ');

    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.TrendingUp size={16} />
            منحنى الإنجاز التراكمي (S-Curve) - مخطط المقارنة الزمني والمالي
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', background: '#3b82f6', display: 'inline-block', borderRadius: '2px' }} />
              <span style={{ color: '#1e40af' }}>المخطط له (PV)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', background: '#10b981', display: 'inline-block', borderRadius: '2px' }} />
              <span style={{ color: '#047857' }}>القيمة المكتسبة (EV)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', background: '#f59e0b', display: 'inline-block', borderRadius: '2px' }} />
              <span style={{ color: '#b45309' }}>التكلفة الفعلية (AC)</span>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', direction: 'ltr' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '240px', overflow: 'visible' }}>
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = svgHeight - paddingY - pct * chartH;
              return (
                <g key={i}>
                  <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={paddingX - 10} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="sans-serif">
                    {Math.round(maxVal * pct).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Paths */}
            <path d={plannedPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            <path d={earnedPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
            <path d={actualPath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

            {/* Data Dots & X-Labels */}
            {points.map((p, i) => {
              const x = getX(i);
              return (
                <g key={i}>
                  <line x1={x} y1={paddingY} x2={x} y2={svgHeight - paddingY} stroke="#f8fafc" strokeWidth="1" />
                  {/* Planned Dot */}
                  <circle cx={x} cy={getY(p.plannedCumulative)} r="4" fill="#3b82f6" />
                  {/* Earned Dot */}
                  <circle cx={x} cy={getY(p.earnedCumulative)} r="4" fill="#10b981" />
                  {/* Actual Dot */}
                  <circle cx={x} cy={getY(p.actualCumulative)} r="4" fill="#f59e0b" />
                  {/* Period Label */}
                  <text x={x} y={svgHeight - 10} fill="#64748b" fontSize="10.5" textAnchor="middle" fontFamily="sans-serif">
                    {p.periodName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const cpiStyle = metrics ? getIndexColor(metrics.cpi) : null;
  const spiStyle = metrics ? getIndexColor(metrics.spi) : null;
  const healthBadge = metrics ? getHealthBadge(metrics.healthIndicator) : null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="مؤشرات القيمة المكتسبة ومنحنى الأداء التراكمي (EVM & S-Curve)"
      subtitle={`تحليل المعايير العالمية (Primavera / Oracle Unifier) لمشروع: ${projectName || metrics?.projectName || 'المشروع المحدد'}`}
      width="1180px"
      compact
      minHeight="min(600px, 88vh)"
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '14px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', borderRadius: '50%' }} />
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>جاري حساب وتحليل مصفوفة القيمة المكتسبة وتوليد منحنيات الـ S-Curve...</div>
        </div>
      ) : !metrics ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          لا توجد بيانات مقايسة أو أعمال مسجلة للمشروع لحساب مؤشرات EVM.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Status & Health Banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: healthBadge?.bg,
                  color: healthBadge?.color,
                  border: `1px solid ${healthBadge?.border}`,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.CheckShield size={14} />
                حالة المشروع العامة: {healthBadge?.label}
              </div>
              <div style={{ color: '#64748b', fontSize: '12.5px' }}>
                كود المشروع: <strong style={{ color: '#0f172a' }}>{metrics.projectCode || 'PROJ'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={loadData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <AppIcons.RefreshCw size={13} />
                إعادة التحديث
              </button>
            </div>
          </div>

          {/* EVM 4 Core Primary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* 1. BAC */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>إجمالي الميزانية التعاقدية (BAC)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{formatCurrency(metrics.budgetAtCompletion)}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Budget At Completion</div>
            </div>

            {/* 2. PV */}
            <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11.5px', color: '#1e40af', fontWeight: 600 }}>القيمة المخططة الحالية (PV)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#1d4ed8', margin: '4px 0' }}>{formatCurrency(metrics.plannedValue)}</div>
              <div style={{ fontSize: '11px', color: '#3b82f6' }}>Planned Value</div>
            </div>

            {/* 3. EV */}
            <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 600 }}>القيمة المكتسبة المنفذة (EV)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>{formatCurrency(metrics.earnedValue)}</div>
              <div style={{ fontSize: '11px', color: '#10b981' }}>Earned Value</div>
            </div>

            {/* 4. AC */}
            <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11.5px', color: '#c2410c', fontWeight: 600 }}>التكلفة الفعلية المنصرفة (AC)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#c2410c', margin: '4px 0' }}>{formatCurrency(metrics.actualCost)}</div>
              <div style={{ fontSize: '11px', color: '#f97316' }}>Actual Cost</div>
            </div>
          </div>

          {/* Performance Indices & Variances Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* CPI */}
            <div style={{ background: cpiStyle?.bg, border: `1px solid ${cpiStyle?.border}`, borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: cpiStyle?.color }}>مؤشر أداء التكلفة (CPI)</span>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: cpiStyle?.color }}>EV / AC</span>
              </div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: cpiStyle?.color, margin: '4px 0' }}>{formatIndex(metrics.cpi)}</div>
              <div style={{ fontSize: '11px', color: cpiStyle?.color, fontWeight: 600 }}>{cpiStyle?.label}</div>
            </div>

            {/* SPI */}
            <div style={{ background: spiStyle?.bg, border: `1px solid ${spiStyle?.border}`, borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: spiStyle?.color }}>مؤشر أداء الجدول (SPI)</span>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: spiStyle?.color }}>EV / PV</span>
              </div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: spiStyle?.color, margin: '4px 0' }}>{formatIndex(metrics.spi)}</div>
              <div style={{ fontSize: '11px', color: spiStyle?.color, fontWeight: 600 }}>{spiStyle?.label}</div>
            </div>

            {/* CV */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>وفر / عجز التكاليف (CV)</div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: metrics.costVariance >= 0 ? '#15803d' : '#b91c1c',
                  margin: '4px 0',
                }}
              >
                {metrics.costVariance >= 0 ? '+' : ''}
                {formatCurrency(metrics.costVariance)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>EV - AC (وفر التكلفة)</div>
            </div>

            {/* SV */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>فارق الجدول الزمني (SV)</div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: metrics.scheduleVariance >= 0 ? '#15803d' : '#b91c1c',
                  margin: '4px 0',
                }}
              >
                {metrics.scheduleVariance >= 0 ? '+' : ''}
                {formatCurrency(metrics.scheduleVariance)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>EV - PV (القيمة المنفذة)</div>
            </div>
          </div>

          {/* Forecasting Card (EAC, VAC, TCPI) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>التكلفة المتوقعة عند الاكتمال (EAC)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#170e5e', margin: '4px 0' }}>{formatCurrency(metrics.estimateAtCompletion)}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Estimate At Completion (BAC / CPI)</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>الفارق المتوقع عند النهاية (VAC)</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: metrics.varianceAtCompletion >= 0 ? '#15803d' : '#b91c1c',
                  margin: '4px 0',
                }}
              >
                {metrics.varianceAtCompletion >= 0 ? '+' : ''}
                {formatCurrency(metrics.varianceAtCompletion)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Variance At Completion (BAC - EAC)</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>مؤشر الأداء المطلوب لإتمام الميزانية (TCPI)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{formatIndex(metrics.toCompletePerformanceIndex)}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>To-Complete Performance Index</div>
            </div>
          </div>

          {/* S-Curve Graph */}
          {renderSCurve()}
        </div>
      )}
    </StandardDialog>
  );
}
