import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/errors';
import { http } from '@/lib/http';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { useAuthStore } from '@/stores/auth-store';
import { LockIcon, CheckShieldIcon, AlertCircleIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

interface WithdrawalBalanceResponse {
  employee: {
    id: number;
    employeeNo?: string;
    displayName: string;
    compensationType: 'hourly' | 'monthly';
    payFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    hourlyRate: number;
    baseSalary: number;
  };
  cycle: {
    cycleStart: string;
    cycleEnd: string;
    daysElapsed: number;
  };
  accrual: {
    workedHours: number;
    completedDays: number;
    hourlyRate: number;
    baseSalary: number;
    accruedEarnings: number;
    calculationText: string;
    source: 'payroll_item' | 'attendance_records' | 'contract_prorated';
  };
  deductions: {
    currentCycleWithdrawals: number;
    priorOutstandingDebt: number;
    totalDebt: number;
    activeLoanCount: number;
  };
  unpaidApprovedPayroll: number;
  netAvailableBalance: number;
  balanceStatus: 'credit' | 'debit' | 'settled';
  canDisburseDirectly: boolean;
  maxDirectDisbursement: number;
}

function money(val: unknown): string {
  const num = Number(val || 0);
  return Number.isFinite(num) ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

export function QuickCashAdvanceModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'advance' | 'payout'>('advance');
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [_selectedShiftId, setSelectedShiftId] = useState('');
  const [formError, setFormError] = useState('');

  const queryClient = useQueryClient();
  const canManageLoans = useHasAnyPermission('hrLoans');
  const canAccessCashDrawer = useHasAnyPermission(['cashDrawer', 'sales']);
  const currentUser = useAuthStore((state) => state.user);
  const isAdminOrOwner = ['admin', 'super_admin'].includes(String(currentUser?.role || '').trim());
  const canAccess = canManageLoans || canAccessCashDrawer || isAdminOrOwner;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + X (supports English and Arabic layout: KeyX / 'x' / 'X' / 'ء')
      if (e.ctrlKey && e.altKey && (e.key === 'x' || e.key === 'X' || e.code === 'KeyX' || e.key === 'ء')) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-cash-advance', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-cash-advance', handleCustomOpen);
    };
  }, []);

  // Fetch active employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['hr.employees', { pageSize: 1000 }],
    queryFn: () => http<any>('/api/hr/employees?pageSize=1000&status=active'),
    enabled: isOpen && canAccess,
    staleTime: 60000,
  });

  // Fetch open cashier shifts
  const { data: shiftData } = useQuery({
    queryKey: ['pos.shifts.current'],
    queryFn: () => http<{ cashierShifts?: Array<Record<string, unknown>> }>('/api/cashier-shifts?status=open&pageSize=100'),
    enabled: isOpen && canAccess,
    staleTime: 10000,
  });

  // Fetch real-time employee withdrawal balance with instant cache and placeholder retention
  const {
    data: balanceData,
    isLoading: _isLoadingBalance,
    isFetching: _isFetchingBalance,
    isError: isBalanceError,
    error: balanceError,
  } = useQuery<WithdrawalBalanceResponse>({
    queryKey: ['hr.employee.withdrawal-balance', employeeId],
    queryFn: () => http<WithdrawalBalanceResponse>(`/api/hr/employees/${employeeId}/withdrawal-balance`),
    enabled: isOpen && Boolean(employeeId) && Number(employeeId) > 0,
    staleTime: 10000,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const employees = employeesData?.employees || [];
  const shifts = shiftData?.cashierShifts || [];

  const selectedEmployee = useMemo(() => {
    return employees.find((e: any) => String(e.id) === String(employeeId)) || null;
  }, [employees, employeeId]);

  const employeeOptions = useMemo(() => [
    { value: '', label: t('hr.quick_cash_advance_modal.choose_emp', 'اختر الموظف لعرض كشف حسابه اللحظي...') },
    ...employees.map((emp: any) => ({
      value: String(emp.id),
      label: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || `موظف #${emp.id}`,
      hint: emp.employeeNo ? `#${emp.employeeNo}` : (emp.compensationType === 'hourly' ? 'بالساعة' : 'شهري'),
      code: String(emp.employeeNo || emp.id),
    })),
  ], [employees, t]);

  // Lock shift strictly to current user's open shift
  const userOpenShift = useMemo(() => {
    return shifts.find(
      (shift: Record<string, unknown>) =>
        String(shift.openedById || shift.opened_by) === String(currentUser?.id) &&
        String(shift.status || 'open') === 'open'
    );
  }, [shifts, currentUser?.id]);

  const activeShift = userOpenShift || (isAdminOrOwner ? shifts[0] : null);

  useEffect(() => {
    if (activeShift?.id) {
      setSelectedShiftId(String(activeShift.id));
    } else {
      setSelectedShiftId('');
    }
  }, [activeShift]);


  // Derived financial & authorization states
  const parsedAmount = Number(amount) || 0;
  const netAvailable = balanceData?.netAvailableBalance ?? 0;
  const hasCredit = netAvailable > 0.009;
  const isDirectAllowed = hasCredit && parsedAmount > 0 && parsedAmount <= netAvailable;
  const isOverdraft = parsedAmount > netAvailable;
  const requiresManagerAuth = !hasCredit || isOverdraft;

  const currentMonthLabel = useMemo(() => {
    try {
      const now = new Date();
      return now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    } catch {
      return 'الشهر الحالي';
    }
  }, []);

  const payFrequencyLabel = useMemo(() => {
    const freq = balanceData?.employee.payFrequency;
    if (freq === 'daily') return 'يومي';
    if (freq === 'weekly') return 'أسبوعي';
    if (freq === 'biweekly') return 'نصف شهري';
    return 'شهري';
  }, [balanceData?.employee.payFrequency]);

  const accrualSubtitle = useMemo(() => {
    if (!employeeId || !balanceData) return 'اختر الموظف لعرض الاستحقاق';
    const compType = balanceData.employee.compensationType;
    const freq = balanceData.employee.payFrequency;
    const hours = balanceData.accrual.workedHours;
    const days = balanceData.accrual.completedDays;

    if (compType === 'hourly') {
      return `أجر بالساعة (عن ${hours > 0 ? `${hours} س عمل` : 'ساعات العمل'})`;
    }
    if (freq === 'daily') {
      return `أجر يومي (عن ${days > 0 ? `${days} يوم استحقاق` : 'أيام العمل حتى اليوم'})`;
    }
    if (freq === 'weekly') {
      return `أجر أسبوعي (عن ${days > 0 ? `${days} يوم استحقاق` : 'الأسبوع الحالي'})`;
    }
    return `راتب شهري (استحقاق شهر ${currentMonthLabel})`;
  }, [employeeId, balanceData, currentMonthLabel]);

  const deductionsSubtitle = useMemo(() => {
    if (!employeeId || !balanceData) return 'لا توجد سلف محددة';
    const debt = balanceData.deductions.totalDebt;
    const count = balanceData.deductions.activeLoanCount;
    if (debt > 0) {
      return `${count || 1} سلفة قائمة بذمته`;
    }
    return 'لا توجد مسحوبات سابقة';
  }, [employeeId, balanceData]);

  const availableSubtitle = useMemo(() => {
    if (!employeeId || !balanceData) return 'بانتظار اختيار الموظف';
    return hasCredit ? 'صرف مباشر متاح للكاشير' : 'يتطلب اعتماد الإدارة';
  }, [employeeId, balanceData, hasCredit]);

  useEffect(() => {
    if (activeTab === 'payout' && balanceData && employeeId) {
      const avail = balanceData.netAvailableBalance;
      if (avail > 0) {
        setAmount(String(avail));
      }
      const empName = balanceData.employee.displayName || selectedEmployee?.displayName || 'الموظف';
      setNotes(`صرف وتصفية مستحقات أجر الفترة (${empName})`);
    }
  }, [activeTab, balanceData, employeeId, selectedEmployee?.displayName]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return http('/api/hr/advances/quick-cash', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr.loans'] });
      queryClient.invalidateQueries({ queryKey: ['pos.shifts'] });
      queryClient.invalidateQueries({ queryKey: ['hr.payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['hr.financialStatement'] });
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: ['hr.employee.withdrawal-balance', employeeId] });
      }

      const empName = selectedEmployee?.displayName || 'الموظف';
      if (activeTab === 'payout') {
        toast.success(`تم صرف راتب ومستحقات ${empName} بقيمة ${money(parsedAmount)} ج.م وتصفير رصيد الفترة بنجاح`);
      } else {
        toast.success(`تم صرف سلفة / مسحوب بقيمة ${money(parsedAmount)} ج.م للموظف ${empName} بنجاح`);
      }

      setIsOpen(false);
      setEmployeeId('');
      setAmount('');
      setNotes('');
      setManagerPassword('');
      setSelectedShiftId('');
      setFormError('');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, 'تعذر تسجيل العملية.'));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!employeeId) {
      setFormError('يرجى اختيار الموظف أولاً.');
      return;
    }
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }
    if (Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 0.000001) {
      setFormError('المبلغ يجب أن يحتوي على خانتين عشريتين كحد أقصى.');
      return;
    }
    if (!notes.trim()) {
      setFormError('يجب كتابة سبب وتفاصيل الصرف.');
      return;
    }
    if (!activeShift) {
      setFormError('لا توجد وردية كاشير مفتوحة باسمك للصرف منها.');
      return;
    }

    if (requiresManagerAuth && !isAdminOrOwner && !managerPassword.trim()) {
      setFormError('المبلغ يتجاوز الرصيد المستحق؛ يلزم إدخال كلمة مرور المدير أو مالك المنشأة للاعتماد.');
      return;
    }

    mutation.mutate({
      employeeId: Number(employeeId),
      amount: parsedAmount,
      notes: notes.trim(),
      shiftId: Number(activeShift.id),
      managerPassword: managerPassword.trim() || undefined,
      actionType: activeTab === 'payout' ? 'wage_payout' : 'advance',
    });
  };

  if (!isOpen) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={() => setIsOpen(false)}
      width="min(740px, 96vw)"
      minHeight="590px"
    >
      <div style={{ padding: '16px 22px', minHeight: '590px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }} dir="rtl">
        {/* Header - Clean enterprise without redundant shortcut badge */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, backgroundColor: '#170e5e', borderRadius: 2 }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
              {activeTab === 'payout' ? 'صرف الراتب وتصفية المستحقات' : 'صرف مسحوب من الراتب / سلفة كاشير'}
            </h2>
          </div>
          <p style={{ margin: '3px 0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
            {activeTab === 'payout'
              ? 'تسوية وصرف صافي أجر الموظف نقداً من عهدة الكاشير مع تصفير رصيد الفترة'
              : 'صرف نقدية سلفة من عهدة الكاشير تُخصم تلقائياً من الراتب القادم'}
          </p>
        </div>

        {!canAccess ? (
          <div style={{ padding: 14, backgroundColor: '#fef2f2', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem' }}>
            {t('hr.quick_cash_advance_modal.no_perm', 'لا تملك صلاحية صرف المسحوبات أو الوصول للوردية.')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Operational Tabs: Advance vs Wage Payout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                backgroundColor: '#f1f5f9',
                padding: 4,
                borderRadius: 8,
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('advance');
                  setAmount('');
                  setNotes('');
                  setFormError('');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: activeTab === 'advance' ? '#170e5e' : 'transparent',
                  backgroundColor: activeTab === 'advance' ? '#ffffff' : 'transparent',
                  color: activeTab === 'advance' ? '#170e5e' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: activeTab === 'advance' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span>سلفة / مسحوب على الحساب</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('payout');
                  setAmount(netAvailable > 0 ? String(netAvailable) : '');
                  setNotes(`صرف وتصفية مستحقات أجر الفترة (${selectedEmployee?.displayName || 'الموظف'})`);
                  setFormError('');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: activeTab === 'payout' ? '#170e5e' : 'transparent',
                  backgroundColor: activeTab === 'payout' ? '#ffffff' : 'transparent',
                  color: activeTab === 'payout' ? '#170e5e' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: activeTab === 'payout' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span>صرف الراتب وتصفية المستحقات</span>
              </button>
            </div>

            {/* 2. Employee Selection */}
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {t('hr.quick_cash_advance_modal.employee_select', 'الموظف *')}
              </span>
              <CustomSelect
                value={employeeId}
                onChange={(val) => {
                  setEmployeeId(val);
                  setAmount('');
                  setManagerPassword('');
                  setFormError('');
                }}
                options={employeeOptions}
                openOnFocus
              />
            </div>

            {/* 3. Three-Card Executive Financial Strip */}
            <div>
              {isBalanceError && !balanceData ? (
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    color: '#991b1b',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertCircleIcon size={16} />
                  <span>{getErrorMessage(balanceError, 'تعذر احتساب الرصيد اللحظي لهذا الموظف.')}</span>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 12px 12px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header line for contract type & employee identification */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 4px 8px',
                      fontSize: '0.78rem',
                      color: '#64748b',
                      borderBottom: '1px dashed #e2e8f0',
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: employeeId ? '#0f172a' : '#94a3b8' }}>
                      {employeeId
                        ? (balanceData?.employee?.displayName || selectedEmployee?.displayName || selectedEmployee?.name || 'الموظف') +
                          (balanceData?.employee?.payFrequency ? ` (${payFrequencyLabel})` : selectedEmployee?.payFrequency ? ` (${selectedEmployee.payFrequency === 'daily' ? 'يومي' : 'شهري'})` : '')
                        : 'بيان الوضع المالي اللحظي للموظف'}
                    </span>
                    <span style={{ fontWeight: 600, color: employeeId ? '#334155' : '#94a3b8' }}>
                      {employeeId
                        ? balanceData
                          ? balanceData.employee.compensationType === 'hourly'
                            ? `أجر الساعة: ${money(balanceData.employee.hourlyRate)} ج.م/س`
                            : `الراتب الأساسي: ${money(balanceData.employee.baseSalary)} ج.م`
                          : selectedEmployee?.hourlyRate
                            ? `أجر الساعة: ${money(selectedEmployee.hourlyRate)} ج.م/س`
                            : selectedEmployee?.compensationType === 'hourly'
                              ? 'أجر بالساعة'
                              : 'راتب تعاقدي'
                        : 'اختر الموظف لعرض تفاصيل العقد'}
                    </span>
                  </div>

                  {/* 3-Column Financial Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10,
                      boxSizing: 'border-box',
                      width: '100%',
                    }}
                  >
                    {/* Card 1: الأجر المستحق */}
                    <div
                      style={{
                        backgroundColor: '#f0f9ff',
                        border: '1.5px solid #bae6fd',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 74,
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 700, display: 'block' }}>
                        الأجر المستحق
                      </span>
                      <strong
                        style={{
                          fontSize: '1.05rem',
                          color: '#0284c7',
                          margin: '3px 0',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {employeeId
                          ? balanceData
                            ? `${money(balanceData.accrual.accruedEarnings)} ج.م`
                            : '...'
                          : '0.00 ج.م'}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                        title={accrualSubtitle}
                      >
                        {accrualSubtitle}
                      </span>
                    </div>

                    {/* Card 2: المسحوبات والسلف */}
                    <div
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1.5px solid #fecaca',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 74,
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 700, display: 'block' }}>
                        المسحوبات والسلف
                      </span>
                      <strong
                        style={{
                          fontSize: '1.05rem',
                          color: '#dc2626',
                          margin: '3px 0',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {employeeId
                          ? balanceData
                            ? `${money(balanceData.deductions.totalDebt)} ج.م`
                            : '...'
                          : '0.00 ج.م'}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {deductionsSubtitle}
                      </span>
                    </div>

                    {/* Card 3: المتاح للصرف */}
                    <div
                      style={{
                        backgroundColor: !employeeId ? '#f8fafc' : hasCredit ? '#f0fdf4' : '#fffbeb',
                        border: `1.5px solid ${!employeeId ? '#cbd5e1' : hasCredit ? '#86efac' : '#fcd34d'}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 74,
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: !employeeId ? '#475569' : hasCredit ? '#15803d' : '#b45309',
                          fontWeight: 700,
                          display: 'block',
                        }}
                      >
                        المتاح للصرف
                      </span>
                      <strong
                        style={{
                          fontSize: '1.08rem',
                          color: !employeeId ? '#475569' : hasCredit ? '#16a34a' : '#d97706',
                          margin: '3px 0',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {employeeId
                          ? balanceData
                            ? hasCredit
                              ? `+${money(netAvailable)} ج.م`
                              : `${money(netAvailable)} ج.م`
                            : '...'
                          : '0.00 ج.م'}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: !employeeId ? '#64748b' : hasCredit ? '#15803d' : '#b45309',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {availableSubtitle}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Amount Input & Quick Fill */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                  {activeTab === 'payout' ? 'صافي المبلغ المراد صرفه وتسويته *' : 'المبلغ المطلوب سحبه / صرفه *'}
                </span>
                {hasCredit && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setAmount(String(netAvailable))}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#15803d',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '3px 10px',
                        borderRadius: 4,
                      }}
                    >
                      {activeTab === 'payout' ? 'كامل الصافي' : 'صرف كامل المتاح'} ({money(netAvailable)})
                    </button>
                    {activeTab === 'advance' && netAvailable >= 100 && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(Math.floor(netAvailable / 2)))}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          color: '#475569',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '3px 10px',
                          borderRadius: 4,
                        }}
                      >
                        النصف ({money(Math.floor(netAvailable / 2))})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  borderColor: requiresManagerAuth && parsedAmount > 0 ? '#f59e0b' : undefined,
                }}
              />

              {/* Real-time Status Helper with reserved fixed height */}
              <div style={{ minHeight: '22px', marginTop: 4, fontSize: '0.76rem', display: 'flex', alignItems: 'center' }}>
                {parsedAmount > 0 && balanceData ? (
                  isDirectAllowed ? (
                    <span style={{ color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckShieldIcon size={14} color="#15803d" />
                      {activeTab === 'payout'
                        ? `صرف كامل صافي الأجر (${money(parsedAmount)} ج.م) نقداً من الدرج وتصفير رصيد الفترة — صـرف مبـاشر مسمـوح.`
                        : `المبلغ ضمن رصيد الموظف المتاح (متبقي بعد الصرف: ${money(netAvailable - parsedAmount)} ج.م) — صـرف مبـاشر مسمـوح للكاشـير.`}
                    </span>
                  ) : (
                    <span style={{ color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircleIcon size={14} color="#d97706" />
                      {hasCredit
                        ? `المبلغ يتجاوز الرصيد المتاح بمقدار ${money(parsedAmount - netAvailable)} ج.م (سلفة على المكشوف)`
                        : 'الموظف لا يملك رصيداً مستحقاً حالياً'}{' '}
                      — يتطلب إدخال كلمة مرور المدير للاعتماد.
                    </span>
                  )
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                    {activeTab === 'payout'
                      ? 'سيتم تصفية وصرف صافي المستحق نقداً من عهدة الكاشير وتصفير رصيد الفترة للموظف.'
                      : 'أدخل المبلغ المطلوب صرفه من عهدة الكاشير كسلفة تُخصم تلقائياً من الراتب القادم.'}
                  </span>
                )}
              </div>
            </div>

            {/* 5. Notes & Reason */}
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {activeTab === 'payout' ? 'ملاحظات وتفاصيل صرف الراتب *' : 'ملاحظات وسبب الصرف *'}
              </span>
              <input
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={activeTab === 'payout' ? 'تفاصيل تسوية وصرف الراتب (مطلوب)' : 'سبب صرف المسحوب أو السلفة (مطلوب)'}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* 6. Manager Password (Shows when amount exceeds available balance) */}
            {requiresManagerAuth && parsedAmount > 0 && (
              <div
                style={{
                  padding: 10,
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <LockIcon size={15} color="#d97706" />
                  <strong style={{ fontSize: '0.8rem', color: '#92400e' }}>
                    اعتماد المدير أو مالك المنشأة مطلوب (سلفة استثنائية)
                  </strong>
                </div>

                {isAdminOrOwner ? (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#78350f' }}>
                    أنت مسجل حالياً برتبة مدير/مسؤول نظام ({currentUser?.username})؛ سيتم توثيق الاعتماد باسمك في السجل الرقابي.
                  </p>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                      كلمة مرور المدير / رمز PIN للموافقة على الصرف *
                    </label>
                    <input
                      type="password"
                      required
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور الإدارة للاعتماد"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 7. Active Shift Info */}
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {t('hr.quick_cash_advance_modal.shift_header', 'الوردية المنصرف منها المسحوب (مقيدة باسمك) *')}
              </span>

              {activeShift ? (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#16a34a',
                      }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>
                        {activeShift.docNo ? `${activeShift.docNo} (#${activeShift.id})` : `وردية كاشير #${activeShift.id}`}
                      </strong>
                      <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                        مسؤول الدرج: {String(activeShift.openedByName || activeShift.opened_by_name || (currentUser as any)?.name || currentUser?.username)}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    مقيدة على ورديتك
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: '#991b1b',
                    fontSize: '0.78rem',
                  }}
                >
                  <strong>تنبيه رقابي:</strong> ليس لديك وردية كاشير مفتوحة حالياً للصرف منها.
                </div>
              )}
            </div>

            {formError && (
              <div
                className="error-box"
                style={{
                  marginBottom: 10,
                  padding: '8px 10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#991b1b',
                  fontSize: '0.78rem',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                {t('hr.quick_cash_advance_modal.cancel', 'إلغاء')}
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !activeShift || !employeeId || !parsedAmount}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {requiresManagerAuth && <LockIcon size={14} color="#ffffff" />}
                {mutation.isPending
                  ? 'جاري الصرف والتسجيل...'
                  : requiresManagerAuth
                    ? (activeTab === 'payout' ? 'اعتماد وصرف الراتب' : 'اعتماد وصرف السلفة')
                    : (activeTab === 'payout' ? 'تأكيد صرف الراتب وتصفية الرصيد' : 'صرف المسحوب من المستحقات')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DialogShell>
  );
}
