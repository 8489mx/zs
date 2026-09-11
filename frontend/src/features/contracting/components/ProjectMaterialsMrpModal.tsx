import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import { ProjectMaterialRequirementsSummary } from '../contracting.types';

interface ProjectMaterialsMrpModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

export function ProjectMaterialsMrpModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: ProjectMaterialsMrpModalProps) {
  const [summary, setSummary] = useState<ProjectMaterialRequirementsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    setErrorMsg(null);
    contractingApi
      .getProjectMaterialRequirements(projectId)
      .then((data) => setSummary(data))
      .catch((err) => {
        console.error('Failed to load project material requirements:', err);
        setErrorMsg('تعذر تحميل حصر احتياجات المواد للمشروع');
      })
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  const filteredItems = (summary?.items || []).filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="حصر الاحتياج الكلي لخامات وموارد المشروع (Material Requirements Planning - MRP)"
      subtitle={`تحليل كامل ومفصل لإجمالي كميات الأسمنت، الحديد، الرمل، المصنعيات والمعدات اللازمة لكامل المشروع: ${projectName || ''}`}
      maxWidth="850px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {/* كروت الإجماليات */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي أصناف المواد والموارد</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: '#1e293b', marginTop: '4px' }}>
              {summary?.totalDistinctMaterialsCount || 0} صنف
            </strong>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#4338ca' }}>إجمالي التكلفة التقديرية للخامات</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: '#170e5e', marginTop: '4px' }}>
              {(summary?.totalMaterialsCost || 0).toLocaleString()} ر.س
            </strong>
          </div>
        </div>

        {/* شريط البحث */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="ابحث عن خامة (مثلاً: أسمنت، حديد، رمل، سن، خرسانة)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: 'var(--font-body)',
            }}
          />
        </div>

        {/* جدول حصر المواد والموارد */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
            جارٍ تحليل مقايسة المشروع وحصر إجمالي الخامات والمعدات...
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>كود المورد</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>اسم الخامة / المورد</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الوحدة</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الكمية المطلوبة بالمشروع</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المنصرف للموقع فعلياً</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المتبقي للتوريد</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>نسبة التشوين</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد خامات مسجلة للمشروع حتى الآن
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#64748b' }}>
                        {item.code}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {item.unit}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                        {item.requiredQuantity.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#0284c7', fontWeight: 600 }}>
                        {item.dispatchedQuantity.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: item.remainingQuantity > 0 ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                        {item.remainingQuantity.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', width: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.fulfillmentPercent}%`,
                                height: '100%',
                                backgroundColor: item.fulfillmentPercent >= 100 ? '#16a34a' : '#170e5e',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', minWidth: '32px' }}>
                            {item.fulfillmentPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
