import { useState } from 'react';
import type { HrEmployeeAdjustment } from '@/types/domain';
import { money, fallbackText } from '@/features/hr/utils/employee-profile.helpers';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';

interface EmployeeAdjustmentsSectionProps {
  adjustments: HrEmployeeAdjustment[];
  onAddAdjustment: (payload: any) => Promise<void>;
  onDeleteAdjustment: (id: string) => Promise<void>;
  isBusy: boolean;
}

export function EmployeeAdjustmentsSection({ adjustments, onAddAdjustment, onDeleteAdjustment, isBusy }: EmployeeAdjustmentsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'allowance' | 'deduction'>('allowance');
  const [amountType, setAmountType] = useState<'money' | 'days' | 'hours'>('money');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('الرجاء إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }
    if (!date) {
      setError('الرجاء إدخال التاريخ.');
      return;
    }

    try {
      await onAddAdjustment({
        adjustmentType,
        amountType,
        amount: Number(amount),
        date,
        reason
      });
      setShowAddForm(false);
      setAmount('');
      setReason('');
      setDate('');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الإضافة');
    }
  };

  return (
    <FormSection title="المكافآت والخصومات" description="سجل المكافآت أو الخصومات للموظف هنا. سيتم احتسابها تلقائياً مع أقرب مسير رواتب.">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button type="button" onClick={() => setShowAddForm(!showAddForm)} disabled={isBusy}>
          {showAddForm ? 'إلغاء' : 'إضافة مكافأة / خصم'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="form-grid" style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 8 }}>
          <label className="field">
            <span>النوع</span>
            <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as any)} disabled={isBusy}>
              <option value="allowance">مكافأة (إضافة)</option>
              <option value="deduction">خصم (استقطاع)</option>
            </select>
          </label>
          
          <label className="field">
            <span>نوع القيمة</span>
            <select value={amountType} onChange={e => setAmountType(e.target.value as any)} disabled={isBusy}>
              <option value="money">مبلغ نقدي</option>
              <option value="days">أيام</option>
              <option value="hours">ساعات</option>
            </select>
          </label>

          <label className="field">
            <span>القيمة</span>
            <input 
              type="number" 
              step="any" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="مثال: 500" 
              disabled={isBusy}
            />
          </label>

          <label className="field">
            <span>التاريخ</span>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              disabled={isBusy}
            />
          </label>

          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>السبب / ملاحظات</span>
            <input 
              type="text" 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="سبب المكافأة أو الخصم" 
              disabled={isBusy}
            />
          </label>

          {error && <div className="error-box" style={{ gridColumn: '1 / -1' }}>{error}</div>}

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="submit" disabled={isBusy}>حفظ</Button>
          </div>
        </form>
      )}

      {adjustments.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>القيمة</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(adj => (
                <tr key={adj.id}>
                  <td>{adj.date}</td>
                  <td>
                    <span className={`badge ${adj.adjustmentType === 'allowance' ? 'success' : 'danger'}`}>
                      {adj.adjustmentType === 'allowance' ? 'مكافأة' : 'خصم'}
                    </span>
                  </td>
                  <td>
                    {adj.amountType === 'money' ? money(adj.amount) : `${adj.amount} ${adj.amountType === 'days' ? 'أيام' : 'ساعات'}`}
                  </td>
                  <td>{fallbackText(adj.reason)}</td>
                  <td>
                    <span className={`badge ${adj.status === 'applied' ? 'success' : 'warning'}`}>
                      {adj.status === 'applied' ? 'تم الاحتساب' : 'قيد الانتظار'}
                    </span>
                  </td>
                  <td>
                    {adj.status === 'pending' && (
                      <Button type="button" variant="danger" onClick={() => onDeleteAdjustment(adj.id)} disabled={isBusy}>حذف</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">لا توجد مكافآت أو خصومات مسجلة.</p>
      )}
    </FormSection>
  );
}
