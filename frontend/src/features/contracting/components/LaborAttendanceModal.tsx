import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingLaborAttendance } from '../contracting.types';

interface LaborAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export function LaborAttendanceModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: LaborAttendanceModalProps) {
  const [records, setRecords] = useState<ContractingLaborAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [workerName, setWorkerName] = useState('');
  const [trade, setTrade] = useState('حداد مسلح');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [regularHours, setRegularHours] = useState<number>(8);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [dailyWage, setDailyWage] = useState<number>(300);
  const [allocatedProjectSharePercent, setAllocatedProjectSharePercent] = useState<number>(100);
  const [taskDescription, setTaskDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await contractingApi.getLaborAttendance(projectId ? { projectId } : undefined);
      setRecords(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحميل سجل يوميات العمالة');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
      setIsAdding(false);
    }
  }, [isOpen, loadRecords]);

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      setErrorMsg('يرجى كتابة اسم العامل أو الفني');
      return;
    }
    if (!dailyWage || dailyWage <= 0) {
      setErrorMsg('يرجى تحديد اليومية المستحقة');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await contractingApi.createLaborAttendance(projectId || '', {
        workerName: workerName.trim(),
        trade: trade.trim(),
        workDate,
        regularHours: Number(regularHours),
        overtimeHours: Number(overtimeHours || 0),
        dailyWage: Number(dailyWage),
        allocatedProjectSharePercent: Number(allocatedProjectSharePercent || 100),
        taskDescription: taskDescription.trim() || undefined,
      });
      setIsAdding(false);
      setWorkerName('');
      setOvertimeHours(0);
      setTaskDescription('');
      await loadRecords();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تسجيل يومية العامل');
    } finally {
      setSaving(false);
    }
  };

  const totalCost = records.reduce((sum, r) => sum + Number(r.calculatedCost || 0), 0);
  const totalHours = records.reduce((sum, r) => sum + Number(r.regularHours || 0) + Number(r.overtimeHours || 0), 0);

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="يوميات وتوزيع العمالة الميدانية (Site Labor & Shift Allocation)"
      maxWidth="900px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
              حصر حضور العمالة وتوزيع التكلفة على المشروعات
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
              {projectName ? `المشروع: ${projectName}` : 'تسجيل ساعات العمل العادية والإضافية وتقسيم اليومية'}
            </div>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontWeight: 700,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.Plus size={14} />
              <span>تسجيل يومية عامل / صنايعي</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي تكلفة العمالة المحملة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي ساعات العمل المنفذة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {totalHours.toFixed(1)} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>ساعة</span>
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>عدد السجلات الموثقة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {records.length}
            </div>
          </div>
        </div>

        {/* نموذج إضافة يومية */}
        {isAdding && (
          <form
            onSubmit={handleCreateAttendance}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
              تسجيل وردية عمل وصرف مصنعية
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اسم العامل / الصنايعي
                </label>
                <input
                  type="text"
                  required
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  المهنة / التخصص
                </label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                >
                  <option value="حداد مسلح">حداد مسلح</option>
                  <option value="نجار مسلح">نجار مسلح</option>
                  <option value="بنا">بنا</option>
                  <option value="مبيض محارة">مبيض محارة</option>
                  <option value="سباك صحي">سباك صحي</option>
                  <option value="كهربائي">كهربائي</option>
                  <option value="مبلط سيراميك">مبلط سيراميك</option>
                  <option value="عامل عادي / مساعد">عامل عادي / مساعد</option>
                  <option value="سائق معدة">سائق معدة</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ العمل
                </label>
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ساعات العمل العادية
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  required
                  value={regularHours}
                  onChange={(e) => setRegularHours(Number(e.target.value))}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  الساعات الإضافية (Overtime)
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(Number(e.target.value))}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اليومية الكاملة (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={dailyWage}
                  onChange={(e) => setDailyWage(Number(e.target.value))}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  نسبة التحميل على المشروع %
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={allocatedProjectSharePercent}
                  onChange={(e) => setAllocatedProjectSharePercent(Number(e.target.value))}
                  title="إذا عمل في مشروعين يتم إدخال 50% أو النسبة المناسبة"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                بيان الأعمال المنفذة في الوردية
              </label>
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="مثال: تسليح سقف الدور الأول وعمل كوابيل البلكونات"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                {saving ? 'جاري الحفظ...' : 'تسجيل اليومية'}
              </button>
            </div>
          </form>
        )}

        {/* جدول السجلات */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جاري تحميل اليوميات...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد يوميات مسجلة لهذا المشروع</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>العامل / الفني</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التخصص</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التاريخ</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>ساعات العمل</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>اليومية</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>نسبة التحميل</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التكلفة المحسوبة</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>البيان</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                      {r.workerName}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {r.trade}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                      {r.workDate}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#0f172a' }}>
                      {r.regularHours} س {Number(r.overtimeHours) > 0 ? `+ ${r.overtimeHours} إضافي` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {Number(r.dailyWage).toLocaleString('en-US')} ج.م
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0369a1' }}>
                      {r.allocatedProjectSharePercent}%
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                      {Number(r.calculatedCost).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b', maxWidth: '200px' }}>
                      {r.taskDescription || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}