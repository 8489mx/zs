import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { FeatureGate } from '@/shared/components/feature-gate';
import { tradeInApi, type UpsertTradeInPayload } from '../api/tradein.api';
import { TradeInDisclaimerModal } from '../components/TradeInDisclaimerModal';
import { BrandCombobox } from '@/shared/components/BrandCombobox';
import { getMaintenanceProfile } from '@/features/maintenance/constants/maintenance-profiles';
import type { TradeInTransaction } from '@/types/domain-models/tradein';

// Premium Minimal Vector SVG Icons (StrokeWidth 1.75)
const Icons = {
  Device: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  Exchange: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Box: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Coins: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="M16.7 13.8a4 4 0 0 0-4-4" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  WhatsApp: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Printer: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
};

const conditionLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
  new_sealed: { label: 'جديد متبرشم (Sealed)', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  like_new: { label: 'كسر زيرو (Like New)', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  used: { label: 'مستعمل (Used)', bg: '#f8fafc', color: '#334155', border: '#e2e8f0' },
  for_parts: { label: 'قطع غيار / تالف', bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
};

export function TradeInPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const maintenanceProfile = getMaintenanceProfile(settingsQuery.data?.maintenanceProfile);

  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new_sealed' | 'like_new' | 'used' | 'for_parts'>('all');
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [disclaimerTransaction, setDisclaimerTransaction] = useState<TradeInTransaction | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const { data, isLoading, refetch, isRefetching } = useQuery({
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

  const countForCondition = (cond: 'new_sealed' | 'like_new' | 'used' | 'for_parts') => {
    return allTransactions.filter((t) => {
      const notes = t.deviceConditionNotes || '';
      if (cond === 'new_sealed') return notes.includes('جديد متبرشم') || notes.includes('Sealed');
      if (cond === 'like_new') return notes.includes('كسر زيرو') || notes.includes('Like New');
      if (cond === 'used') return notes.includes('مستعمل') || (!notes.includes('جديد متبرشم') && !notes.includes('كسر زيرو') && !notes.includes('قطع غيار'));
      if (cond === 'for_parts') return notes.includes('قطع غيار') || notes.includes('تالف');
      return false;
    }).length;
  };

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

  const handleCopyText = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
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

    const message = `مرحباً أستاذ *${t.sellerName}*
معك *${storeName}* بخصوص عملية بيع / استبدال جهازك:
- *الموديل:* ${t.deviceBrand ? `${t.deviceBrand} ` : ''}${t.deviceModel}
- *${maintenanceProfile.serialLabel}:* ${t.serialNumber}
- *المبلغ المتفق عليه:* ${t.agreedPurchasePrice.toFixed(2)} ج.م
- *رقم الإقرار والتنازل:* ${t.docNo}
----------------------------------------
نشكرك لتعاملك معنا ونسعد دائماً بزيارتك!`;

    const url = `https://api.whatsapp.com/send/?phone=${phoneFormatted}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <FeatureGate feature="tradein" featureName="شراء واستبدال المستعمل">
      <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="شراء واستبدال الأجهزة (شراء من الأفراد)"
          description="تسجيل شراء أجهزة جديدة، كسر زيرو، مستعملة، أو قطع غيار من العملاء، إدراجها بالمخزن، وطباعة إقرار التنازل الأمني."
          badge={<span className="nav-pill" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>{totalItems} عملية شراء/استبدال</span>}
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Icons.Plus />
                <span>شراء جهاز من عميل / فرد</span>
              </Button>
              <Button variant="secondary" onClick={() => void refetch()} disabled={isRefetching} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icons.Refresh />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* Trade-In KPI Summary Cards - Calm Enterprise Dashboard Style */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الأجهزة المشتراة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{allTransactions.length}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.Device />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عمليات استبدال Trade-In</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{tradeInExchangeCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.Exchange />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة مضافة للمخزون</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{autoInventoryCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.Box />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي المنصرف للشراء</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {totalPurchaseSpend.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.Coins />
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Tabs - Segmented Style */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '12px', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {[
              { key: 'all', label: 'الكل', count: allTransactions.length },
              { key: 'new_sealed', label: 'جديد متبرشم', count: countForCondition('new_sealed') },
              { key: 'like_new', label: 'كسر زيرو', count: countForCondition('like_new') },
              { key: 'used', label: 'مستعمل', count: countForCondition('used') },
              { key: 'for_parts', label: 'قطع غيار', count: countForCondition('for_parts') },
            ].map((tab) => {
              const active = conditionFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setConditionFilter(tab.key as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    border: active ? '1px solid #cbd5e1' : '1px solid transparent',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: active ? '#0f172a' : '#e2e8f0',
                      color: active ? '#ffffff' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: '320px', flex: '1', maxWidth: '420px' }}>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Icons.Search />
            </span>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder={`بحث باسم البائع، الرقم القومي، الموديل، أو ${maintenanceProfile.serialLabel}...`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '7px 34px 7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px', width: '110px' }}>رقم الإيصال</th>
                  <th style={{ padding: '10px 14px', width: '190px' }}>البائع / الرقم القومي</th>
                  <th style={{ padding: '10px 14px', width: '200px' }}>الجهاز / {maintenanceProfile.serialLabel}</th>
                  <th style={{ padding: '10px 14px', minWidth: '160px' }}>الحالة والملاحظات</th>
                  <th style={{ padding: '10px 14px', width: '130px' }}>سعر الشراء</th>
                  <th style={{ padding: '10px 14px', width: '150px' }}>نوع العملية والتاريخ</th>
                  <th style={{ padding: '10px 14px', width: '170px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <Icons.Refresh />
                        <span>جاري تحميل سجلات شراء الأجهزة...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '44px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>لا توجد عمليات مسجلة</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>استخدم زر "شراء جهاز من عميل / فرد" لبدء تسجيل عملية شراء جديدة.</div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                      {/* Doc No */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setDisclaimerTransaction(t)}
                          title="عرض وطباعة إقرار التنازل"
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.825rem',
                            color: '#0f172a',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{t.docNo}</span>
                        </button>
                      </td>

                      {/* Seller */}
                      <td style={{ padding: '11px 14px' }}>
                        <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.85rem' }}>{t.sellerName}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          <span>ق:</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyText(t.sellerNationalId, e)}
                            title="اضغط لنسخ الرقم القومي"
                            style={{ background: 'transparent', border: 'none', padding: 0, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace' }}
                          >
                            <span dir="ltr">{t.sellerNationalId}</span>
                            {copiedId === t.sellerNationalId ? <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>✓</span> : <Icons.Copy />}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleCopyText(t.sellerPhone, e)}
                            title="اضغط لنسخ رقم الهاتف"
                            style={{ background: 'transparent', border: 'none', padding: 0, color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace' }}
                          >
                            <span dir="ltr">{t.sellerPhone}</span>
                            {copiedId === t.sellerPhone ? <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>✓</span> : <Icons.Copy />}
                          </button>
                        </div>
                      </td>

                      {/* Device */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '1px' }}>
                          {t.deviceBrand && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {t.deviceBrand}
                            </span>
                          )}
                          <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{t.deviceModel}</strong>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                          <span dir="ltr">{t.serialNumber}</span>
                        </div>
                      </td>

                      {/* Notes & Condition */}
                      <td style={{ padding: '11px 14px', maxWidth: '240px' }} title={t.deviceConditionNotes || ''}>
                        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.deviceConditionNotes || '—'}
                        </div>
                      </td>

                      {/* Purchase Price */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                          {t.agreedPurchasePrice.toFixed(2)} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                        </div>
                      </td>

                      {/* Transaction Type */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            background: t.transactionType === 'exchange_trade_in' ? '#f0f9ff' : '#f8fafc',
                            color: t.transactionType === 'exchange_trade_in' ? '#0369a1' : '#475569',
                            border: `1px solid ${t.transactionType === 'exchange_trade_in' ? '#bae6fd' : '#e2e8f0'}`,
                          }}
                        >
                          {t.transactionType === 'exchange_trade_in' ? 'استبدال Trade-In' : 'شراء كاش'}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          {new Date(t.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' } as any)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '11px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => sendWhatsAppTradeInNotice(t)}
                            title="إرسال إشعار وتوثيق للبائع عبر واتساب"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Icons.WhatsApp />
                            <span>واتساب</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDisclaimerTransaction(t)}
                            title="طباعة إقرار وتعهد التنازل الأمني"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Icons.Printer />
                            <span>الإقرار</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Purchase Modal */}
        {createModalOpen && (
          <DialogShell
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            width="min(1040px, 96vw)"
            ariaLabel="شراء وتنازل جهاز"
          >
            <div style={{ padding: '24px 28px' }}>
              <form onSubmit={handleSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                      <Icons.Exchange />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>تسجيل شراء وتنازل جهاز (من عميل / فرد)</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>توثيق بيانات البائع بالرقم القومي، تحديد حالة الجهاز، وإصدار إقرار إخلاء المسؤولية</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}
                    title="إغلاق"
                  >
                    ✕
                  </button>
                </div>

                {/* 2-Column Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {/* Right Column: Seller & Device Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Seller Details Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.User /></span>
                        <span>بيانات البائع (المقر بالملكية)</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          اسم البائع بالكامل <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="purchase-prototype-field-input"
                          value={formData.sellerName}
                          onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                          placeholder="الاسم الرباعي أو الثلاثي للبائع"
                          style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
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
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
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
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Device Specs Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.Device /></span>
                        <span>بيانات ومواصفات الجهاز</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الماركة
                          </label>
                          <BrandCombobox
                            value={formData.deviceBrand || ''}
                            onChange={(val) => setFormData({ ...formData, deviceBrand: val })}
                            categoryKey={maintenanceProfile.key}
                            sampleBrands={maintenanceProfile.sampleBrands}
                            placeholder={`...${maintenanceProfile.sampleBrands.slice(0, 3).join(', ')}`}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الموديل والمواصفات <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.deviceModel}
                            onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                            placeholder={maintenanceProfile.tradeInModelPlaceholder}
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            {maintenanceProfile.serialLabel} <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.serialNumber}
                            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                            placeholder={maintenanceProfile.serialPlaceholder}
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            {maintenanceProfile.secondarySerialLabel}
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.imei2 || ''}
                            onChange={(e) => setFormData({ ...formData, imei2: e.target.value })}
                            placeholder="اختياري..."
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Left Column: Condition & Pricing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Condition Selector & Notes Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.FileText /></span>
                        <span>حالة الجهاز وملاحظات الفحص</span>
                      </div>

                      {/* 4 State Buttons - Soft Pastel Badges */}
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
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
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: `1px solid ${isSelected ? meta.border : '#cbd5e1'}`,
                                  background: isSelected ? meta.bg : '#ffffff',
                                  color: isSelected ? meta.color : '#334155',
                                  fontWeight: isSelected ? 800 : 500,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
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
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          {maintenanceProfile.tradeInNotesLabel}
                        </label>
                        <textarea
                          rows={2}
                          className="purchase-prototype-field-input"
                          value={formData.deviceConditionNotes || ''}
                          onChange={(e) => setFormData({ ...formData, deviceConditionNotes: e.target.value })}
                          placeholder={maintenanceProfile.tradeInNotesPlaceholder}
                          style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', boxSizing: 'border-box', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Financials & Inventory Link Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.Coins /></span>
                        <span>الاتفاق المالي والمخزن</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
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
                            style={{ width: '100%', height: '36px', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            نوع العملية
                          </label>
                          <select
                            className="purchase-prototype-field-input"
                            value={formData.transactionType}
                            onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                            style={{ width: '100%', height: '36px', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            <option value="cash_purchase">شراء نقدي</option>
                            <option value="exchange_trade_in">استبدال Trade-In</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            طريقة السداد
                          </label>
                          <select
                            className="purchase-prototype-field-input"
                            value={formData.paymentMethod || 'cash'}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                            style={{ width: '100%', height: '36px', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            <option value="cash">كاش الخزينة</option>
                            <option value="vodafone_cash">فودافون كاش</option>
                            <option value="instapay">إنستاباي / تحويل</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={formData.autoAddToInventory !== false}
                            onChange={(e) => setFormData({ ...formData, autoAddToInventory: e.target.checked })}
                            style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                              إدراج الجهاز تلقائياً في المخزن للبيع على الكاشير
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              سيقوم النظام بإنشاء صنف باسم: <strong style={{ color: '#0f172a' }}>({formData.deviceBrand ? `${formData.deviceBrand} ` : ''}{formData.deviceModel || 'موديل الجهاز'} {getConditionSuffix(formData.deviceConditionState)})</strong> وربط السيريال تلقائياً.
                            </div>
                          </div>
                        </label>

                        {formData.autoAddToInventory !== false && (
                          <div style={{ marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
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
                              style={{ width: '100%', background: '#f8fafc', padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ padding: '7px 20px', fontSize: '0.85rem' }}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" disabled={createMutation.isPending} style={{ padding: '7px 24px', fontWeight: 700, fontSize: '0.85rem' }}>
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
    </FeatureGate>
  );
}
