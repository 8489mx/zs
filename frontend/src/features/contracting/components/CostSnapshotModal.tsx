import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import { ContractingCostSnapshot } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface CostSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  onSnapshotCreated?: () => void;
}

export function CostSnapshotModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  onSnapshotCreated,
}: CostSnapshotModalProps) {
  const { currencySymbol, formatCurrency } = useSystemCurrency();
  const [snapshots, setSnapshots] = useState<ContractingCostSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    loadSnapshots();
  }, [isOpen, projectId]);

  const loadSnapshots = () => {
    setLoading(true);
    contractingApi
      .getCostSnapshots(projectId)
      .then((data) => setSnapshots(data))
      .catch((err) => console.error('Failed to load cost snapshots:', err))
      .finally(() => setLoading(false));
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await contractingApi.createCostSnapshot(projectId, { snapshotName: snapshotName.trim() });
      setSnapshotName('');
      setSuccessMsg('تم تجميد وحفظ لقطة ميزانية وتكاليف المشروع بنجاح');
      loadSnapshots();
      if (onSnapshotCreated) onSnapshotCreated();
    } catch (err: any) {
      console.error('Failed to create cost snapshot:', err);
      setErrorMsg(err?.message || 'تعذر حفظ لقطة تجميد الميزانية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title="تجميد ميزانية وتكاليف المشروع (Cost Baseline Lock & Snapshots)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'حفظ لقطة مرجعية ثابتة غير قابلة للتعديل لمقايسة وتكاليف المشروع'}
      width="min(760px, 95vw)"
      minHeight="min(520px, 85vh)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: 'var(--font-body)' }}>
            {successMsg}
          </div>
        )}

        {/* نموذج حفظ لقطة جديدة */}
        <form onSubmit={handleCreateSnapshot} style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-subtitle)', fontWeight: 700, color: '#1e293b' }}>
            تجميد لقطة جديدة للميزانية التعاقدية (Baseline Snapshot)
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
            تجميد الأسعار يحفظ نسخة كاملة من المقايسة وتكاليف البنود في هذه اللحظة كمرجع تاريخي للمقارنة والرقابة ضد أي تعديلات مستقبلية.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="مثال: الميزانية المعتمدة عند توقيع العقد، الميزانية بعد الملحق 1..."
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              required
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
              }}
            />
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving ? 'جارٍ التجميد...' : 'تجميد وحفظ اللقطة'}
            </button>
          </div>
        </form>

        {/* سجل اللقطات المحفوظة */}
        <div>
          <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-subtitle)', fontWeight: 700, color: '#334155' }}>
            سجل اللقطات المجمدة للمشروع:
          </h4>
          <div
            style={{
              minHeight: '200px',
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading ? (
              <div style={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#64748b', backgroundColor: '#f8fafc' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}>جارٍ تحميل لقطات الميزانية المجمدة...</span>
              </div>
            ) : snapshots.length === 0 ? (
              <div style={{ flex: 1, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '24px' }}>
                لم يتم حفظ أي لقطات مجمدة لميزانية هذا المشروع بعد.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8fafc' }}>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>عنوان اللقطة</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>تاريخ التجميد</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>إجمالي القيمة ({currencySymbol})</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التكلفة التقديرية ({currencySymbol})</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                        {s.snapshotName}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', color: '#64748b' }}>
                        {new Date(s.lockedAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#170e5e' }}>
                        {formatCurrency(s.totalContractValue)}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {formatCurrency(s.totalBudgetCost)}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: 'var(--font-badge)',
                            fontWeight: 600,
                            backgroundColor: '#eef2ff',
                            color: '#170e5e',
                          }}
                        >
                          مجمدة ومحمية
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
