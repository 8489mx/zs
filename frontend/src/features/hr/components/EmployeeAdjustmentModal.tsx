import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { hrApi } from '@/features/hr/api/hr.api';

interface EmployeeAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string;
}

export function EmployeeAdjustmentModal({ isOpen, onClose, employeeId, employeeName }: EmployeeAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'deduction'>('bonus');
  const [amountType, setAmountType] = useState<'money' | 'days' | 'hours'>('money');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      await hrApi.post(`/hr/employees/${employeeId}/adjustments`, {
        adjustmentType,
        amountType,
        amount: Number(amount),
        reason,
      });
    },
    onSuccess: () => {
      onClose();
      // We can reload the data from the caller
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    submitMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل مكافأة / خصم">
      <form onSubmit={handleSubmit} className="form-grid" dir="rtl" style={{ minWidth: '400px' }}>
        <div style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
          <strong>الموظف:</strong> {employeeName}
        </div>

        <div className="field">
          <label>النوع</label>
          <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as any)} className="input-element">
            <option value="bonus">مكافأة</option>
            <option value="deduction">خصم</option>
          </select>
        </div>

        <div className="field">
          <label>وحدة القياس</label>
          <select value={amountType} onChange={(e) => setAmountType(e.target.value as any)} className="input-element">
            <option value="money">مبلغ نقدي</option>
            <option value="days">أيام</option>
            <option value="hours">ساعات</option>
          </select>
        </div>

        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>القيمة</label>
          <Input 
            type="number" 
            step="0.01" 
            min="0"
            required 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
          />
        </div>

        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>السبب / ملاحظات</label>
          <Input 
            required 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
          />
        </div>

        <div className="compact-actions" style={{ gridColumn: '1 / -1', marginTop: 16 }}>
          <Button type="submit" isLoading={submitMutation.isPending}>حفظ</Button>
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}
