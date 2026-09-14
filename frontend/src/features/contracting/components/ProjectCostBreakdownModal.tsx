import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingProjectCostBreakdown, ContractingProject } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { toast } from '@/shared/components/system-alert';

interface ProjectCostBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  project: ContractingProject;
}

const STREAM_ICONS: Record<string, any> = {
  materials: AppIcons.Package,
  labor: AppIcons.Users,
  subcontracts: AppIcons.Building,
  mobilization: AppIcons.Truck,
  petty_cash: AppIcons.DollarSign,
};

const STREAM_COLORS: Record<string, string> = {
  materials: '#2563eb',
  labor: '#d97706',
  subcontracts: '#7c3aed',
  mobilization: '#059669',
  petty_cash: '#dc2626',
};

export function ProjectCostBreakdownModal({ open, onClose, project }: ProjectCostBreakdownModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [breakdown, setBreakdown] = useState<ContractingProjectCostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBreakdown = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await contractingApi.getProjectCostBreakdown(project.id);
      setBreakdown(data);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تحليل تكاليف المشروع الخماسي');
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (open) {
      loadBreakdown();
    }
  }, [open, loadBreakdown]);

  const contractVal = breakdown?.contractValue || Number(project.contractValue || 0);
  const baseline = breakdown?.costBaseline || contractVal;
  const totalActual = breakdown?.totalActualCost || 0;
  const variance = breakdown?.varianceVsBaseline || (totalActual - baseline);
  const profitMargin = breakdown?.profitMarginPercent ?? 0;
  const isOverBudget = variance > 0;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`تحليل التكاليف الفعلية الخماسية للمشروع - ${project.name}`}
      subtitle="تجميع مسارات التكلفة الفعلية الخمسة (خامات، عمالة، مقاولو باطن، تجهيزات موقع، وعهد نثرية) ومقارنتها بالميزانية"
      width="min(1040px, 96vw)"
      minHeight="min(560px, 85vh)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* بطاقات المؤشرات العامة للتكلفة */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>قيمة التعاقد الأصلية</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {contractVal.toLocaleString('ar-EG')} <span style={{ fontSize: '0.72rem' }}>{currencySymbol}</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>الميزانية المستهدفة (Baseline)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {baseline.toLocaleString('ar-EG')} <span style={{ fontSize: '0.72rem' }}>{currencySymbol}</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي المنصرف الفعلي</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '—' : `${totalActual.toLocaleString('ar-EG')} ${currencySymbol}`}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>الانحراف عن الميزانية</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isOverBudget ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
              {loading ? '—' : `${isOverBudget ? '+' : ''}${variance.toLocaleString('ar-EG')} ${currencySymbol}`}
            </div>
            <span style={{ fontSize: 'var(--font-micro)', color: isOverBudget ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
              {isOverBudget ? 'تجاوز في الميزانية' : 'ضمن حدود الميزانية المعتمدة'}
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>هامش الربح التشغيلي</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: profitMargin >= 15 ? '#15803d' : profitMargin > 0 ? '#a16207' : '#b91c1c', marginTop: '2px' }}>
              {loading ? '—' : `${profitMargin}%`}
            </div>
          </div>
        </div>

        {/* شريط توزيع التكلفة المرئي (Distribution Bar) */}
        {breakdown && breakdown.streams.length > 0 && totalActual > 0 && (
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: 'var(--font-micro)', color: '#334155', fontWeight: 700 }}>
                التوزيع النسبي لمصروفات المشروع الفعلية
              </span>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                100% = {totalActual.toLocaleString('ar-EG')} {currencySymbol}
              </span>
            </div>
            <div style={{ display: 'flex', height: '14px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
              {breakdown.streams.map((st) => (
                <div
                  key={st.key}
                  style={{
                    width: `${st.percentOfTotal}%`,
                    backgroundColor: STREAM_COLORS[st.key] || '#64748b',
                    transition: 'width 0.3s ease',
                  }}
                  title={`${st.name}: ${st.percentOfTotal}% (${st.amount.toLocaleString('ar-EG')} ${currencySymbol})`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
              {breakdown.streams.map((st) => (
                <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: STREAM_COLORS[st.key] || '#64748b' }} />
                  <span style={{ fontSize: 'var(--font-micro)', color: '#475569', fontWeight: 600 }}>
                    {st.name} ({st.percentOfTotal}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* جدول مسارات التكلفة الخمسة التفصيلية */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
          {loading ? (
            <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', fontWeight: 600 }}>جاري استخراج مسارات التكلفة الفعلية...</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>مسار التكلفة الفعلي</th>
                  <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>عدد الحركات / البنود</th>
                  <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>إجمالي المبلغ المصروف</th>
                  <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>النسبة من إجمالي التكلفة</th>
                  <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>المصدر التشغيلي بالمنظومة</th>
                </tr>
              </thead>
              <tbody>
                {breakdown?.streams.map((st) => {
                  const Icon = STREAM_ICONS[st.key] || AppIcons.FileText;
                  const color = STREAM_COLORS[st.key] || '#170e5e';
                  return (
                    <tr key={st.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color }}>
                            <Icon size={16} />
                          </span>
                          <strong style={{ color: '#0f172a' }}>{st.name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {st.count} عملية مسجلة
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 800, color: '#0f172a' }}>
                        {st.amount.toLocaleString('ar-EG')} {currencySymbol}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color }}>{st.percentOfTotal}%</span>
                          <div style={{ width: '80px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${st.percentOfTotal}%`, height: '100%', backgroundColor: color }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                        {st.key === 'materials' && 'أذون صرف المواد والتوريدات المخزنية (MRP Requisitions)'}
                        {st.key === 'labor' && 'يوميات وبطاقات حضور العمالة الميدانية (Direct Labor Attendance)'}
                        {st.key === 'subcontracts' && 'مستخلصات مقاولي الباطن المعتمدة (Subcontractor IPCs)'}
                        {st.key === 'mobilization' && 'مصروفات تجهيز الموقع والأصول الثابتة (Site Mobilization)'}
                        {st.key === 'petty_cash' && 'تسويات العهد والمصروفات النثرية المعتمدة (Petty Cash Settlement)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}
