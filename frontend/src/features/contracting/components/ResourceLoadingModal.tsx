import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import type { ResourceLoadingHistogram } from '../contracting.types';
import { toast } from '@/shared/components/system-alert';

interface ResourceLoadingModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

export function ResourceLoadingModal({ open, onClose, projectId, projectName }: ResourceLoadingModalProps) {
  const [data, setData] = useState<ResourceLoadingHistogram | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await contractingApi.getResourceLoadingHistogram(projectId);
      setData(result);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تقرير تحميل الموارد');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const maxManpower = data ? Math.max(1, ...data.weeks.map((w) => w.totalManpower)) : 1;
  const maxEquipment = data ? Math.max(1, ...data.weeks.map((w) => w.totalEquipment)) : 1;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تقرير تحميل الموارد الأسبوعي (Resource Loading Histogram)"
      subtitle={`إجمالي العمالة والمعدات المخططة لكل أسبوع من الجدول الزمني — ${projectName || ''}`}
      maxWidth="1000px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جارٍ التحميل...</div>
        ) : !data || data.weeks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <AppIcons.Users size={36} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700, color: '#334155' }}>لا توجد بيانات تحميل موارد بعد</div>
            <div style={{ fontSize: 'var(--font-subtitle)', marginTop: '4px' }}>
              أدخل عدد العمالة والمعدات المخططة عند إنشاء مهام الجدول الزمني ليظهر التقرير هنا
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#1e40af', fontWeight: 700 }}>ذروة العمالة</div>
                <div style={{ fontSize: 'var(--font-h2)', fontWeight: 800, color: '#1e3a8a' }}>
                  {data.peakManpowerWeek?.totalManpower ?? 0} عامل
                </div>
                <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                  {data.peakManpowerWeek ? `أسبوع ${data.peakManpowerWeek.weekStart}` : '—'}
                </div>
              </div>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#92400e', fontWeight: 700 }}>ذروة المعدات</div>
                <div style={{ fontSize: 'var(--font-h2)', fontWeight: 800, color: '#78350f' }}>
                  {data.peakEquipmentWeek?.totalEquipment ?? 0} معدة
                </div>
                <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                  {data.peakEquipmentWeek ? `أسبوع ${data.peakEquipmentWeek.weekStart}` : '—'}
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 'var(--font-body)' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px 10px' }}>الأسبوع</th>
                    <th style={{ padding: '8px 10px' }}>عدد المهام</th>
                    <th style={{ padding: '8px 10px' }}>العمالة</th>
                    <th style={{ padding: '8px 10px' }}>المعدات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeks.map((w) => (
                    <tr key={w.weekStart} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', color: '#64748b' }}>{w.weekStart} → {w.weekEnd}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{w.taskCount}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: `${(w.totalManpower / maxManpower) * 60}px`, height: '10px', background: '#3b82f6', borderRadius: '3px' }} />
                          <span style={{ fontWeight: 700, fontSize: 'var(--font-micro)' }}>{w.totalManpower}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: `${(w.totalEquipment / maxEquipment) * 60}px`, height: '10px', background: '#f59e0b', borderRadius: '3px' }} />
                          <span style={{ fontWeight: 700, fontSize: 'var(--font-micro)' }}>{w.totalEquipment}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.tradeBreakdown.length > 0 && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e' }}>التوزيع حسب التخصص</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {data.tradeBreakdown.map((t) => (
                    <div key={t.trade} style={{ padding: '6px 12px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', fontSize: 'var(--font-micro)' }}>
                      <strong>{t.trade}</strong>: {t.manpower} عامل، {t.equipment} معدة
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StandardDialog>
  );
}
