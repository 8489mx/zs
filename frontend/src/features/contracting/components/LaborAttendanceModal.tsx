import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import { ContractingLaborAttendance, ContractingBoqItem } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface LaborAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  boqItems?: ContractingBoqItem[];
}

const TRADE_OPTIONS = [
  { value: 'حداد مسلح', label: 'حداد مسلح' },
  { value: 'نجار مسلح', label: 'نجار مسلح' },
  { value: 'بنا', label: 'بنا' },
  { value: 'مبيض محارة', label: 'مبيض محارة' },
  { value: 'سباك صحي', label: 'سباك صحي' },
  { value: 'كهربائي', label: 'كهربائي' },
  { value: 'مبلط سيراميك', label: 'مبلط سيراميك' },
  { value: 'عامل عادي / مساعد', label: 'عامل عادي / مساعد' },
  { value: 'سائق معدة', label: 'سائق معدة' },
  { value: 'مشرف تنفيذ', label: 'مشرف تنفيذ' },
];

export function LaborAttendanceModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  boqItems = [],
}: LaborAttendanceModalProps) {
  const { currencySymbol, formatCurrency } = useSystemCurrency();
  const [records, setRecords] = useState<ContractingLaborAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [workerName, setWorkerName] = useState('');
  const [trade, setTrade] = useState('حداد مسلح');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [regularHours, setRegularHours] = useState<number>(8);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [overtimeRate, setOvertimeRate] = useState<number>(40);
  const [nightShiftAllowance, setNightShiftAllowance] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [dailyWage, setDailyWage] = useState<number>(350);
  const [allocatedProjectSharePercent, setAllocatedProjectSharePercent] = useState<number>(100);
  void nightShiftAllowance; void bonusAmount; void deductionAmount;
  const [selectedBoqId, setSelectedBoqId] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const boqSelectOptions = [
    { value: '', label: 'بدون ربط ببند محدد (مصروف موقع عام)' },
    ...boqItems.map((item) => ({
      value: item.id,
      label: `[${item.itemCode}] ${item.description.slice(0, 45)}...`,
    })),
  ];

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

    const selectedItem = boqItems.find((b) => b.id === selectedBoqId);

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
        boqItemId: selectedBoqId || undefined,
        boqItemCode: selectedItem?.itemCode || undefined,
      });

      setIsAdding(false);
      setWorkerName('');
      setOvertimeHours(0);
      setNightShiftAllowance(0);
      setBonusAmount(0);
      setDeductionAmount(0);
      setSelectedBoqId('');
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
      title="يوميات وتوزيع العمالة والمصنعيات على بنود المقايسة"
      subtitle={projectName ? `المشروع: ${projectName}` : 'تسجيل يوميات العمالة، وساعات العمل الإضافية، والسهرات الليلية، والربط بالبنود'}
      width="min(1100px, 95vw)"
      minHeight="min(600px, 85vh)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
            ربط اليومية ببند المقايسة يحسب التكلفة الفعلية للمصنعيات بالبند بدقة فورية.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 22px',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }} dir="rtl">
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
              {loading ? '—' : formatCurrency(totalCost)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي ساعات العمل المسجلة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '—' : `${totalHours} ساعة`}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>عدد السجلات اليومية</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '—' : `${records.length} سجل`}
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            كشف حضور ومصنعيات الموقع
          </h3>
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            style={{
              height: '34px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 700,
              background: isAdding ? '#f1f5f9' : '#170e5e',
              color: isAdding ? '#334155' : '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--font-body)',
            }}
          >
            {isAdding ? <AppIcons.X size={14} /> : <AppIcons.Plus size={14} />}
            <span>{isAdding ? 'إلغاء الإضافة' : 'تسجيل يومية عامل / صنايعي'}</span>
          </button>
        </div>

        {/* نموذج إضافة يومية */}
        {isAdding && (
          <form
            onSubmit={handleCreateAttendance}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
              تسجيل وردية عمل وساعات إضافية وربط بالبند
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1.5fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اسم العامل / الصنايعي *
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
                  المهنة / التخصص *
                </label>
                <CustomSelect
                  value={trade}
                  options={TRADE_OPTIONS}
                  onChange={(val) => setTrade(val)}
                  placeholder="اختر المهنة..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ العمل *
                </label>
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  بند المقايسة المستهدف
                </label>
                <CustomSelect
                  value={selectedBoqId}
                  options={boqSelectOptions}
                  onChange={(val) => setSelectedBoqId(val)}
                  placeholder="اختر بند المقايسة..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اليومية الأساسية ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={dailyWage}
                  onChange={(e) => setDailyWage(Number(e.target.value))}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)', background: '#fff', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ساعات العمل الأساسية
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
                  ساعات إضافية (سهرة)
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
                  سعر الساعة الإضافية
                </label>
                <input
                  type="number"
                  min="0"
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(Number(e.target.value))}
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
                style={{ height: '32px', padding: '0 18px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                {saving ? 'جاري الحفظ...' : 'تسجيل اليومية وترحيلها'}
              </button>
            </div>
          </form>
        )}

        {/* جدول السجلات */}
        <div
          style={{
            minHeight: '280px',
            maxHeight: '380px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', gap: '12px', backgroundColor: '#f8fafc', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}>
                جارٍ تحميل يوميات العمالة والمصنعيات...
              </span>
            </div>
          ) : records.length === 0 ? (
            <div style={{ flex: 1, minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '32px' }}>
              لا توجد يوميات مسجلة لهذا المشروع
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8fafc' }}>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>العامل / الفني</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التخصص</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>البند المربوط</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التاريخ</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>ساعات العمل</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>اليومية</th>
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
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#170e5e', fontWeight: 600 }}>
                      {r.boqItemCode ? (
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eef2ff' }}>
                          {r.boqItemCode}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>عام</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                      {r.workDate}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#0f172a' }}>
                      {r.regularHours} س {Number(r.overtimeHours) > 0 ? `+ ${r.overtimeHours} إضافي` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {formatCurrency(r.dailyWage)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                      {formatCurrency(r.calculatedCost)}
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