import { useState, useEffect, FormEvent } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/errors';
import { http } from '@/lib/http';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';

export function QuickCashAdvanceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  
  const queryClient = useQueryClient();
  const canManageLoans = useHasAnyPermission('hrLoans');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + S
      if (e.ctrlKey && e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS' || e.key === 'س')) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch active employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['hr.employees', { pageSize: 1000 }],
    queryFn: () => http<any>('/api/hr/employees?pageSize=1000&status=active'),
    enabled: isOpen && canManageLoans,
  });

  // Fetch active cashier shift if any
  const { data: shiftData } = useQuery({
    queryKey: ['pos.shifts.current'],
    queryFn: () => http<any>('/api/pos/shifts/current'),
    enabled: isOpen && canManageLoans,
  });

  const employees = employeesData?.employees || [];
  const activeShift = shiftData?.shift;

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return http('/api/hr/advances/quick-cash', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr.loans'] });
      queryClient.invalidateQueries({ queryKey: ['pos.shifts'] });
      queryClient.invalidateQueries({ queryKey: ['hr.payrollRuns'] });
      
      setIsOpen(false);
      setEmployeeId('');
      setAmount('');
      setNotes('');
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
    if (!amount || Number(amount) <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح.');
      return;
    }

    mutation.mutate({
      employeeId: Number(employeeId),
      amount: Number(amount),
      notes: notes,
      shiftId: activeShift ? Number(activeShift.id) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <DialogShell open={isOpen} onClose={() => setIsOpen(false)} width="400px">
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginTop: 0 }}>صرف سلفة سريعة</h2>
        
        {!canManageLoans ? (
          <p className="muted">لا تملك صلاحية الوصول لقسم السلف.</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field field-wide" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>الموظف *</span>
              <CustomSelect
                value={employeeId}
                onChange={(val) => setEmployeeId(val)}
                options={[
                  { value: '', label: 'اختيار الموظف' },
                  ...employees.map((emp: any) => ({ value: emp.id, label: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name })),
                ]}
              />
            </div>
            
            <label className="field field-wide">
              <span>المبلغ *</span>
              <input type="number" min="1" step="any" value={amount} onChange={e => setAmount(e.target.value)} required />
            </label>

            <label className="field field-wide">
              <span>ملاحظات</span>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="سلفة سريعة من الكاشير" />
            </label>

            {activeShift ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>سيتم الخصم من عهدة الكاشير (الوردية الحالية).</p>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>سيتم الخصم من الخزينة الرئيسية.</p>
            )}

            {formError && <div className="error-box">{formError}</div>}

            <div className="actions compact-actions field-wide" style={{ marginTop: 16 }}>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'جاري الحفظ...' : 'تسجيل السلفة'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DialogShell>
  );
}
