import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { Field } from '@/shared/ui/field';
import { usePartnersQuery, useCreatePartnerMutation, useDeletePartnerMutation, useUpdatePartnerMutation, Partner } from './api/shipments.api';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { CapitalTransactionDialog, PartnerLedgerDialog } from './PartnerLedgerComponents';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

export function ManagePartnersDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { data: partners, isLoading } = usePartnersQuery();
  const createMutation = useCreatePartnerMutation();
  const deleteMutation = useDeletePartnerMutation();
  const updateMutation = useUpdatePartnerMutation();
  
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [accountId, setAccountId] = useState('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => http<{ accounts: any[] }>('/api/accounting/accounts').catch(() => ({ accounts: [] })),
  });
  const treasuryAccounts = (accountsData?.accounts || []).filter((a: any) => a.accountGroup === 'current_assets' || a.flags?.isCashBank);

  // Modals state
  const [txPartner, setTxPartner] = useState<{ partner: Partner, type: 'DEPOSIT' | 'WITHDRAWAL' } | null>(null);
  const [ledgerPartner, setLedgerPartner] = useState<Partner | null>(null);

  // Local state for editing existing percentages
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
    const capNum = Number(capitalAmount) || 0;
    if (capNum > 0 && !accountId) {
      return alert('الرجاء اختيار الخزينة لإيداع رأس المال الافتتاحي');
    }
    await createMutation.mutateAsync({ name, percentage: percNum, capitalAmount: capNum, accountId: accountId || undefined } as any);
    setName('');
    setPercentage('');
    setCapitalAmount('');
    setAccountId('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الشريك؟ (لا يمكن التراجع، وسيؤثر على الحسابات السابقة إذا لم تكن مقفلة)')) {
      await deleteMutation.mutateAsync(id);
      setLocalPartners(prev => prev.filter(p => p.id !== id));
    }
  };
  
  const handlePercentageChange = (id: string, newPerc: string) => {
    setLocalPartners(prev => prev.map(p => p.id === id ? { ...p, profit_share_percentage: Number(newPerc) } : p));
  };

  const recalculateFromCapital = () => {
    // Note: use localPartners because they have the latest capital_amount from the DB via useEffect sync
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
      if (original?.profit_share_percentage !== p.profit_share_percentage) {
        await updateMutation.mutateAsync({ 
          id: p.id, 
          percentage: Number(p.profit_share_percentage) 
        });
      }
    }
    alert('تم حفظ تعديلات النسب بنجاح');
  };

  return (
    <>
      <DialogShell open={open} onClose={onClose} width="950px">
        <div style={{ padding: '32px', direction: 'rtl', background: 'var(--white)' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold', color: 'var(--gray-900)' }}>إدارة الشركاء ورأس المال</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '24px', fontSize: '14px' }}>
            قم بتحديد رأس المال لكل شريك عبر أزرار السحب والإيداع ليتم تسجيلها بتواريخها، ثم قم بحساب النسب تلقائياً.
          </p>
          
          {/* Add Partner Section */}
          <div style={{ background: 'var(--gray-50)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gray-200)', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--gray-700)' }}>إضافة شريك جديد</h3>
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
              <Field label="اسم الشريك">
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="مثال: أحمد" />
              </Field>
              <Field label="النسبة المئوية (اختياري)">
                <input type="number" step="0.01" min="0" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} className="input" placeholder="%" />
              </Field>
              <Field label="رأس المال الافتتاحي">
                <input type="number" step="0.01" min="0" value={capitalAmount} onChange={e => setCapitalAmount(e.target.value)} className="input" placeholder="المبلغ" />
              </Field>
              <Field label="الخزينة/البنك (للإيداع)">
                <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)} required={Number(capitalAmount) > 0}>
                  <option value="">-- اختر --</option>
                  {treasuryAccounts?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>
                  ))}
                </select>
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
                حفظ تعديلات النسب
              </Button>
            </div>
          </div>

          {isLoading ? <p style={{ color: 'var(--gray-500)', textAlign: 'center' }}>جاري التحميل...</p> : (
            <div style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--white)' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--gray-600)', fontWeight: '600' }}>اسم الشريك</th>
                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--gray-600)', fontWeight: '600', width: '280px' }}>رأس المال (المبلغ)</th>
                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--gray-600)', fontWeight: '600', width: '180px' }}>نسبة الأرباح (%)</th>
                    <th style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-600)', fontWeight: '600', width: '220px' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {localPartners.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-800)' }}>{p.name}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {Number(p.capital_amount || 0).toLocaleString()}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button variant="secondary" className="btn-sm" onClick={() => setTxPartner({ partner: p, type: 'DEPOSIT' })} title="إيداع رأس مال">+</Button>
                            <Button variant="secondary" className="btn-sm" onClick={() => setTxPartner({ partner: p, type: 'WITHDRAWAL' })} title="سحب رأس مال">-</Button>
                          </div>
                        </div>
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
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Button variant="secondary" className="btn-sm" onClick={() => setLedgerPartner(p)}>كشف حساب</Button>
                          <Button variant="danger" className="btn-sm" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending}>حذف</Button>
                        </div>
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
                  {localPartners.length > 0 && (() => {
                    const totalCapital = localPartners.reduce((sum, p) => sum + (Number(p.capital_amount) || 0), 0);
                    const totalPercentage = localPartners.reduce((sum, p) => sum + (Number(p.profit_share_percentage) || 0), 0);
                    const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

                    return (
                      <>
                        <tr style={{ background: 'var(--primary-50)', fontWeight: 'bold', color: 'var(--primary-900)' }}>
                          <td style={{ padding: '16px' }}>الإجمالي</td>
                          <td style={{ padding: '16px' }}>
                            {totalCapital.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', color: isPercentageValid ? 'var(--primary-900)' : 'var(--red-600)' }}>
                            {totalPercentage.toFixed(2)}%
                          </td>
                          <td></td>
                        </tr>
                        {!isPercentageValid && (
                          <tr>
                            <td colSpan={4} style={{ padding: '8px 16px', background: 'var(--red-50)', color: 'var(--red-700)', fontSize: '13px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                <AlertTriangleIcon size={16} color="#b91c1c" />
                                <span>تنبيه: إجمالي نسب الأرباح لا يساوي 100%. يرجى الضغط على زر "إعادة حساب النسب" أو تعديلها يدوياً حتى لا تفقد جزء من الأرباح.</span>
                              </span>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogShell>

      {txPartner && (
        <CapitalTransactionDialog 
          open={!!txPartner} 
          partner={txPartner.partner} 
          type={txPartner.type} 
          onClose={() => setTxPartner(null)} 
        />
      )}

      {ledgerPartner && (
        <PartnerLedgerDialog 
          open={!!ledgerPartner} 
          partner={ledgerPartner} 
          onClose={() => setLedgerPartner(null)} 
        />
      )}
    </>
  );
}
