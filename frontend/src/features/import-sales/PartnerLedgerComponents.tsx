import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { usePartnerLedgerQuery, useRecordCapitalTransactionMutation, Partner } from './api/shipments.api';
import { MutationFeedback } from '@/shared/components/mutation-feedback';

export function CapitalTransactionDialog({ 
  partner, 
  type, 
  open, 
  onClose 
}: { 
  partner: Partner | null, 
  type: 'DEPOSIT' | 'WITHDRAWAL', 
  open: boolean, 
  onClose: () => void 
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  const mutation = useRecordCapitalTransactionMutation(partner?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !partner) return;
    await mutation.mutateAsync({
      type,
      amount: Number(amount),
      date,
      note
    });
    setAmount('');
    setNote('');
    onClose();
  };

  return (
    <DialogShell open={open} onClose={onClose} width="400px">
      <div style={{ padding: '24px', direction: 'rtl', background: 'var(--white)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--gray-900)' }}>
          {type === 'DEPOSIT' ? 'إضافة رأس مال' : 'سحب رأس مال'} - {partner?.name}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="المبلغ">
            <input type="number" min="0.01" step="0.01" className="input" value={amount} onChange={e => setAmount(e.target.value)} required />
          </Field>
          <Field label="تاريخ الحركة">
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
          </Field>
          <Field label="ملاحظات (اختياري)">
            <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button type="submit" variant={type === 'DEPOSIT' ? 'primary' : 'danger'} disabled={mutation.isPending}>
              حفظ الحركة
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          </div>
          <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} />
        </form>
      </div>
    </DialogShell>
  );
}

export function PartnerLedgerDialog({ partner, open, onClose }: { partner: Partner | null, open: boolean, onClose: () => void }) {
  const { data: ledger, isLoading } = usePartnerLedgerQuery(partner?.id || '');

  return (
    <DialogShell open={open} onClose={onClose} width="650px">
      <div style={{ padding: '24px', direction: 'rtl', background: 'var(--white)' }}>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--gray-900)' }}>كشف حساب رأس مال: {partner?.name}</h3>
        <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
          رأس المال الحالي: <strong>{Number(partner?.capital_amount || 0).toLocaleString()}</strong>
        </p>

        {isLoading ? <p>جاري التحميل...</p> : (
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '12px' }}>التاريخ</th>
                  <th style={{ padding: '12px' }}>نوع الحركة</th>
                  <th style={{ padding: '12px' }}>المبلغ</th>
                  <th style={{ padding: '12px' }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {ledger?.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '12px' }}>{new Date(entry.transaction_date).toLocaleDateString('ar-EG')}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {entry.type === 'DEPOSIT' && <span style={{ color: 'var(--green-600)' }}>إيداع رأس مال</span>}
                      {entry.type === 'WITHDRAWAL' && <span style={{ color: 'var(--red-600)' }}>سحب رأس مال</span>}
                      {entry.type === 'PROFIT_PAYOUT' && <span style={{ color: 'var(--blue-600)' }}>صرف أرباح</span>}
                    </td>
                    <td style={{ padding: '12px', direction: 'ltr', textAlign: 'right' }}>
                      {entry.type !== 'DEPOSIT' ? '-' : ''}{Number(entry.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--gray-600)' }}>{entry.note}</td>
                  </tr>
                ))}
                {ledger?.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)' }}>
                      لا توجد حركات مسجلة لهذا الشريك.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: '24px', textAlign: 'left' }}>
          <Button variant="secondary" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </DialogShell>
  );
}
