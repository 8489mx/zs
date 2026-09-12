import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingClientPaymentMilestone } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface ClientMilestonesModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  contractValue?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClientMilestonesModal({
  open,
  projectId,
  projectName = '',
  contractValue = 0,
  onClose,
  onSuccess,
}: ClientMilestonesModalProps) {
  const { currencySymbol, formatCurrency } = useSystemCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<ContractingClientPaymentMilestone[]>([]);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [barterMilestone, setBarterMilestone] = useState<ContractingClientPaymentMilestone | null>(null);

  // New milestone form state
  const [milestoneName, setMilestoneName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [requiredProgress, setRequiredProgress] = useState<number | ''>(0);
  const [scheduledAmount, setScheduledAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Barter deduction form state
  const [unitRef, setUnitRef] = useState('');
  const [valuation, setValuation] = useState<number | ''>('');
  const [barterNotes, setBarterNotes] = useState('');

  const loadMilestones = async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: any = await contractingApi.getClientPaymentMilestones(projectId);
      const list = Array.isArray(data) ? data : (data?.milestones || []);
      setMilestones(list);
    } catch (err: any) {
      console.error('Failed to load milestones:', err);
      setErrorMsg(err?.message || 'فشل تحميل دفعات ومستحقات العميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      loadMilestones();
      setShowAddMilestone(false);
      setBarterMilestone(null);
    }
  }, [open, projectId]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneName.trim()) {
      setErrorMsg('يرجى كتابة اسم الدفعة أو المرحلة');
      return;
    }
    const numAmount = Number(scheduledAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await contractingApi.createClientPaymentMilestone(projectId, {
        milestoneName: milestoneName.trim(),
        dueDate: dueDate || undefined,
        requiredProgressPercent: Number(requiredProgress) || 0,
        scheduledAmount: numAmount,
        notes: notes.trim() || undefined,
      });

      setMilestoneName('');
      setDueDate('');
      setRequiredProgress(0);
      setScheduledAmount('');
      setNotes('');
      setShowAddMilestone(false);
      await loadMilestones();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to create milestone:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordBarter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barterMilestone) return;
    if (!unitRef.trim()) {
      setErrorMsg('يرجى تحديد رقم وبيانات الوحدة العقارية المقايضة');
      return;
    }
    const numValuation = Number(valuation);
    if (isNaN(numValuation) || numValuation <= 0) {
      setErrorMsg('يرجى إدخال تقييم مالي صحيح للوحدة');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await contractingApi.recordInKindBarterDeduction(barterMilestone.id, {
        inKindUnitRef: unitRef.trim(),
        inKindValuation: numValuation,
        notes: barterNotes.trim() || undefined,
      });

      setBarterMilestone(null);
      setUnitRef('');
      setValuation('');
      setBarterNotes('');
      await loadMilestones();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to record barter:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسوية الوحدة العينية');
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const totalScheduled = safeMilestones.reduce((sum, m) => sum + Number(m.scheduledAmount || 0), 0);
  const totalReceivedCash = safeMilestones.reduce((sum, m) => sum + Number(m.receivedAmount || 0), 0);
  const totalBarterValuation = safeMilestones.reduce((sum, m) => sum + Number(m.inKindValuation || 0), 0);
  const totalSettled = totalReceivedCash + totalBarterValuation;
  const totalRemaining = Math.max(0, (contractValue || totalScheduled) - totalSettled);

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="جدول دفعات العميل والتسويات العينية (المقايضة بالوحدات)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'متابعة استحقاق الدفعات، ونسب الإنجاز المشروطة، وخصم الوحدات العقارية المسلمة'}
      width="min(1100px, 95vw)"
      minHeight="min(600px, 85vh)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
            يتم خصم قيمة الوحدات العينية تلقائياً من ذمة العميل وتوثيقها محاسبياً كدفعة مسددة.
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
            إغلاق النافذة
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>قيمة التعاقد المقررة</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(contractValue || totalScheduled)}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#166534', fontWeight: 600 }}>المسدد نقدياً وبنكياً</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalReceivedCash)}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#1e40af', fontWeight: 600 }}>المقايضة العينية (وحدات)</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalBarterValuation)}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#9a3412', fontWeight: 600 }}>المتبقي المستحق على العميل</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalRemaining)}
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            جدول استحقاقات ومحطات الدفع ({milestones.length} دفعة)
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowAddMilestone(!showAddMilestone);
              setBarterMilestone(null);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: showAddMilestone ? '#f1f5f9' : '#170e5e',
              color: showAddMilestone ? '#334155' : '#ffffff',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {showAddMilestone ? <AppIcons.X size={15} /> : <AppIcons.Plus size={15} />}
            <span>{showAddMilestone ? 'إلغاء الإضافة' : 'إضافة دفعة / مرحلة جديدة'}</span>
          </button>
        </div>

        {/* Add Milestone Form */}
        {showAddMilestone && (
          <form
            onSubmit={handleCreateMilestone}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              إدراج مرحلة دفع جديدة في العقد
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اسم الدفعة أو المحطة *
                </label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  placeholder="مثال: دفعة صب سقف الدور الثالث..."
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  قيمة الدفعة ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={scheduledAmount}
                  onChange={(e) => setScheduledAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  نسبة الإنجاز المطلوبة %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={requiredProgress}
                  onChange={(e) => setRequiredProgress(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="مثال: 35%"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ الاستحقاق التقريبي
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                شروط واستحقاق الدفعة
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تُستحق بعد اعتماد مكعبات الخرسانة أو استلام مهندس المالك..."
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAddMilestone(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: 'var(--font-body)',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '7px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: 'var(--font-body)',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ الدفعة في الجدول'}
              </button>
            </div>
          </form>
        )}

        {/* Barter Modal Subform (when clicking "تسوية عينية / شقة") */}
        {barterMilestone && (
          <form
            onSubmit={handleRecordBarter}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #93c5fd',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 'var(--font-body)' }}>
                تسجيل تسوية عينية (مقايضة وحدة/شقة) على دفعة: {barterMilestone.milestoneName}
              </div>
              <button
                type="button"
                onClick={() => setBarterMilestone(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <AppIcons.X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                  بيانات ورقم الوحدة المقايضة *
                </label>
                <input
                  type="text"
                  value={unitRef}
                  onChange={(e) => setUnitRef(e.target.value)}
                  placeholder="مثال: شقة رقم 102 - الدور الأول علوي - برج A..."
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #93c5fd',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                  قيمة الوحدة الدفترية المتفق عليها ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={valuation}
                  onChange={(e) => setValuation(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #93c5fd',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                ملاحظات عقد المقايضة وسند التسليم
              </label>
              <input
                type="text"
                value={barterNotes}
                onChange={(e) => setBarterNotes(e.target.value)}
                placeholder="رقم محضر الاستلام أو العقد الابتدائي المبرم مع المالك..."
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #93c5fd',
                  fontSize: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setBarterMilestone(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: 'var(--font-body)',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '6px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1e40af',
                  color: '#ffffff',
                  fontSize: 'var(--font-body)',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'جارٍ الاعتماد...' : 'اعتماد تسوية الوحدة وخصمها من المستحقات'}
              </button>
            </div>
          </form>
        )}

        {/* Milestones Table */}
        <div
          style={{
            minHeight: '280px',
            maxHeight: '380px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', gap: '12px', backgroundColor: '#f8fafc', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}>
                جارٍ تحميل جدول الدفعات ومحطات الاستحقاق...
              </span>
            </div>
          ) : safeMilestones.length === 0 ? (
            <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '36px', textAlign: 'center', color: '#64748b' }}>
              <AppIcons.FileText size={32} style={{ color: '#94a3b8' }} />
              <div style={{ fontWeight: 600 }}>لم يتم إدراج جدول دفعات تعاقدية لهذا المشروع بعد.</div>
              <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>
                اضغط على "إضافة دفعة / مرحلة جديدة" لتسجيل دفعات المستخلصات والمقايضة العينية.
              </div>
            </div>
          ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المرحلة / الدفعة</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>القيمة المقررة</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المسدد نقداً</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المقايضة العينية (وحدة)</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>نسبة الإنجاز المشروطة</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>تاريخ الاستحقاق</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {safeMilestones.map((m) => {
                    const isFullySettled = Number(m.receivedAmount || 0) + Number(m.inKindValuation || 0) >= Number(m.scheduledAmount || 0);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                          {m.milestoneName}
                          {m.notes && (
                            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                              {m.notes}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(m.scheduledAmount)}
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#15803d', fontWeight: 600 }}>
                          {formatCurrency(m.receivedAmount)}
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)' }}>
                          {Number(m.inKindValuation || 0) > 0 ? (
                            <div>
                              <span style={{ fontWeight: 700, color: '#1e40af' }}>
                                {formatCurrency(m.inKindValuation)}
                              </span>
                              {m.inKindUnitRef && (
                                <div style={{ fontSize: 'var(--font-micro)', color: '#475569' }}>
                                  وحدة: {m.inKindUnitRef}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569' }}>
                          {m.requiredProgressPercent ? `${m.requiredProgressPercent}% إنجاز` : 'عند التعاقد'}
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#64748b' }}>
                          {m.dueDate || '-'}
                        </td>

                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              backgroundColor: isFullySettled ? '#dcfce7' : Number(m.inKindValuation || 0) > 0 ? '#dbeafe' : '#fef3c7',
                              color: isFullySettled ? '#15803d' : Number(m.inKindValuation || 0) > 0 ? '#1e40af' : '#b45309',
                            }}
                          >
                            {isFullySettled ? 'مسددة بالكامل' : Number(m.inKindValuation || 0) > 0 ? 'تسوية عينية' : 'مستحقة'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {!isFullySettled && (
                            <button
                              type="button"
                              onClick={() => {
                                setBarterMilestone(m);
                                setShowAddMilestone(false);
                                setValuation(Number(m.scheduledAmount || 0) - Number(m.receivedAmount || 0));
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #93c5fd',
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                fontSize: 'var(--font-micro)',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              مقايضة وحدة
                            </button>
                          )}
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
