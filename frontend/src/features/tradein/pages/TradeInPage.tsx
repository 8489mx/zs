import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { FeatureGate } from '@/shared/components/feature-gate';
import { tradeInApi, type UpsertTradeInPayload } from '../api/tradein.api';
import { TradeInDisclaimerModal } from '../components/TradeInDisclaimerModal';
import { getMaintenanceProfile } from '@/features/maintenance/constants/maintenance-profiles';
import type { TradeInTransaction } from '@/types/domain-models/tradein';
import { TradeInIcons } from '../components/TradeInIcons';
import { TradeInStatsCards } from '../components/TradeInStatsCards';
import { TradeInTable } from '../components/TradeInTable';
import { CreateTradeInModal } from '../components/CreateTradeInModal';

export function TradeInPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const maintenanceProfile = getMaintenanceProfile(settingsQuery.data?.maintenanceProfile);

  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new_sealed' | 'like_new' | 'used' | 'for_parts'>('all');
  const [page, _setPage] = useState(1);
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

  const transactions = allTransactions.filter((t) => {
    if (conditionFilter === 'all') return true;
    const notes = t.deviceConditionNotes || '';
    if (conditionFilter === 'new_sealed') return notes.includes('جديد متبرشم') || notes.includes('Sealed');
    if (conditionFilter === 'like_new') return notes.includes('كسر زيرو') || notes.includes('Like New');
    if (conditionFilter === 'used') return notes.includes('مستعمل') || (!notes.includes('جديد متبرشم') && !notes.includes('كسر زيرو') && !notes.includes('قطع غيار'));
    if (conditionFilter === 'for_parts') return notes.includes('قطع غيار') || notes.includes('تالف');
    return true;
  });

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
                  style={{ background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <TradeInIcons.Plus />
                  <span>تسجيل شراء جهاز</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <TradeInIcons.Refresh />
                  <span>تحديث</span>
                </Button>
              </div>
            }
          />

          {/* KPI Stats Cards */}
          <TradeInStatsCards
            totalItems={totalItems}
            tradeInExchangeCount={tradeInExchangeCount}
            autoInventoryCount={autoInventoryCount}
            totalPurchaseSpend={totalPurchaseSpend}
          />

          {/* Filter Toolbar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <span style={{ position: 'absolute', right: '10px', top: '9px', color: '#94a3b8' }}>
                <TradeInIcons.Search />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم العميل، الهاتف، الرقم القومي، الموديل، أو السيريال..."
                style={{ width: '100%', paddingRight: '32px', paddingLeft: '10px', paddingTop: '7px', paddingBottom: '7px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {(['all', 'new_sealed', 'like_new', 'used', 'for_parts'] as const).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setConditionFilter(cond)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: conditionFilter === cond ? '#ffffff' : 'transparent',
                    color: conditionFilter === cond ? '#170e5e' : '#64748b',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: conditionFilter === cond ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {cond === 'all' ? 'الكل' : cond === 'new_sealed' ? 'متبرشم' : cond === 'like_new' ? 'كسر زيرو' : cond === 'used' ? 'مستعمل' : 'قطع غيار'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <TradeInTable
            transactions={transactions}
            isLoading={isLoading}
            serialLabel={maintenanceProfile.serialLabel}
            copiedId={copiedId}
            onCopyText={handleCopyText}
            onOpenDisclaimer={(t) => setDisclaimerTransaction(t)}
            onSendWhatsApp={sendWhatsAppTradeInNotice}
          />
        </main>

        {/* Create Modal */}
        <CreateTradeInModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          serialLabel={maintenanceProfile.serialLabel}
        />

        {/* Disclaimer Print Modal */}
        {disclaimerTransaction && (
          <TradeInDisclaimerModal
            open={Boolean(disclaimerTransaction)}
            transaction={disclaimerTransaction}
            onClose={() => setDisclaimerTransaction(null)}
          />
        )}
      </div>
    </FeatureGate>
  );
}
