import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  installmentsApi,
  type InstallmentPlanItem,
  type CustomerInstallmentItem,
} from '@/features/sales/api/installments.api';
import { customersApi } from '@/features/customers/api/customers.api';
import { openWhatsAppChat, formatInstallmentReminderMessage } from '@/lib/whatsapp';

const statusBadges: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'قيد الانتظار', bg: '#f1f5f9', color: '#475569' },
  partially_paid: { label: 'مسدد جزئياً', bg: '#eff6ff', color: '#1d4ed8' },
  paid: { label: 'تم السداد', bg: '#dcfce7', color: '#166534' },
  overdue: { label: 'متأخر ومستحق', bg: '#fee2e2', color: '#991b1b' },
  active: { label: 'ساري ونشط', bg: '#e0f2fe', color: '#0369a1' },
  completed: { label: 'مكتمل بالكامل', bg: '#dcfce7', color: '#166534' },
};

export function InstallmentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'schedule' | 'plans'>('schedule');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'all' | 'overdue' | 'due_now' | 'pending' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [payModalInstallment, setPayModalInstallment] = useState<CustomerInstallmentItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'instapay'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<InstallmentPlanItem | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receipt_no: string;
    paid_amount: number;
    installment_number: number;
    paid_at: string;
    payment_method: string;
    customer_name: string;
    customer_phone: string;
  } | null>(null);

  // New plan form state
  const [newPlan, setNewPlan] = useState({
    customerId: '',
    saleId: '',
    totalAmount: '',
    downPayment: '0',
    interestRatePercent: '0',
    installmentCount: '6',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Queries
  const metricsQuery = useQuery({
    queryKey: ['installments-metrics'],
    queryFn: installmentsApi.getMetrics,
  });

  const customersQuery = useQuery({
    queryKey: ['customers-list-installments'],
    queryFn: async () => {
      const res = await customersApi.list();
      return res || [];
    },
  });

  const scheduleQuery = useQuery({
    queryKey: ['installments-schedule', scheduleStatusFilter, searchQuery],
    queryFn: async () => {
      const res = await installmentsApi.listSchedule({
        status: scheduleStatusFilter,
        search: searchQuery,
      });
      return res.installments || [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ['installments-plans', searchQuery],
    queryFn: async () => {
      const res = await installmentsApi.listPlans({
        search: searchQuery,
      });
      return res.plans || [];
    },
  });

  const planDetailsQuery = useQuery({
    queryKey: ['installment-plan-details', selectedPlanDetails?.id],
    queryFn: async () => {
      if (!selectedPlanDetails?.id) return null;
      return await installmentsApi.getPlanDetails(selectedPlanDetails.id);
    },
    enabled: !!selectedPlanDetails?.id,
  });

  // Calculation previews for new plan
  const planPreview = useMemo(() => {
    const total = Number(newPlan.totalAmount || 0);
    const down = Number(newPlan.downPayment || 0);
    const financed = Math.max(0, total - down);
    const interestRate = Number(newPlan.interestRatePercent || 0);
    const interest = Math.round(((financed * interestRate) / 100) * 100) / 100;
    const totalWithInterest = Math.round((financed + interest) * 100) / 100;
    const count = Math.max(1, Math.floor(Number(newPlan.installmentCount) || 1));
    const monthly = Math.round((totalWithInterest / count) * 100) / 100;

    return {
      total,
      down,
      financed,
      interest,
      totalWithInterest,
      count,
      monthly,
    };
  }, [newPlan]);

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      return await installmentsApi.createPlan({
        customerId: Number(newPlan.customerId),
        saleId: newPlan.saleId ? Number(newPlan.saleId) : null,
        totalAmount: Number(newPlan.totalAmount),
        downPayment: Number(newPlan.downPayment || 0),
        interestRatePercent: Number(newPlan.interestRatePercent || 0),
        installmentCount: Number(newPlan.installmentCount || 1),
        startDate: newPlan.startDate,
        notes: newPlan.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['installments-plans'] });
      queryClient.invalidateQueries({ queryKey: ['installments-schedule'] });
      setCreatePlanModalOpen(false);
      setNewPlan({
        customerId: '',
        saleId: '',
        totalAmount: '',
        downPayment: '0',
        interestRatePercent: '0',
        installmentCount: '6',
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!payModalInstallment) return;
      return await installmentsApi.payInstallment(payModalInstallment.id, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['installments-plans'] });
      queryClient.invalidateQueries({ queryKey: ['installments-schedule'] });
      if (selectedPlanDetails) {
        queryClient.invalidateQueries({ queryKey: ['installment-plan-details', selectedPlanDetails.id] });
      }
      setPayModalInstallment(null);
      if (data?.receipt) {
        setReceiptData(data.receipt);
      }
    },
  });

  const openPayModal = (inst: CustomerInstallmentItem) => {
    const remaining = inst.remaining_installment ?? (Number(inst.amount) - Number(inst.paid_amount || 0));
    setPayModalInstallment(inst);
    setPayAmount(String(remaining > 0 ? remaining : inst.amount));
    setPayMethod('cash');
    setPayNotes('');
  };

  const handleSendInstallmentReminder = (inst: CustomerInstallmentItem) => {
    if (!inst.customer_phone) {
      alert('رقم هاتف العميل غير مسجل لهذا القسط.');
      return;
    }
    const message = formatInstallmentReminderMessage({
      customerName: inst.customer_name || 'العميل',
      installmentNumber: inst.installment_number,
      totalInstallments: inst.installment_count,
      amount: inst.amount,
      dueDate: inst.due_date,
      planNumber: inst.plan_number,
    });
    openWhatsAppChat(inst.customer_phone, message);
  };

  const handleSendReceiptWhatsApp = () => {
    if (!receiptData) return;
    if (!receiptData.customer_phone) {
      alert('رقم هاتف العميل غير متوفر.');
      return;
    }
    const formattedDate = new Date(receiptData.paid_at).toLocaleDateString('ar-EG');
    const message = `مرحباً أستاذ/ة *${receiptData.customer_name}*،\nتم استلام دفعة قسطكم بنجاح!\n🧾 رقم الإيصال: *#${receiptData.receipt_no}*\n💵 المبلغ المسدد: *${Number(receiptData.paid_amount).toLocaleString()} ج.م*\n📋 القسط: *#${receiptData.installment_number}*\n💳 طريقة الدفع: ${receiptData.payment_method}\n📅 التاريخ: ${formattedDate}\n\nشكراً لتعاملكم معنا! 🙏`;
    openWhatsAppChat(receiptData.customer_phone, message);
  };

  const metrics = metricsQuery.data || {
    active_plans: 0,
    total_plans: 0,
    active_total_amount: 0,
    total_collected: 0,
    unpaid_amount: 0,
    overdue_count: 0,
    overdue_amount: 0,
  };

  return (
    <div dir="rtl" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
            نظام إدارة أقساط العملاء (Installment Sales Engine)
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            جدولة وتوزيع مبيعات الآجل على أقساط شهرية، احتساب نسب الفائدة، ومتابعة التحصيلات والإيصالات
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            onClick={() => setCreatePlanModalOpen(true)}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>+</span> إنشاء خطة تقسيط جديدة
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>الخطط والعقود النشطة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
            {formatCurrency(metrics.active_total_amount)}
          </div>
          <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '500' }}>
            {metrics.active_plans} خطة سارية (من إجمالي {metrics.total_plans})
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>إجمالي المبالغ المحصلة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
            {formatCurrency(metrics.total_collected)}
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '500' }}>
            تم تحصيلها وإيداعها في الخزينة
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>المتبقي قيد التحصيل</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
            {formatCurrency(metrics.unpaid_amount)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            أقساط مستقبلية مستحقة الجدولة
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#991b1b', fontWeight: '500', marginBottom: '8px' }}>الأقساط المتأخرة المستحقة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '4px' }}>
            {formatCurrency(metrics.overdue_amount)}
          </div>
          <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
            {metrics.overdue_count} قسط متأخر تجاوز تاريخ الاستحقاق
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('schedule')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === 'schedule' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'schedule' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              جدول الأقساط والاستحقاقات
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === 'plans' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'plans' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              عقود وخطط التقسيط
            </button>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="بحث برقم الخطة، اسم العميل، الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                width: '260px',
                outline: 'none',
              }}
            />

            {activeTab === 'schedule' && (
              <select
                value={scheduleStatusFilter}
                onChange={(e) => setScheduleStatusFilter(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="all">كل الحالات</option>
                <option value="overdue">المتأخرة فقط ⚠️</option>
                <option value="due_now">مستحقة اليوم أو قبل</option>
                <option value="pending">غير مسددة</option>
                <option value="paid">المسددة</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'schedule' ? (
        /* Installments Schedule Table */
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>القسط</th>
                  <th style={{ padding: '12px 16px' }}>رقم العقد</th>
                  <th style={{ padding: '12px 16px' }}>العميل</th>
                  <th style={{ padding: '12px 16px' }}>تاريخ الاستحقاق</th>
                  <th style={{ padding: '12px 16px' }}>قيمة القسط</th>
                  <th style={{ padding: '12px 16px' }}>المسدد</th>
                  <th style={{ padding: '12px 16px' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {scheduleQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      جاري تحميل جدول الأقساط...
                    </td>
                  </tr>
                ) : (scheduleQuery.data || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      لا توجد أقساط مطابقة للفلتر المحدد
                    </td>
                  </tr>
                ) : (
                  (scheduleQuery.data || []).map((inst) => {
                    const badge = statusBadges[inst.display_status || inst.status] || statusBadges.pending;
                    const isFullyPaid = inst.status === 'paid';

                    return (
                      <tr key={inst.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                          قسط #{inst.installment_number} {inst.installment_count ? `من ${inst.installment_count}` : ''}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>
                          {inst.plan_number || `#${inst.plan_id}`}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{inst.customer_name || 'عميل'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{inst.customer_phone || ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          {new Date(inst.due_date).toLocaleDateString('ar-EG')}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                          {formatCurrency(inst.amount)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#166534', fontWeight: '600' }}>
                          {formatCurrency(inst.paid_amount)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {!isFullyPaid ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              <Button
                                onClick={() => openPayModal(inst)}
                                style={{
                                  backgroundColor: '#170e5e',
                                  color: '#ffffff',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                تحصيل القسط
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => handleSendInstallmentReminder(inst)}
                                disabled={!inst.customer_phone}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#f0fdf4',
                                  borderColor: '#bbf7d0',
                                  color: '#15803d',
                                }}
                                title={inst.customer_phone ? 'إرسال تذكير بموعد القسط عبر واتساب' : 'رقم الهاتف غير مسجل'}
                              >
                                💬 تذكير
                              </Button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                              ✓ مسدد بالكامل {inst.receipt_no ? `(${inst.receipt_no})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Installment Plans Table */
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>رقم العقد</th>
                  <th style={{ padding: '12px 16px' }}>العميل</th>
                  <th style={{ padding: '12px 16px' }}>إجمالي الفاتورة</th>
                  <th style={{ padding: '12px 16px' }}>المقدم</th>
                  <th style={{ padding: '12px 16px' }}>الممول + الفائدة</th>
                  <th style={{ padding: '12px 16px' }}>الأقساط</th>
                  <th style={{ padding: '12px 16px' }}>نسبة السداد</th>
                  <th style={{ padding: '12px 16px' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {plansQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      جاري تحميل خطط التقسيط...
                    </td>
                  </tr>
                ) : (plansQuery.data || []).length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      لا توجد خطط تقسيط مسجلة
                    </td>
                  </tr>
                ) : (
                  (plansQuery.data || []).map((plan) => {
                    const badge = statusBadges[plan.status] || statusBadges.active;
                    const percent = plan.progress_percent || 0;

                    return (
                      <tr key={plan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                          {plan.plan_number}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{plan.customer_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{plan.customer_phone}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                          {formatCurrency(plan.total_amount)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {formatCurrency(plan.down_payment)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>
                            {formatCurrency(plan.total_with_interest)}
                          </div>
                          {Number(plan.interest_rate_percent) > 0 && (
                            <div style={{ fontSize: '11px', color: '#d97706' }}>
                              فائدة {plan.interest_rate_percent}% ({formatCurrency(plan.interest_amount)})
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>{plan.installment_count} شهور</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {formatCurrency(plan.monthly_amount)} / شهر
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: percent >= 100 ? '#16a34a' : '#2563eb',
                                  height: '100%',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                              {percent}%
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            المسدد: {formatCurrency(plan.paid_amount || 0)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedPlanDetails(plan)}
                            style={{
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            عرض الجدول
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Installment Plan */}
      {createPlanModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                إنشاء عقد / خطة تقسيط جديدة للعميل
              </h2>
              <button
                onClick={() => setCreatePlanModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  اختيار العميل *
                </label>
                <select
                  value={newPlan.customerId}
                  onChange={(e) => setNewPlan({ ...newPlan, customerId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="">-- اختر العميل --</option>
                  {(customersQuery.data || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - رصيد المديونية: {formatCurrency(c.balance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  إجمالي قيمة المبيعات / الفاتورة *
                </label>
                <input
                  type="number"
                  placeholder="مثلاً: 10000"
                  value={newPlan.totalAmount}
                  onChange={(e) => setNewPlan({ ...newPlan, totalAmount: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  الدفعة المقدمة (Down Payment)
                </label>
                <input
                  type="number"
                  placeholder="مثلاً: 2000"
                  value={newPlan.downPayment}
                  onChange={(e) => setNewPlan({ ...newPlan, downPayment: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  نسبة الفائدة / المصاريف الإدارية (%)
                </label>
                <input
                  type="number"
                  placeholder="مثلاً: 10%"
                  value={newPlan.interestRatePercent}
                  onChange={(e) => setNewPlan({ ...newPlan, interestRatePercent: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  عدد الأشهر / الأقساط *
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newPlan.installmentCount}
                  onChange={(e) => setNewPlan({ ...newPlan, installmentCount: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  تاريخ بداية العقد *
                </label>
                <input
                  type="date"
                  value={newPlan.startDate}
                  onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  رقم الفاتورة المرجعية (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="رقم الفاتورة إن وجد"
                  value={newPlan.saleId}
                  onChange={(e) => setNewPlan({ ...newPlan, saleId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  ملاحظات أو شروط العقد
                </label>
                <input
                  type="text"
                  placeholder="مثال: تم التوقيع على إيصالات أمانة، ضامن العميل..."
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>

            {/* Financial Preview Box */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>
                المعاينة المالية والحسابية للخطة
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>المبلغ الممول</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                    {formatCurrency(planPreview.financed)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>أرباح التقسيط</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#d97706' }}>
                    +{formatCurrency(planPreview.interest)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>إجمالي الدين بالفوائد</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                    {formatCurrency(planPreview.totalWithInterest)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#047857' }}>القسط الشهري</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#065f46' }}>
                    {formatCurrency(planPreview.monthly)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setCreatePlanModalOpen(false)}
                style={{ padding: '10px 20px', borderRadius: '8px' }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => createPlanMutation.mutate()}
                disabled={!newPlan.customerId || !Number(newPlan.totalAmount) || createPlanMutation.isPending}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {createPlanMutation.isPending ? 'جاري الحفظ والجدولة...' : 'حفظ وتوليد جدول الأقساط'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pay Installment */}
      {payModalInstallment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                تحصيل قسط عميل
              </h2>
              <button
                onClick={() => setPayModalInstallment(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>العميل:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{payModalInstallment.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>القسط:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  رقم #{payModalInstallment.installment_number}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>تاريخ الاستحقاق:</span>
                <span style={{ color: '#334155' }}>
                  {new Date(payModalInstallment.due_date).toLocaleDateString('ar-EG')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>قيمة القسط الكاملة:</span>
                <span style={{ fontWeight: 'bold', color: '#166534' }}>
                  {formatCurrency(payModalInstallment.amount)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                المبلغ المراد تحصيله الآن *
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                طريقة الدفع *
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="cash">نقداً (كاش)</option>
                <option value="card">بطاقة مدى / ائتمان (شبكة)</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="instapay">إنستاباي / محفظة إلكترونية</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                ملاحظات التحصيل
              </label>
              <input
                type="text"
                placeholder="مثلاً: دفعة عن طريق الحساب البنكي، أو نقداً بالفرع"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setPayModalInstallment(null)}
                style={{ padding: '10px 18px', borderRadius: '8px' }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => payMutation.mutate()}
                disabled={!Number(payAmount) || payMutation.isPending}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {payMutation.isPending ? 'جاري تسجيل السداد...' : 'تأكيد التحصيل وإصدار الإيصال'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Thermal Receipt Dialog */}
      {receiptData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>
              ✓
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
              تم التحصيل بنجاح!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              تم إيداع المبلغ وتحديث رصيد العميل
            </p>

            <div
              id="installment-receipt-print"
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'right',
                fontSize: '12px',
                lineHeight: '1.8',
                backgroundColor: '#fafafa',
                marginBottom: '16px',
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                إيصال استلام قسط
              </div>
              <div><strong>رقم الإيصال:</strong> {receiptData.receipt_no}</div>
              <div><strong>العميل:</strong> {receiptData.customer_name}</div>
              <div><strong>القسط:</strong> رقم #{receiptData.installment_number}</div>
              <div><strong>المبلغ المحصل:</strong> {formatCurrency(receiptData.paid_amount)}</div>
              <div><strong>طريقة الدفع:</strong> {receiptData.payment_method}</div>
              <div><strong>التاريخ:</strong> {new Date(receiptData.paid_at).toLocaleString('ar-EG')}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                طباعة الإيصال
              </Button>
              <Button
                onClick={handleSendReceiptWhatsApp}
                style={{
                  flex: 1,
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                💬 إرسال واتساب
              </Button>
              <Button
                variant="secondary"
                onClick={() => setReceiptData(null)}
                style={{ padding: '10px 16px', borderRadius: '8px' }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Plan Details & All Scheduled Installments */}
      {selectedPlanDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '750px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
                  جدول أقساط العقد: {selectedPlanDetails.plan_number}
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  العميل: {selectedPlanDetails.customer_name} ({selectedPlanDetails.customer_phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanDetails(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px' }}>القسط</th>
                    <th style={{ padding: '10px 14px' }}>تاريخ الاستحقاق</th>
                    <th style={{ padding: '10px 14px' }}>القيمة</th>
                    <th style={{ padding: '10px 14px' }}>المسدد</th>
                    <th style={{ padding: '10px 14px' }}>تاريخ السداد</th>
                    <th style={{ padding: '10px 14px' }}>الحالة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(planDetailsQuery.data?.installments || []).map((inst) => {
                    const badge = statusBadges[inst.display_status || inst.status] || statusBadges.pending;
                    return (
                      <tr key={inst.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '600' }}>#{inst.installment_number}</td>
                        <td style={{ padding: '10px 14px' }}>{new Date(inst.due_date).toLocaleDateString('ar-EG')}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{formatCurrency(inst.amount)}</td>
                        <td style={{ padding: '10px 14px', color: '#166534' }}>{formatCurrency(inst.paid_amount)}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {inst.status !== 'paid' && (
                            <button
                              onClick={() => openPayModal(inst)}
                              style={{ backgroundColor: '#170e5e', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              تحصيل
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => setSelectedPlanDetails(null)}
                style={{ padding: '8px 16px', borderRadius: '8px' }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
