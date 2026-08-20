import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { tradeInApi, type UpsertTradeInPayload } from '../api/tradein.api';
import { TradeInDisclaimerModal } from '../components/TradeInDisclaimerModal';
import { BrandCombobox } from '@/shared/components/BrandCombobox';
import type { TradeInTransaction } from '@/types/domain-models/tradein';

export function TradeInPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new_sealed' | 'like_new' | 'used' | 'for_parts'>('all');
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [disclaimerTransaction, setDisclaimerTransaction] = useState<TradeInTransaction | null>(null);

  const [formData, setFormData] = useState<UpsertTradeInPayload>({
    sellerName: '',
    sellerPhone: '',
    sellerNationalId: '',
    deviceBrand: '',
    deviceModel: '',
    serialNumber: '',
    imei2: '',
    deviceConditionState: 'used',
    deviceConditionNotes: '',
    agreedPurchasePrice: 0,
    transactionType: 'cash_purchase',
    autoAddToInventory: true,
    resalePrice: 0,
    paymentMethod: 'cash',
    notes: '',
  });

  useAppToolbar([{ label: 'شراء واستبدال الأجهزة (شراء من الأفراد)' }]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tradein-transactions', searchQuery, page],
    queryFn: () =>
      tradeInApi.list({
        q: searchQuery || undefined,
        page,
        pageSize: 20,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertTradeInPayload) => tradeInApi.create(payload),
    onSuccess: (res) => {
      setCreateModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['tradein-transactions'] });
      void tradeInApi.get(res.id).then((r) => setDisclaimerTransaction(r.transaction));
    },
  });

  const allTransactions = data?.transactions || [];
  const totalItems = data?.pagination.totalItems || 0;

  const tradeInExchangeCount = allTransactions.filter((t) => t.transactionType === 'exchange_trade_in').length;
  const autoInventoryCount = allTransactions.filter((t) => Boolean(t.createdProductId)).length;
  const totalPurchaseSpend = allTransactions.reduce((acc, t) => acc + (t.agreedPurchasePrice || 0), 0);

  const transactions = allTransactions.filter((t) => {
    if (conditionFilter === 'all') return true;
    const notes = t.deviceConditionNotes || '';
    if (conditionFilter === 'new_sealed') return notes.includes('جديد متبرشم') || notes.includes('Sealed');
    if (conditionFilter === 'like_new') return notes.includes('كسر زيرو') || notes.includes('Like New');
    if (conditionFilter === 'used') return notes.includes('مستعمل') || (!notes.includes('جديد متبرشم') && !notes.includes('كسر زيرو') && !notes.includes('قطع غيار'));
    if (conditionFilter === 'for_parts') return notes.includes('قطع غيار') || notes.includes('تالف');
    return true;
  });

  const getConditionSuffix = (state?: string) => {
    if (state === 'new_sealed') return '(جديد متبرشم)';
    if (state === 'like_new') return '(كسر زيرو)';
    if (state === 'for_parts') return '(قطع غيار)';
    return '(مستعمل)';
  };

  const conditionLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
    new_sealed: { label: 'جديد متبرشم (Sealed)', bg: '#dcfce7', color: '#166534', border: '#86efac' },
    like_new: { label: 'كسر زيرو (Like New)', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    used: { label: 'مستعمل (Used)', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
    for_parts: { label: 'قطع غيار / تالف', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sellerName.trim() || !formData.sellerPhone.trim() || !formData.sellerNationalId.trim() || !formData.deviceModel.trim() || !formData.serialNumber.trim()) {
      alert('يرجى ملء كافة الحقول الإلزامية: اسم البائع، الهاتف، الرقم القومي، موديل الجهاز، والسيريال');
      return;
    }
    if (formData.agreedPurchasePrice <= 0) {
      alert('يرجى تحديد سعر الشراء المتفق عليه');
      return;
    }
    createMutation.mutate(formData);
  };

  const sendWhatsAppTradeInNotice = (t: TradeInTransaction) => {
    const storeName = settingsQuery.data?.storeName || 'المتجر';
    const cleanPhone = t.sellerPhone.replace(/\D/g, '');
    const phoneFormatted = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

    const message = `مرحباً أستاذ ${t.sellerName} 👋
معك ${storeName} بخصوص عملية بيع / استبدال جهازك:
📱 الموديل: ${t.deviceBrand ? `${t.deviceBrand} ` : ''}${t.deviceModel}
🔢 السيريال / IMEI: ${t.serialNumber}
💰 المبلغ المتفق عليه: ${t.agreedPurchasePrice.toFixed(2)} ج.م
📄 رقم الإقرار والتنازل: ${t.docNo}

نشكرك لتعاملك الراقي ونسعد بزيارتك دائماً!`;

    const url = `https://api.whatsapp.com/send?phone=${phoneFormatted}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="شراء واستبدال الأجهزة (شراء من الأفراد)"
          description="تسجيل شراء أجهزة جديدة، كسر زيرو، مستعملة، أو قطع غيار من العملاء، إدراجها بالمخزن، وطباعة إقرار التنازل الأمني."
          badge={<span className="nav-pill">{totalItems} عملية شراء/استبدال</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => {
                  setFormData({
                    sellerName: '',
                    sellerPhone: '',
                    sellerNationalId: '',
                    deviceBrand: '',
                    deviceModel: '',
                    serialNumber: '',
                    imei2: '',
                    deviceConditionState: 'used',
                    deviceConditionNotes: '',
                    agreedPurchasePrice: 0,
                    transactionType: 'cash_purchase',
                    autoAddToInventory: true,
                    resalePrice: 0,
                    paymentMethod: 'cash',
                    notes: '',
                  });
                  setCreateModalOpen(true);
                }}
              >
                + شراء جهاز من عميل / فرد
              </Button>
              <Button variant="secondary" onClick={() => void refetch()}>
                تحديث
              </Button>
            </div>
          }
        />

        {/* Trade-In KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الأجهزة المشتراة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{allTransactions.length}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عمليات استبدال Trade-In</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>{tradeInExchangeCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة مضافة للمخزون فوراً</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{autoInventoryCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي المنصرف للشراء</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {totalPurchaseSpend.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12.01" y2="8"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '12px' }}>
          <div style={{ width: '100%', maxWidth: '380px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث باسم البائع، الرقم القومي، الموديل، أو الـ IMEI..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setConditionFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: conditionFilter === 'all' ? '#0f172a' : '#e2e8f0',
                background: conditionFilter === 'all' ? '#0f172a' : '#fff',
                color: conditionFilter === 'all' ? '#fff' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              الكل ({allTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setConditionFilter('new_sealed')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: conditionFilter === 'new_sealed' ? '#16a34a' : '#e2e8f0',
                background: conditionFilter === 'new_sealed' ? '#dcfce7' : '#fff',
                color: conditionFilter === 'new_sealed' ? '#166534' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              جديد متبرشم
            </button>
            <button
              type="button"
              onClick={() => setConditionFilter('like_new')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: conditionFilter === 'like_new' ? '#2563eb' : '#e2e8f0',
                background: conditionFilter === 'like_new' ? '#dbeafe' : '#fff',
                color: conditionFilter === 'like_new' ? '#1e40af' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              كسر زيرو
            </button>
            <button
              type="button"
              onClick={() => setConditionFilter('used')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: conditionFilter === 'used' ? '#475569' : '#e2e8f0',
                background: conditionFilter === 'used' ? '#f1f5f9' : '#fff',
                color: conditionFilter === 'used' ? '#0f172a' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              مستعمل
            </button>
            <button
              type="button"
              onClick={() => setConditionFilter('for_parts')}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: conditionFilter === 'for_parts' ? '#dc2626' : '#e2e8f0',
                background: conditionFilter === 'for_parts' ? '#fee2e2' : '#fff',
                color: conditionFilter === 'for_parts' ? '#991b1b' : '#475569',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              قطع غيار
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px' }}>رقم الإيصال</th>
                <th style={{ padding: '10px 14px' }}>البائع / الرقم القومي</th>
                <th style={{ padding: '10px 14px' }}>الجهاز / الـ IMEI</th>
                <th style={{ padding: '10px 14px' }}>الحالة والملاحظات</th>
                <th style={{ padding: '10px 14px' }}>سعر الشراء</th>
                <th style={{ padding: '10px 14px' }}>العملية والتاريخ</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل سجلات شراء الأجهزة...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد عمليات مسجلة لهذا التصنيف.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                      {t.docNo}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <strong>{t.sellerName}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        الرقم القومي: <span dir="ltr">{t.sellerNationalId}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
                        {t.sellerPhone}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <strong>
                        {t.deviceBrand ? `${t.deviceBrand} ` : ''}
                        {t.deviceModel}
                      </strong>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0284c7', direction: 'ltr', textAlign: 'right' }}>
                        IMEI: {t.serialNumber}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', maxWidth: '240px' }}>
                      <div style={{ fontSize: '0.825rem', color: '#334155', lineHeight: 1.4 }}>
                        {t.deviceConditionNotes || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                      {t.agreedPurchasePrice.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: t.transactionType === 'exchange_trade_in' ? '#dbeafe' : '#f1f5f9',
                          color: t.transactionType === 'exchange_trade_in' ? '#1e40af' : '#475569',
                        }}
                      >
                        {t.transactionType === 'exchange_trade_in' ? 'استبدال Trade-In' : 'شراء كاش'}
              </span>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                        {new Date(t.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' } as any)}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <Button
                          variant="secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#16a34a' }}
                          title="إرسال إشعار واتساب للبائع"
                          onClick={() => sendWhatsAppTradeInNotice(t)}
                        >
                          واتساب 💬
                        </Button>
                        <Button
                          variant="secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          onClick={() => setDisclaimerTransaction(t)}
                        >
                          طباعة الإقرار
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* New Purchase Modal */}
        {createModalOpen && (
          <DialogShell
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            width="min(1040px, 96vw)"
            ariaLabel="شراء وتنازل جهاز"
          >
            <div style={{ padding: '22px 28px' }}>
              <form onSubmit={handleSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>تسجيل شراء وتنازل جهاز (من عميل / فرد)</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>توثيق بيانات البائع بالرقم القومي، تحديد حالة الجهاز، وإصدار إقرار إخلاء المسؤولية</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1rem', fontWeight: 700, transition: 'all 0.15s ease' }}
                    title="إغلاق"
                  >
                    ✕
                  </button>
                </div>

                {/* 2-Column Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {/* Right Column: Seller & Device Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Seller Details Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>
                        بيانات البائع (المقر بالملكية)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            اسم البائع بالكامل <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.sellerName}
                            onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                            placeholder="الاسم الرباعي للبائع"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الرقم القومي (14 رقم) <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            dir="ltr"
                            maxLength={14}
                            className="purchase-prototype-field-input"
                            value={formData.sellerNationalId}
                            onChange={(e) => setFormData({ ...formData, sellerNationalId: e.target.value })}
                            placeholder="29801010123456"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.9rem', textAlign: 'right', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            رقم الهاتف <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.sellerPhone}
                            onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                            placeholder="01012345678"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Device Specs Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                        بيانات ومواصفات الجهاز
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الماركة
                          </label>
                          <BrandCombobox
                            value={formData.deviceBrand || ''}
                            onChange={(val) => setFormData({ ...formData, deviceBrand: val })}
                            placeholder="...Apple, Samsung"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الموديل والذاكرة <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.deviceModel}
                            onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                            placeholder="iPhone 15 Pro 256GB"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            السيريال / IMEI 1 <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.serialNumber}
                            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                            placeholder="354892019283741"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.9rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            IMEI 2 (شريحة 2 - اختياري)
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.imei2 || ''}
                            onChange={(e) => setFormData({ ...formData, imei2: e.target.value })}
                            placeholder="اختياري..."
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.9rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Left Column: Condition & Pricing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Condition Selector & Notes Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        حالة الجهاز وملاحظات الفحص
                      </div>

                      {/* 4 State Buttons */}
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                          حالة الجهاز عند الشراء:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          {(['new_sealed', 'like_new', 'used', 'for_parts'] as const).map((st) => {
                            const isSelected = (formData.deviceConditionState || 'used') === st;
                            const meta = conditionLabels[st];
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFormData({ ...formData, deviceConditionState: st })}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: isSelected ? `2px solid ${meta.color}` : '1px solid #cbd5e1',
                                  background: isSelected ? meta.bg : '#fff',
                                  color: isSelected ? meta.color : '#334155',
                                  fontWeight: isSelected ? 800 : 600,
                                  fontSize: '0.825rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {isSelected ? '✓ ' : ''}
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          ملاحظات الفحص والملحقات (نسبة البطارية، الشاحن، الكرتونة):
                        </label>
                        <textarea
                          rows={2}
                          className="purchase-prototype-field-input"
                          value={formData.deviceConditionNotes || ''}
                          onChange={(e) => setFormData({ ...formData, deviceConditionNotes: e.target.value })}
                          placeholder="مثال: نسبة البطارية 92%، كرتونة أصلية، شاحن سريع..."
                          style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>

                    {/* Financials & Inventory Link Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12.01" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        الاتفاق المالي والمخزن
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            سعر الشراء المتفق عليه <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.agreedPurchasePrice || ''}
                            onChange={(e) => setFormData({ ...formData, agreedPurchasePrice: Number(e.target.value) })}
                            placeholder="0.00"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.95rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            نوع العملية
                          </label>
                          <select
                            className="purchase-prototype-field-input"
                            value={formData.transactionType}
                            onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          >
                            <option value="cash_purchase">شراء نقدي</option>
                            <option value="exchange_trade_in">استبدال Trade-In</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            طريقة السداد
                          </label>
                          <select
                            className="purchase-prototype-field-input"
                            value={formData.paymentMethod || 'cash'}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          >
                            <option value="cash">كاش الخزينة</option>
                            <option value="vodafone_cash">فودافون كاش</option>
                            <option value="instapay">إنستاباي / تحويل</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={formData.autoAddToInventory !== false}
                            onChange={(e) => setFormData({ ...formData, autoAddToInventory: e.target.checked })}
                            style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                              إدراج الجهاز تلقائياً في المخزن للبيع على الكاشير
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                              سيقوم النظام بإنشاء صنف باسم: <strong style={{ color: '#0284c7' }}>({formData.deviceBrand ? `${formData.deviceBrand} ` : ''}{formData.deviceModel || 'موديل الجهاز'} {getConditionSuffix(formData.deviceConditionState)})</strong> وربط الـ IMEI تلقائياً.
                            </div>
                          </div>
                        </label>

                        {formData.autoAddToInventory !== false && (
                          <div style={{ marginTop: '10px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                              سعر البيع المقترح للجمهور على الكاشير (اختياري):
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="purchase-prototype-field-input"
                              value={formData.resalePrice || ''}
                              onChange={(e) => setFormData({ ...formData, resalePrice: Number(e.target.value) })}
                              placeholder={formData.agreedPurchasePrice ? `مثال: ${(formData.agreedPurchasePrice * 1.15).toFixed(0)}` : '0.00'}
                              style={{ width: '100%', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ padding: '8px 24px', fontSize: '0.9rem' }}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" disabled={createMutation.isPending} style={{ padding: '8px 28px', fontWeight: 700, fontSize: '0.9rem' }}>
                    {createMutation.isPending ? 'جارٍ التسجيل...' : 'حفظ وتوثيق عقد التنازل'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogShell>
        )}

        {/* Disclaimer Modal */}
        <TradeInDisclaimerModal
          open={Boolean(disclaimerTransaction)}
          transaction={disclaimerTransaction}
          settings={settingsQuery.data}
          onClose={() => setDisclaimerTransaction(null)}
        />
      </main>
    </div>
  );
}
