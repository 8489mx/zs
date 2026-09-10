import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon, UsersIcon } from '@/shared/components/icons/AppIcons';
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
    if (!name.trim()) return;
    const percNum = Number(percentage) || 0;
    const capNum = Number(capitalAmount) || 0;
    if (capNum > 0 && !accountId) {
      return alert('الرجاء اختيار الخزينة لإيداع رأس المال الافتتاحي');
    }
    await createMutation.mutateAsync({ name: name.trim(), percentage: percNum, capitalAmount: capNum, accountId: accountId || undefined } as any);
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
      <StandardDialog 
        open={open} 
        onClose={onClose} 
        title="إدارة الشركاء ورأس المال وتوزيع الأرباح"
        subtitle="تحديد رأس مال كل شريك، إدارة عمليات السحب والإيداع، وضبط نسب توزيع الأرباح تلقائياً أو يدوياً."
        width="min(860px, 95vw)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} dir="rtl">
          {/* Add Partner Section */}
          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>إضافة شريك جديد</span>
            </h4>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                    اسم الشريك <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    placeholder="مثال: أحمد محمد"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                    النسبة المئوية (%)
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="100" 
                    value={percentage} 
                    onChange={e => setPercentage(e.target.value)} 
                    placeholder="اختياري %"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                    رأس المال الافتتاحي
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={capitalAmount} 
                    onChange={e => setCapitalAmount(e.target.value)} 
                    placeholder="0.00 ج.م"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                    الخزينة / البنك للإيداع
                  </label>
                  <select 
                    value={accountId} 
                    onChange={e => setAccountId(e.target.value)} 
                    required={Number(capitalAmount) > 0}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- اختر الخزينة --</option>
                    {treasuryAccounts?.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={createMutation.isPending} 
                    style={{
                      height: '36px',
                      width: '100%',
                      padding: '0 14px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>إضافة شريك</span>
                  </Button>
                </div>
              </div>
            </form>
            <MutationFeedback isError={createMutation.isError} isSuccess={createMutation.isSuccess} error={createMutation.error} />
          </div>

          {/* List Section */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  الشركاء الحاليين وتوزيع النسب
                </h4>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {localPartners.length} شركاء مسجلين
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant="secondary" 
                  onClick={recalculateFromCapital} 
                  title="يتم حساب النسبة تلقائياً بناءً على مبالغ رأس المال لكل شريك"
                  style={{ height: '32px', padding: '0 10px', fontSize: '0.76rem', fontWeight: 700, borderRadius: '6px' }}
                >
                  إعادة حساب النسب من رأس المال
                </Button>
                <Button 
                  variant="primary" 
                  onClick={saveChanges} 
                  disabled={updateMutation.isPending}
                  style={{ height: '32px', padding: '0 14px', fontSize: '0.76rem', fontWeight: 700, background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px' }}
                >
                  {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ تعديلات النسب'}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>جاري التحميل...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                      <th style={{ padding: '10px 14px' }}>اسم الشريك</th>
                      <th style={{ padding: '10px 14px', width: '240px' }}>رأس المال الحالي</th>
                      <th style={{ padding: '10px 14px', width: '140px' }}>نسبة الأرباح (%)</th>
                      <th style={{ padding: '10px 14px', width: '180px', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPartners.map((p, idx) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#170e5e' }}>
                              {Number(p.capital_amount || 0).toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                            </span>
                            <div style={{ display: 'inline-flex', gap: '3px' }}>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setTxPartner({ partner: p, type: 'DEPOSIT' })} 
                                title="إيداع رأس مال"
                                style={{ padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700, height: '22px', borderRadius: '4px' }}
                              >
                                + إيداع
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setTxPartner({ partner: p, type: 'WITHDRAWAL' })} 
                                title="سحب رأس مال"
                                style={{ padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700, height: '22px', borderRadius: '4px' }}
                              >
                                - سحب
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }} dir="ltr">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.78rem' }}>%</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={p.profit_share_percentage ?? ''} 
                              onChange={e => handlePercentageChange(p.id, e.target.value)}
                              style={{ 
                                width: '70px', 
                                textAlign: 'center', 
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: '#ffffff',
                                color: '#0f172a',
                                outline: 'none'
                              }}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              onClick={() => setLedgerPartner(p)}
                              style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, height: '26px', borderRadius: '4px' }}
                            >
                              كشف حساب
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-danger" 
                              onClick={() => handleDelete(p.id)} 
                              disabled={deleteMutation.isPending}
                              style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, height: '26px', borderRadius: '4px' }}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {localPartners.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '36px 16px', textAlign: 'center' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', color: '#94a3b8' }}>
                            <UsersIcon size={20} />
                          </div>
                          <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.84rem' }}>لا يوجد شركاء مسجلين</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>قم بإضافة شريك جديد من النموذج أعلاه لبدء توزيع الأرباح.</div>
                        </td>
                      </tr>
                    )}
                    {localPartners.length > 0 && (() => {
                      const totalCapital = localPartners.reduce((sum, p) => sum + (Number(p.capital_amount) || 0), 0);
                      const totalPercentage = localPartners.reduce((sum, p) => sum + (Number(p.profit_share_percentage) || 0), 0);
                      const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

                      return (
                        <>
                          <tr style={{ background: '#f8fafc', fontWeight: 800, color: '#0f172a', borderTop: '2px solid #e2e8f0' }}>
                            <td style={{ padding: '12px 14px' }}>الإجمالي الكلي</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.88rem', color: '#170e5e' }}>
                              {totalCapital.toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: isPercentageValid ? '#15803d' : '#b91c1c', fontWeight: 800 }} dir="ltr">
                              {totalPercentage.toFixed(2)}%
                            </td>
                            <td></td>
                          </tr>
                          {!isPercentageValid && (
                            <tr>
                              <td colSpan={4} style={{ padding: '8px 14px', background: '#fef2f2', color: '#991b1b', fontSize: '0.76rem', textAlign: 'center', borderTop: '1px solid #fee2e2' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                  <AlertTriangleIcon size={15} color="#b91c1c" />
                                  <span>تنبيه: إجمالي نسب الأرباح لا يساوي 100%. يرجى الضغط على زر "إعادة حساب النسب" أو تعديلها يدوياً.</span>
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
        </div>
      </StandardDialog>

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

