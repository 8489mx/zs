import { useState } from 'react';
import {
  useReconciliationExceptionsQuery,
  useRunReconciliationScanMutation,
  useResolveReconciliationExceptionMutation,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  RefreshCwIcon,
  CheckShieldIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export default function ImportReconciliationManager() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const { data: exceptions = [], isLoading, refetch } = useReconciliationExceptionsQuery(filterStatus || undefined);
  const runScanMutation = useRunReconciliationScanMutation();
  const resolveExceptionMutation = useResolveReconciliationExceptionMutation();

  const [selectedExceptionForResolve, setSelectedExceptionForResolve] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const openCount = exceptions.filter((e: any) => e.status === 'open').length;
  const criticalCount = exceptions.filter((e: any) => e.severity === 'critical' && e.status === 'open').length;
  const resolvedCount = exceptions.filter((e: any) => e.status === 'resolved').length;
  const openDiscrepancySum = exceptions
    .filter((e: any) => e.status === 'open')
    .reduce((sum: number, e: any) => sum + Number(e.discrepancy_amount_egp || 0), 0);

  const handleRunScan = async () => {
    try {
      const res = await runScanMutation.mutateAsync();
      const count = res?.issuesFound || res?.exceptionsCreated || 0;
      toast.success(`اكتمل الفحص الآلي الذكي: تم فحص وتدقيق كافة الحركات (${count} ملاحظة مستحدثة)`);
      refetch();
    } catch (err: any) {
      toast.error('فشل تشغيل فحص المطابقة: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleResolve = async () => {
    if (!selectedExceptionForResolve) return;
    try {
      await resolveExceptionMutation.mutateAsync({
        id: selectedExceptionForResolve.id,
        resolutionNotes,
      });
      toast.success('تمت تسوية الملاحظة الرقابية وإغلاق الاستثناء بنجاح');
      setSelectedExceptionForResolve(null);
      setResolutionNotes('');
      refetch();
    } catch (err: any) {
      toast.error('فشل تسوية الاستثناء: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  return (
    <div dir="rtl" style={{ width: 'min(100%, 1280px)', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: '3px', height: '18px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              مركز مطابقة الاستيراد وتسوية الفروقات (Audit & Reconciliation)
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            الفحص الآلي الذكي لاكتشاف تسريب التكاليف، العهد الجمركية العالقة، وتأمينات الخطوط الملاحية غير المستردة
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => refetch()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCwIcon size={14} />
            تحديث
          </button>

          <button
            onClick={handleRunScan}
            disabled={runScanMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: runScanMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <CheckShieldIcon size={15} />
            {runScanMutation.isPending ? 'جاري الفحص الآلي...' : 'تشغيل فحص المطابقة الشامل'}
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>فروقات معلقة غير مسواة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>{openCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>استثناءات تتطلب تدقيقاً فورياً</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>ملاحظات رقابية حرجة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>{criticalCount}</div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 4 }}>تمنع الإقفال النهائي للمشاريع</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>إجمالي الفروق المالية المحتملة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#170e5e' }}>{formatCurrency(openDiscrepancySum)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>مبالغ مستحقة للشركة أو عليها</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>استثناءات تمت تسويتها</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>{resolvedCount}</div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: 4 }}>معالجة دفترياً ومغلقة</div>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
        {[
          { key: '', label: 'كافة الاستثناءات' },
          { key: 'open', label: 'المفتوحة والمعلقة' },
          { key: 'resolved', label: 'تمت تسويتها' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid ' + (filterStatus === tab.key ? '#170e5e' : '#e2e8f0'),
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterStatus === tab.key ? '#170e5e' : '#f8fafc',
              color: filterStatus === tab.key ? '#ffffff' : '#475569',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Exceptions Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري تحميل نتائج المطابقة...</div>
        ) : exceptions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#166534', fontSize: '13px', backgroundColor: '#f0fdf4' }}>
            الدفاتر مطابقة 100%! لا توجد أي استثناءات أو عهد معلقة أو فروق تكلفة مكتشفة حالياً.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>تاريخ الاكتشاف</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>النطاق والنوع</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>درجة الخطورة</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>بيان الفارق الرقابي</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>قيمة الفارق (ج.م)</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b' }}>
                      {new Date(e.created_at || Date.now()).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                      {e.exception_type || 'مطابقة عامة'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: e.severity === 'critical' ? '#fee2e2' : e.severity === 'warning' ? '#fef3c7' : '#e0f2fe',
                          color: e.severity === 'critical' ? '#991b1b' : e.severity === 'warning' ? '#92400e' : '#0369a1',
                        }}
                      >
                        {e.severity === 'critical' ? 'حرج' : e.severity === 'warning' ? 'تنبيه' : 'معلومة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#334155', maxWidth: 320 }}>
                      {e.description || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, color: '#170e5e' }}>
                      {formatCurrency(e.discrepancy_amount_egp)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: e.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                          color: e.status === 'resolved' ? '#166534' : '#92400e',
                        }}
                      >
                        {e.status === 'resolved' ? 'تمت التسوية' : 'معلق'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {e.status === 'open' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExceptionForResolve(e);
                            setResolutionNotes('');
                          }}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            border: '1px solid #170e5e',
                            backgroundColor: '#ffffff',
                            color: '#170e5e',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          تسوية الاستثناء
                        </button>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {e.resolution_notes || 'مسوّى'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Resolve Exception Dialog */}
      <StandardDialog
        open={Boolean(selectedExceptionForResolve)}
        onClose={() => setSelectedExceptionForResolve(null)}
        title="تسوية ملاحظة مطابقة رقابية"
        subtitle="توثيق معالجة الفارق الحسابي وإقفال الملاحظة في سجل التدقيق"
        width="520px"
      >
        {selectedExceptionForResolve && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px' }}>
              <div style={{ fontSize: '12.5px', marginBottom: 4 }}>
                <strong>النوع:</strong> {selectedExceptionForResolve.exception_type}
              </div>
              <div style={{ fontSize: '12.5px', marginBottom: 4 }}>
                <strong>قيمة الفارق:</strong> {formatCurrency(selectedExceptionForResolve.discrepancy_amount_egp)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <strong>الوصف:</strong> {selectedExceptionForResolve.description}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                بيان التسوية والمبرر المحاسبي الإلزامي:
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="اذكر كيف تمت معالجة الفارق (مثال: تم إرفاق إيصال الرسوم الجمركية المفقود برقم...)"
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedExceptionForResolve(null)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={resolveExceptionMutation.isPending || !resolutionNotes.trim()}
                onClick={handleResolve}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: resolveExceptionMutation.isPending || !resolutionNotes.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {resolveExceptionMutation.isPending ? 'جاري التسوية...' : 'تأكيد تسوية الاستثناء'}
              </button>
            </div>
          </div>
        )}
      </StandardDialog>
    </div>
  );
}
