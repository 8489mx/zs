import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { usePartnersQuery, useCreatePartnerMutation, useDeletePartnerMutation } from './api/shipments.api';
import { MutationFeedback } from '@/shared/components/mutation-feedback';

export function ManagePartnersDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { data: partners, isLoading } = usePartnersQuery();
  const createMutation = useCreatePartnerMutation();
  const deleteMutation = useDeletePartnerMutation();
  
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !percentage) return;
    await createMutation.mutateAsync({ name, percentage: Number(percentage) });
    setName('');
    setPercentage('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الشريك؟')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <DialogShell open={open} onClose={onClose} width="600px">
      <div style={{ padding: '24px', direction: 'rtl' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>إدارة الشركاء ونسب التوزيع</h2>
        <form onSubmit={handleAdd} className="form-grid" style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
          <Field label="اسم الشريك">
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </Field>
          <Field label="النسبة المئوية (%)">
            <input type="number" step="0.01" min="0" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} required />
          </Field>
          <div className="actions" style={{ gridColumn: 'span 2' }}>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>إضافة الشريك</Button>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <MutationFeedback isError={createMutation.isError} isSuccess={createMutation.isSuccess} error={createMutation.error} />
          </div>
        </form>

        <h4>قائمة الشركاء الحاليين</h4>
        {isLoading ? <p>جاري التحميل...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ background: 'var(--gray-100)', borderBottom: '2px solid var(--gray-200)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>النسبة (%)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {partners?.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <td style={{ padding: '0.75rem' }}>{p.name}</td>
                  <td style={{ padding: '0.75rem' }} dir="ltr">{p.profit_share_percentage}%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <Button variant="danger" className="btn-sm" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending}>حذف</Button>
                  </td>
                </tr>
              ))}
              {partners?.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-500)' }}>لا يوجد شركاء بعد.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </DialogShell>
  );
}
