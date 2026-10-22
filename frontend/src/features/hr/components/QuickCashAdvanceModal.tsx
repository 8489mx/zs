import { useTranslation } from 'react-i18next';
import { useState, useEffect, FormEvent } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/errors';
import { http } from '@/lib/http';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { useAuthStore } from '@/stores/auth-store';

export function QuickCashAdvanceModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [_selectedShiftId, setSelectedShiftId] = useState('');
  const [formError, setFormError] = useState('');
  
  const queryClient = useQueryClient();
  const canManageLoans = useHasAnyPermission('hrLoans');
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + X
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
    enabled: isOpen && canManageLoans,
  });

  // Fetch open cashier shifts
  const { data: shiftData } = useQuery({
    queryKey: ['pos.shifts.current'],
    queryFn: () => http<{ cashierShifts?: Array<Record<string, unknown>> }>('/api/cashier-shifts?status=open&pageSize=100'),
    enabled: isOpen && canManageLoans,
  });

  const employees = employeesData?.employees || [];
  const shifts = shiftData?.cashierShifts || [];

  // Lock shift strictly to current user's open shift (to prevent discharging from someone else's drawer)
  const userOpenShift = shifts.find(
    (shift: Record<string, unknown>) =>
      String(shift.openedById || shift.opened_by) === String(currentUser?.id) &&
      String(shift.status || 'open') === 'open'
  );
  // Fallback for super_admin only if super_admin opened this modal without their own cashier shift
  const activeShift = userOpenShift || (currentUser?.role === 'super_admin' ? shifts[0] : null);

  useEffect(() => {
    if (activeShift?.id) {
      setSelectedShiftId(String(activeShift.id));
    } else {
      setSelectedShiftId('');
    }
  }, [activeShift]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return http('/api/hr/advances/quick-cash', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr.loans'] });
      queryClient.invalidateQueries({ queryKey: ['pos.shifts'] });
      queryClient.invalidateQueries({ queryKey: ['hr.payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['hr.financialStatement'] });
      
      setIsOpen(false);
      setEmployeeId('');
      setAmount('');
      setNotes('');
      setSelectedShiftId('');
      setFormError('');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, 'تعذر تسجيل السلفة.'));
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!employeeId) {
      setFormError('يرجى اختيار الموظف.');
      return;
    }
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Math.abs(Number(amount) * 100 - Math.round(Number(amount) * 100)) > 0.000001) {
      setFormError('يرجى إدخال مبلغ صحيح.');
      return;
    }
    if (!notes.trim()) {
      setFormError('يجب كتابة سبب السلفة وتفاصيلها.');
      return;
    }
    if (!activeShift) {
      setFormError('لا توجد وردية كاشير مفتوحة باسمك للصرف منها.');
      return;
    }

    mutation.mutate({
      employeeId: Number(employeeId),
      amount: Number(amount),
      notes: notes.trim(),
      shiftId: Number(activeShift.id),
    });
  };

  if (!isOpen) return null;

  return (
    <DialogShell open={isOpen} onClose={() => setIsOpen(false)} width="440px">
      <div style={{ padding: '24px' }} dir="rtl">
        <h2 style={{ marginTop: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
          {t('hr.quick_cash_advance_modal.s0', "صرف سلفة سريعة من الكاشير")}
        </h2>
        
        {!canManageLoans ? (
          <p className="muted">{t('hr.quick_cash_advance_modal.s1', "لا تملك صلاحية الوصول لقسم السلف.")}</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field field-wide" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {t('hr.quick_cash_advance_modal.s2', "الموظف *")}
              </span>
              <CustomSelect
                value={employeeId}
                onChange={(val) => setEmployeeId(val)}
                options={[
                  { value: '', label: t('hr.quick_cash_advance_modal.s3', "اختيار الموظف") },
                  ...employees.map((emp: any) => ({
                    value: emp.id,
                    label: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name,
                  })),
                ]}
              />
            </div>
            
            <label className="field field-wide" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {t('hr.quick_cash_advance_modal.s4', "المبلغ *")}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            <label className="field field-wide" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {t('hr.quick_cash_advance_modal.s5', "ملاحظات وسبب الصرف *")}
              </span>
              <input
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سبب صرف السلفة أو المسحوب (مطلوب)"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            {/* الوردية المنصرف منها - مقفولة حصراً على وردية المستخدم الحالي */}
            <div className="field field-wide" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                {t('hr.quick_cash_advance_modal.shift_header', "الوردية المنصرف منها المسحوب (مقيدة باسمك) *")}
              </span>

              {activeShift ? (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#16a34a',
                    }} />
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>
                        {activeShift.docNo ? `${activeShift.docNo} (#${activeShift.id})` : `وردية كاشير #${activeShift.id}`}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {t('hr.quick_cash_advance_modal.responsible_cashier', "المسؤول عن الدرج:")} {String(activeShift.openedByName || activeShift.opened_by_name || (currentUser as any)?.name || currentUser?.username)}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}>
                    {t('hr.quick_cash_advance_modal.locked_badge', "مقيدة على ورديتك")}
                  </span>
                </div>
              ) : (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                }}>
                  <strong>{t('hr.quick_cash_advance_modal.no_shift_title', "تنبيه رقابي:")}</strong>{' '}
                  {t('hr.quick_cash_advance_modal.no_shift_desc', "ليس لديك وردية كاشير مفتوحة حالياً للصرف منها. لا يمكن صرف نقدية للموظف إلا بوجود وردية نقدية مفتوحة باسمك لتوثيق خروج النقدية من عهدتك.")}
                </div>
              )}

              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                {t('hr.quick_cash_advance_modal.audit_info', "يتم تسجيل العملية في عهدة الكاشير الحالي وخصمها من الراتب القادم للموظف آلياً.")}
              </small>
            </div>

            {formError && <div className="error-box" style={{ marginBottom: 12 }}>{formError}</div>}

            <div className="actions compact-actions field-wide" style={{ marginTop: 14 }}>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                {t('hr.quick_cash_advance_modal.s9', "إلغاء")}
              </Button>
              <Button type="submit" disabled={mutation.isPending || !activeShift}>
                {mutation.isPending ? t('hr.quick_cash_advance_modal.s10', "جاري الحفظ...") : t('hr.quick_cash_advance_modal.s11', "تسجيل السلفة")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DialogShell>
  );
}
