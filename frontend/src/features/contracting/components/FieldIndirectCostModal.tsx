import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import type {
  CostPool,
  IndirectExpense,
  AllocationBatch,
  BatchAllocationSummary,
} from '../contracting.types';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface FieldIndirectCostModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onChanged?: () => void;
}

const POOL_TYPE_LABELS: Record<string, string> = {
  labor_care: 'سكن وإعاشة وانتقالات',
  labor_burden: 'أعباء وتأمينات العمالة',
  equipment_shared: 'معدات ومولدات مشتركة',
  site_supervision: 'إشراف وإدارة الموقع',
  custom: 'وعاء مخصص',
};

const DRIVER_TYPE_LABELS: Record<string, string> = {
  labor_days: 'أيام العمالة (Man-Days)',
  labor_cost: 'أجور العمالة المباشرة',
  equipment_hours: 'ساعات تشغيل المعدات',
  direct_effort: 'الجهد الميداني (عمالة + معدات)',
  manual_ratio: 'نسبة يدوية محددة',
};

export function FieldIndirectCostModal({
  open,
  projectId,
  projectName = '',
  onClose,
  onChanged,
}: FieldIndirectCostModalProps) {
  const { currencySymbol, formatCurrency } = useSystemCurrency();

  const [activeTab, setActiveTab] = useState<'pools' | 'expenses' | 'run' | 'history'>('pools');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [pools, setPools] = useState<CostPool[]>([]);
  const [expenses, setExpenses] = useState<IndirectExpense[]>([]);
  const [batches, setBatches] = useState<AllocationBatch[]>([]);

  // Add Expense Form
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [recoveredAmount, setRecoveredAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherRef, setVoucherRef] = useState('');

  // Run Allocation Batch Form
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [deferredInAmount, setDeferredInAmount] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [previewSummary, setPreviewSummary] = useState<BatchAllocationSummary | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [poolsRes, expensesRes, batchesRes] = await Promise.all([
        contractingApi.getCostPools(projectId),
        contractingApi.getIndirectExpenses(projectId),
        contractingApi.getAllocationBatches(projectId),
      ]);
      setPools(poolsRes || []);
      setExpenses(expensesRes || []);
      setBatches(batchesRes || []);

      if (poolsRes && poolsRes.length > 0 && !selectedPoolId) {
        setSelectedPoolId(poolsRes[0].id);
      }
    } catch (err: any) {
      toast.error('تعذر تحميل بيانات المصاريف غير المباشرة وأوعية التكاليف');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) {
      fetchData();
      setPreviewSummary(null);
    }
  }, [open, projectId, fetchData]);

  // Aggregate Metrics
  const totalGrossIncurred = expenses.reduce((sum, e) => sum + Number(e.grossAmount || 0), 0);
  const totalBackchargesRecovered = expenses.reduce((sum, e) => sum + Number(e.recoveredAmount || 0), 0);
  const totalNetDistributable = expenses.reduce((sum, e) => sum + Number(e.netAmount || 0), 0);
  const totalBatchesAllocated = batches.reduce((sum, b) => sum + Number(b.totalAllocatedAmount || 0), 0);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolId) {
      toast.warning('يرجى اختيار وعاء التكلفة');
      return;
    }
    if (!expenseTitle.trim()) {
      toast.warning('يرجى كتابة بيان المصروف');
      return;
    }
    const gross = Number(grossAmount);
    if (isNaN(gross) || gross <= 0) {
      toast.warning('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const rec = recoveredAmount ? Number(recoveredAmount) : 0;
    if (rec > gross) {
      toast.warning('قيمة الاستقطاع المسترد لا يمكن أن تتجاوز قيمة المصروف الإجمالي');
      return;
    }

    setSubmitting(true);
    try {
      await contractingApi.createIndirectExpense(projectId, {
        poolId: selectedPoolId,
        expenseTitle: expenseTitle.trim(),
        grossAmount: gross,
        recoveredAmount: rec,
        expenseDate,
        voucherRef: voucherRef.trim() || undefined,
      });

      toast.success('تم تسجيل المصروف غير المباشر وربطه بالوعاء بنجاح');
      setExpenseTitle('');
      setGrossAmount('');
      setRecoveredAmount('');
      setVoucherRef('');
      await fetchData();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewAllocation = async () => {
    if (!periodStart || !periodEnd) {
      toast.warning('يرجى تحديد تاريخ بداية ونهاية الفترة');
      return;
    }

    setIsPreviewing(true);
    try {
      const summary = await contractingApi.previewBatchAllocation(projectId, {
        periodStart,
        periodEnd,
        deferredInAmount: deferredInAmount ? Number(deferredInAmount) : 0,
        notes: batchNotes.trim() || undefined,
      });
      setPreviewSummary(summary);
      toast.info('تم احتساب المعاينة الفورية لتوزيع الأوعية على البنود');
    } catch (err: any) {
      toast.error(err?.message || 'فشل احتساب معاينة التوزيع');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePostBatch = async () => {
    if (!previewSummary) {
      toast.warning('يرجى إجراء المعاينة أولاً قبل الاعتماد');
      return;
    }

    const confirmed = await systemConfirm({
      title: 'تأكيد اعتماد دورة توزيع المصاريف غير المباشرة',
      message: `هل أنت متأكد من اعتماد دفعة التوزيع بمبلغ إجمالي ${formatCurrency(previewSummary.totalAllocated)}؟ سيتم ترحيل التكاليف رسمياً وتحديث التكلفة الفعلية لبنود المقايسة.`,
      confirmText: 'نعم، اعتماد وترحيل التكاليف',
      cancelText: 'إلغاء',
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      await contractingApi.postBatchAllocation(projectId, {
        periodStart,
        periodEnd,
        deferredInAmount: deferredInAmount ? Number(deferredInAmount) : 0,
        notes: batchNotes.trim() || undefined,
      });

      toast.success('تم اعتماد دفعة التوزيع وترحيل التكاليف لبنود المقايسة بنجاح');
      setPreviewSummary(null);
      await fetchData();
      setActiveTab('history');
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || 'فشل اعتماد دفعة التوزيع');
    } finally {
      setSubmitting(false);
    }
  };

  const poolOptions = pools.map((p) => ({
    value: p.id,
    label: `${p.poolName} (${p.poolCode})`,
    hint: `محرك: ${DRIVER_TYPE_LABELS[p.driverType] || p.driverType}`,
  }));

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="محرك توزيع المصاريف غير المباشرة للموقع (Field Indirects Engine)"
      subtitle={projectName ? `المشروع: ${projectName} — معايير AACE RP 10S-90 / 34R-05 للتوزيع القائم على الأنشطة` : 'توزيع مصاريف السكن والمعدات المشتركة وإشراف الموقع على بنود المقايسة'}
      width="min(1180px, 96vw)"
      minHeight="min(580px, 85vh)"
      compact={true}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
            معايير AACE الدولية: حظر استخدام تكلفة المواد كمحرك توزيع | جبر كسور السنتات بنسبة 100%
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#334155',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }} dir="rtl">
        {/* ملخص المؤشرات العلوية */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي المصاريف المسجلة</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#1e293b', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalGrossIncurred)}
            </strong>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#166534' }}>مسترد من مقاولي الباطن (Backcharges)</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#15803d', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalBackchargesRecovered)}
            </strong>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#1e40af' }}>صافي التكلفة الموزعة (Net Pool Cost)</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#1d4ed8', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalNetDistributable)}
            </strong>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#6b21a8' }}>المرحل للبنود في الدفعات</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#7e22ce', marginTop: '2px' }}>
              {loading ? '—' : formatCurrency(totalBatchesAllocated)}
            </strong>
          </div>
        </div>

        {/* أزرار التبويبات القياسية */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pools')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeTab === 'pools' ? '#170e5e' : '#cbd5e1',
              backgroundColor: activeTab === 'pools' ? '#170e5e' : '#ffffff',
              color: activeTab === 'pools' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.Layers size={15} />
            أوعية التكاليف الأربعة ({pools.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeTab === 'expenses' ? '#170e5e' : '#cbd5e1',
              backgroundColor: activeTab === 'expenses' ? '#170e5e' : '#ffffff',
              color: activeTab === 'expenses' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.PlusCircle size={15} />
            المصاريف الميدانية المسجلة ({expenses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('run')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeTab === 'run' ? '#170e5e' : '#cbd5e1',
              backgroundColor: activeTab === 'run' ? '#170e5e' : '#ffffff',
              color: activeTab === 'run' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.Sliders size={15} />
            تشغيل دورة توزيع دورية
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeTab === 'history' ? '#170e5e' : '#cbd5e1',
              backgroundColor: activeTab === 'history' ? '#170e5e' : '#ffffff',
              color: activeTab === 'history' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.CheckShield size={15} />
            سجل الدفعات المرحلة ({batches.length})
          </button>
        </div>

        {/* جسم التبويبات بحاوية ذات ارتفاع ثابت لمنع التمدد الفجائي */}
        <div
          style={{
            height: '350px',
            minHeight: '350px',
            maxHeight: '350px',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
          className="thin-scrollbar"
        >
          {/* Tab 1: أوعية التكاليف */}
          <div style={{ display: activeTab === 'pools' ? 'block' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {pools.map((p) => {
                const poolExpenses = expenses.filter((e) => e.poolId === p.id);
                const poolGross = poolExpenses.reduce((s, e) => s + e.grossAmount, 0);
                const poolNet = poolExpenses.reduce((s, e) => s + e.netAmount, 0);
                const poolRec = poolExpenses.reduce((s, e) => s + e.recoveredAmount, 0);

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#170e5e' }}>{p.poolName}</span>
                        <small style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          نوع الوعاء: {POOL_TYPE_LABELS[p.poolType] || p.poolType}
                        </small>
                      </div>
                      <span
                        style={{
                          fontSize: 'var(--font-micro)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        {p.poolCode}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 'var(--font-subtitle)', color: '#64748b', lineHeight: 1.4 }}>
                      {p.description || 'وعاء تكلفة ميداني معتمد'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                      <span style={{ fontSize: 'var(--font-micro)', color: '#475569' }}>المحرك الحاكم:</span>
                      <span
                        style={{
                          fontSize: 'var(--font-micro)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#1e293b',
                          fontWeight: 600,
                        }}
                      >
                        {DRIVER_TYPE_LABELS[p.driverType] || p.driverType}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        fontSize: 'var(--font-micro)',
                      }}
                    >
                      <span>المسجل: <strong>{formatCurrency(poolGross)}</strong></span>
                      <span>استرداد باطن: <strong style={{ color: '#16a34a' }}>{formatCurrency(poolRec)}</strong></span>
                      <span>الصافي: <strong style={{ color: '#2563eb' }}>{formatCurrency(poolNet)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tab 2: تسجيل المصاريف الميدانية وجدولها */}
          <div style={{ display: activeTab === 'expenses' ? 'block' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '14px' }}>
              {/* نموذج إضافة مصروف */}
              <form
                onSubmit={handleCreateExpense}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#170e5e', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  تسجيل مصروف غير مباشر جديد
                </span>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                    وعاء التكلفة المستهدف
                  </label>
                  <CustomSelect
                    value={selectedPoolId}
                    onChange={(val) => setSelectedPoolId(val)}
                    options={poolOptions}
                    placeholder="اختر وعاء التكلفة"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                    بيان المصروف
                  </label>
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="مثال: إيجار سكن العمال شهر يوليو"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                      المبلغ الإجمالي ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={grossAmount}
                      onChange={(e) => setGrossAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 'var(--font-body)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#166534', marginBottom: '2px' }}>
                      استرداد مقاول باطن
                    </label>
                    <input
                      type="number"
                      value={recoveredAmount}
                      onChange={(e) => setRecoveredAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 'var(--font-body)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                      تاريخ المصروف
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 'var(--font-body)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                      رقم الإذن / الإيصال
                    </label>
                    <input
                      type="text"
                      value={voucherRef}
                      onChange={(e) => setVoucherRef(e.target.value)}
                      placeholder="رقم السند"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 'var(--font-body)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: '6px',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 'var(--font-body)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ المصروف الميداني'}
                </button>
              </form>

              {/* جدول المصاريف المسجلة */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 'var(--font-micro)' }}>
                      <th style={{ padding: '8px', textAlign: 'right' }}>البيان</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>الوعاء</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>الإجمالي</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>المسترد</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>الصافي</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                          لا توجد مصاريف مسجلة حتى الآن
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 500 }}>
                            {e.expenseTitle}
                            {e.voucherRef && <small style={{ display: 'block', color: '#94a3b8' }}>سند: {e.voucherRef}</small>}
                          </td>
                          <td style={{ padding: '8px', fontSize: 'var(--font-micro)', color: '#475569' }}>
                            {e.poolName}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>
                            {formatCurrency(e.grossAmount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: e.recoveredAmount > 0 ? '#16a34a' : '#94a3b8' }}>
                            {e.recoveredAmount > 0 ? formatCurrency(e.recoveredAmount) : '—'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                            {formatCurrency(e.netAmount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span
                              style={{
                                fontSize: 'var(--font-micro)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: e.batchId ? '#dcfce7' : '#fef3c7',
                                color: e.batchId ? '#15803d' : '#b45309',
                                fontWeight: 600,
                              }}
                            >
                              {e.batchId ? 'مرحل بدفعة' : 'غير موزع'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tab 3: تشغيل دورة التوزيع والمعاينة */}
          <div style={{ display: activeTab === 'run' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* شريط الإعدادات والتواريخ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1.5fr auto',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  alignItems: 'end',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                    بداية الفترة
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                    نهاية الفترة
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                    رصيد مرحل من فترة سابقة
                  </label>
                  <input
                    type="number"
                    value={deferredInAmount}
                    onChange={(e) => setDeferredInAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#475569', marginBottom: '2px' }}>
                    ملاحظات الدفعة
                  </label>
                  <input
                    type="text"
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    placeholder="مثال: تسوية مصاريف التأسيس للشهر الأول"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePreviewAllocation}
                  disabled={isPreviewing}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 'var(--font-body)',
                    cursor: isPreviewing ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    height: '34px',
                  }}
                >
                  {isPreviewing ? 'جاري الحساب...' : 'معاينة التوزيع'}
                </button>
              </div>

              {/* نتائج المعاينة */}
              {previewSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* ملخص المعاينة الحسابي */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      fontSize: 'var(--font-micro)',
                    }}
                  >
                    <div>إجمالي المصروف: <strong>{formatCurrency(previewSummary.totalGrossExpense)}</strong></div>
                    <div>مسترد باطن: <strong style={{ color: '#16a34a' }}>{formatCurrency(previewSummary.totalRecoveredBackcharge)}</strong></div>
                    <div>رصيد مرحل للدفعة: <strong>{formatCurrency(previewSummary.totalDeferredIn)}</strong></div>
                    <div>الصافي للتوزيع: <strong style={{ color: '#1d4ed8' }}>{formatCurrency(previewSummary.totalNetCost)}</strong></div>
                    <div>
                      {previewSummary.totalDeferredOut > 0 ? (
                        <span style={{ color: '#b45309', fontWeight: 700 }}>
                          مرحل لفترة قادمة (صفرية): {formatCurrency(previewSummary.totalDeferredOut)}
                        </span>
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: 700 }}>
                          الموزع على البنود: {formatCurrency(previewSummary.totalAllocated)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* جدول توزيع البنود */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }} className="thin-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 'var(--font-micro)' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>كود البند</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>سكن وإعاشة P1</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>أعباء عمالة P2</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>معدات مشتركة P3</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>إشراف موقع P4</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>إجمالي المحمل للبند</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewSummary.boqItemSummaries.map((item) => (
                          <tr key={item.boqItemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{item.boqCode}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              {formatCurrency(item.allocatedByPool['P1_LABOR_CARE'] || 0)}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              {formatCurrency(item.allocatedByPool['P2_LABOR_BURDEN'] || 0)}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              {formatCurrency(item.allocatedByPool['P3_EQUIP_SHARED'] || 0)}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              {formatCurrency(item.allocatedByPool['P4_SITE_SUPERVISION'] || 0)}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#170e5e' }}>
                              {formatCurrency(item.totalAllocatedIndirectCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* زر الاعتماد والترحيل */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={handlePostBatch}
                      disabled={submitting}
                      style={{
                        padding: '8px 22px',
                        borderRadius: '8px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 'var(--font-body)',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <AppIcons.CheckShield size={16} />
                      {submitting ? 'جاري الاعتماد والترحيل...' : 'تأكيد واعتماد ترحيل التكاليف لبنود المقايسة'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                  }}
                >
                  <AppIcons.Sliders size={32} />
                  <span style={{ marginTop: '8px', fontWeight: 600 }}>حدد الفترة الزمنية واضغط "معاينة التوزيع" للاحتساب اللحظي</span>
                  <small style={{ color: '#94a3b8', marginTop: '4px' }}>
                    يقوم المحرك بجمع ساعات ومصاريف العمالة والمعدات في الفترة وتطبيق معايير AACE RP 10S-90 بدقة متناهية
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Tab 4: سجل الدفعات المرحلة */}
          <div style={{ display: activeTab === 'history' ? 'block' : 'none' }}>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 'var(--font-micro)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>رقم الدفعة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>فترة التوزيع</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>صافي الأوعية</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>المحمل للبنود</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>المرحل لفترة تالية</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>تاريخ الاعتماد</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>المعتمد</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        لا توجد دفعات مرحلة حتى الآن
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#170e5e' }}>
                          {b.batchNumber}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 'var(--font-micro)' }}>
                          {b.periodStart} إلى {b.periodEnd}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                          {formatCurrency(b.totalNetPoolCost)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                          {formatCurrency(b.totalAllocatedAmount)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: b.deferredOutAmount > 0 ? '#b45309' : '#94a3b8' }}>
                          {b.deferredOutAmount > 0 ? formatCurrency(b.deferredOutAmount) : '0.00'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          {b.postedAt ? new Date(b.postedAt).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          {b.postedBy || 'system'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
