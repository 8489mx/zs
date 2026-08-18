import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useSettingsQuery, useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { tradeInApi, type UpsertTradeInPayload } from '../api/tradein.api';
import { TradeInDisclaimerModal } from '../components/TradeInDisclaimerModal';
import type { TradeInTransaction } from '@/types/domain-models/tradein';

export function TradeInPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const productsQuery = useProductsQuery();

  const [searchQuery, setSearchQuery] = useState('');
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
    deviceConditionNotes: '',
    agreedPurchasePrice: 0,
    transactionType: 'cash_purchase',
    paymentMethod: 'cash',
    notes: '',
  });

  useAppToolbar([{ label: 'شراء واستبدال الأجهزة المستعملة' }]);

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

  const transactions = data?.transactions || [];
  const totalItems = data?.pagination.totalItems || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sellerName.trim() || !formData.sellerNationalId.trim() || !formData.deviceModel.trim() || !formData.serialNumber.trim()) {
      alert('يرجى ملء كافة الحقول الإلزامية: اسم البائع، الرقم القومي، موديل الجهاز، ورقم السيريال / الـ IMEI');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="🔄 شراء واستبدال الأجهزة المستعملة (Trade-In)"
          description="تسجيل مشتريات واستبدال الأجهزة المستعملة، إقرارات التنازل والتوثيق الأمني بالرقم القومي، وإدراج الأجهزة بالمخزن تلقائياً."
          badge={<span className="nav-pill">{totalItems} عملية شراء مستعمل</span>}
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
                    deviceConditionNotes: '',
                    agreedPurchasePrice: 0,
                    transactionType: 'cash_purchase',
                    paymentMethod: 'cash',
                    notes: '',
                  });
                  setCreateModalOpen(true);
                }}
              >
                + شراء جهاز مستعمل جديد
              </Button>
              <Button variant="secondary" onClick={() => void refetch()}>
                تحديث
              </Button>
            </div>
          }
        />

        {/* Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث بالرقم القومي، البائع، الهاتف، أو IMEI..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 12px' }}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px' }}>رقم الإيصال</th>
                <th style={{ padding: '10px 14px' }}>البائع / الرقم القومي</th>
                <th style={{ padding: '10px 14px' }}>الجهاز / الـ IMEI</th>
                <th style={{ padding: '10px 14px' }}>سعر الشراء</th>
                <th style={{ padding: '10px 14px' }}>نوع العملية</th>
                <th style={{ padding: '10px 14px' }}>التاريخ</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل سجلات شراء الأجهزة المستعملة...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد عمليات شراء مستعمل مسجلة حتى الآن.
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
                      <strong>{t.deviceBrand ? `${t.deviceBrand} ` : ''}{t.deviceModel}</strong>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#7e22ce', direction: 'ltr', textAlign: 'right' }}>
                        IMEI: {t.serialNumber}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#166534' }}>
                      {t.agreedPurchasePrice.toFixed(2)} ج.م
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: t.transactionType === 'exchange_trade_in' ? '#eff6ff' : '#f0fdf4',
                          color: t.transactionType === 'exchange_trade_in' ? '#1e40af' : '#15803d',
                        }}
                      >
                        {t.transactionType === 'exchange_trade_in' ? '🔄 استبدال بجهاز جديد' : '💵 شراء نقدي مباشر'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(t.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        onClick={() => setDisclaimerTransaction(t)}
                      >
                        📄 عقد التنازل
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* New Purchase Modal */}
        {createModalOpen && (
          <DialogShell open={createModalOpen} onClose={() => setCreateModalOpen(false)} ariaLabel="شراء جهاز مستعمل">
            <form onSubmit={handleSubmit} className="page-stack" dir="rtl" style={{ gap: '14px', maxWidth: '580px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>🔄 شراء / استبدال جهاز مستعمل</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>اسم البائع (العميل) *</label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    placeholder="الاسم الرباعي للبائع"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>الرقم القومي (14 رقم) *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    className="purchase-prototype-field-input"
                    value={formData.sellerNationalId}
                    onChange={(e) => setFormData({ ...formData, sellerNationalId: e.target.value })}
                    placeholder="29801010123456"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    className="purchase-prototype-field-input"
                    value={formData.sellerPhone}
                    onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                    placeholder="01012345678"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>الماركة (Brand)</label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={formData.deviceBrand || ''}
                    onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                    placeholder="Apple, Samsung, Xiaomi"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>موديل الجهاز *</label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={formData.deviceModel}
                    onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                    placeholder="iPhone 12 Pro 128GB"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>رقم السيريال / IMEI *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    className="purchase-prototype-field-input"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="354892019283741"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>سعر الشراء المتفق عليه (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="purchase-prototype-field-input"
                    value={formData.agreedPurchasePrice}
                    onChange={(e) => setFormData({ ...formData, agreedPurchasePrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>نوع العملية</label>
                  <select
                    className="purchase-prototype-field-input"
                    value={formData.transactionType}
                    onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                  >
                    <option value="cash_purchase">شراء نقدي مباشر</option>
                    <option value="exchange_trade_in">استبدال بجهاز جديد (Trade-In)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>ملاحظات وحالة الجهاز (شاشة، بطارية، كرتونة)</label>
                <textarea
                  rows={2}
                  className="purchase-prototype-field-input"
                  value={formData.deviceConditionNotes || ''}
                  onChange={(e) => setFormData({ ...formData, deviceConditionNotes: e.target.value })}
                  placeholder="مثال: نسبة البطارية 84%، مع العلبة الأصلية والشاحن، بدون صيانة سابقة..."
                />
              </div>

              {/* Link to Inventory Product Option */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  ربط وإدراج في المخزن تلقائياً كصنف مستعمل:
                </label>
                <select
                  className="purchase-prototype-field-input"
                  value={formData.createdProductId || ''}
                  onChange={(e) => setFormData({ ...formData, createdProductId: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">-- بدون ربط مخزني مباشر --</option>
                  {(productsQuery.data || []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.barcode || `PRD-${p.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'جارٍ التسجيل...' : 'حفظ واستخراج عقد التنازل'}
                </Button>
              </div>
            </form>
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
