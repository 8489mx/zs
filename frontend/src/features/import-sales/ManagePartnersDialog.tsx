import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { usePartnersQuery, useCreatePartnerMutation, useDeletePartnerMutation, useUpdatePartnerMutation, Partner } from './api/shipments.api';
import { MutationFeedback } from '@/shared/components/mutation-feedback';

export function ManagePartnersDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { data: partners, isLoading } = usePartnersQuery();
  const createMutation = useCreatePartnerMutation();
  const deleteMutation = useDeletePartnerMutation();
  const updateMutation = useUpdatePartnerMutation();
  
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [capital, setCapital] = useState('');

  // Local state for editing existing partners
  const [localPartners, setLocalPartners] = useState<Partner[]>([]);

  useEffect(() => {
    if (partners) {
      setLocalPartners(partners);
    }
  }, [partners]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const percNum = Number(percentage) || 0;
    const capNum = Number(capital) || 0;
    await createMutation.mutateAsync({ name, percentage: percNum, capitalAmount: capNum });
    setName('');
    setPercentage('');
    setCapital('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الشريك؟ (لا يمكن التراجع، وسيؤثر على الحسابات السابقة إذا لم تكن مقفلة)')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleCapitalChange = (id: string, newCap: string) => {
    setLocalPartners(prev => prev.map(p => p.id === id ? { ...p, capital_amount: Number(newCap) } : p));
  };
  
  const handlePercentageChange = (id: string, newPerc: string) => {
    setLocalPartners(prev => prev.map(p => p.id === id ? { ...p, profit_share_percentage: Number(newPerc) } : p));
  };

  const recalculateFromCapital = () => {
    const totalCap = localPartners.reduce((sum, p) => sum + (Number(p.capital_amount) || 0), 0);
    if (totalCap <= 0) return alert('إجمالي رأس المال صفر، لا يمكن حساب النسب.');
    
    setLocalPartners(prev => prev.map(p => ({
      ...p,
      profit_share_percentage: Number(((Number(p.capital_amount) || 0) / totalCap * 100).toFixed(2))
    })));
  };

  const saveChanges = async () => {
    for (const p of localPartners) {
      const original = partners?.find(op => op.id === p.id);
      if (original?.capital_amount !== p.capital_amount || original?.profit_share_percentage !== p.profit_share_percentage) {
        await updateMutation.mutateAsync({ 
          id: p.id, 
          capitalAmount: Number(p.capital_amount), 
          percentage: Number(p.profit_share_percentage) 
        });
      }
    }
    alert('تم حفظ التعديلات بنجاح');
    onClose();
  };

  return (
    <DialogShell open={open} onClose={onClose} width="850px">
      <div style={{ padding: '32px', direction: 'rtl', background: 'var(--white)' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold', color: 'var(--gray-900)' }}>إدارة الشركاء ورأس المال</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: '24px', fontSize: '14px' }}>
          قم بتحديد رأس المال لكل شريك ليقوم النظام بحساب نسب الأرباح، أو أدخل النسبة يدوياً. التعديل هنا سيؤثر على جميع الحسابات الغير مغلقة.
        </p>
        
        {/* Add Partner Section */}
        <div style={{ background: 'var(--gray-50)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gray-200)', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--gray-700)' }}>إضافة شريك جديد</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <Field label="اسم الشريك">
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="مثال: أحمد" />
            </Field>
            <Field label="رأس المال المدفوع (اختياري)">
              <input type="number" min="0" value={capital} onChange={e => setCapital(e.target.value)} className="input" placeholder="المبلغ" />
            </Field>
            <Field label="النسبة المئوية (اختياري)">
              <input type="number" step="0.01" min="0" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} className="input" placeholder="%" />
            </Field>
            <Button type="submit" variant="primary" disabled={createMutation.isPending} style={{ height: '42px' }}>إضافة شريك</Button>
          </form>
          <MutationFeedback isError={createMutation.isError} isSuccess={createMutation.isSuccess} error={createMutation.error} />
        </div>

        {/* List Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: '0', fontSize: '18px', color: 'var(--gray-800)' }}>الشركاء الحاليين وتوزيع النسب</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" onClick={recalculateFromCapital} title="يتم حساب النسبة تلقائياً بناءً على مبالغ رأس المال لكل شريك">
              إعادة حساب النسب من رأس المال
            </Button>
            <Button variant="primary" onClick={saveChanges} disabled={updateMutation.isPending}>
              حفظ التعديلات
            </Button>
          </div>
        </div>

        {isLoading ? <p style={{ color: 'var(--gray-500)', textAlign: 'center' }}>جاري التحميل...</p> : (
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--white)' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '16px', textAlign: 'right', color: 'var(--gray-600)', fontWeight: '600' }}>اسم الشريك</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: 'var(--gray-600)', fontWeight: '600', width: '200px' }}>رأس المال (المبلغ)</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: 'var(--gray-600)', fontWeight: '600', width: '180px' }}>نسبة الأرباح (%)</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-600)', fontWeight: '600', width: '100px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {localPartners.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-800)' }}>{p.name}</td>
                    <td style={{ padding: '16px' }}>
                      <input 
                        type="number" 
                        className="input" 
                        value={p.capital_amount ?? ''} 
                        onChange={e => handleCapitalChange(p.id, e.target.value)}
                        style={{ width: '100%', background: 'var(--white)' }}
                        placeholder="0"
                      />
                    </td>
                    <td style={{ padding: '16px' }} dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <span style={{ color: 'var(--gray-500)', fontWeight: 'bold' }}>%</span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="input" 
                          value={p.profit_share_percentage ?? ''} 
                          onChange={e => handlePercentageChange(p.id, e.target.value)}
                          style={{ width: '100%', textAlign: 'center', background: 'var(--white)' }}
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Button variant="danger" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending} style={{ padding: '6px 12px', fontSize: '12px' }}>
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))}
                {localPartners.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-500)' }}>
                      لا يوجد شركاء مسجلين. قم بإضافة شريكك الأول لتبدأ.
                    </td>
                  </tr>
                )}
                {localPartners.length > 0 && (
                  <tr style={{ background: 'var(--primary-50)', fontWeight: 'bold', color: 'var(--primary-900)' }}>
                    <td style={{ padding: '16px' }}>الإجمالي</td>
                    <td style={{ padding: '16px' }}>
                      {localPartners.reduce((sum, p) => sum + (Number(p.capital_amount) || 0), 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {localPartners.reduce((sum, p) => sum + (Number(p.profit_share_percentage) || 0), 0).toFixed(2)}%
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
