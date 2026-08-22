import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { getMaintenanceProfile } from '@/features/maintenance/constants/maintenance-profiles';
import { productSerialsApi, type ProductSerialItem } from '../api/product-serials.api';
import { maintenanceApi, type MaintenanceListPageResponse } from '@/features/maintenance/api/maintenance.api';
import { tradeInApi, type TradeInListPageResponse } from '@/features/tradein/api/tradein.api';
import type { MaintenanceTicket } from '@/types/domain-models/maintenance';
import type { TradeInTransaction } from '@/types/domain-models/tradein';

export function ImeiHistoryPage() {
  const settingsQuery = useSettingsQuery();
  const profile = getMaintenanceProfile(settingsQuery.data?.maintenanceProfile);

  const [searchInput, setSearchInput] = useState('');
  const [activeSerial, setActiveSerial] = useState('');
  const [recentLookups, setRecentLookups] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('zm_recent_imei_lookups');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useAppToolbar([{ label: `سجل وتتبع ${profile.shortTitle} والسيريالات` }]);

  const { data: serialItem } = useQuery<ProductSerialItem | null>({
    queryKey: ['imei-history-serial', activeSerial],
    queryFn: () => (activeSerial ? productSerialsApi.lookup(activeSerial) : Promise.resolve(null)),
    enabled: Boolean(activeSerial),
  });

  const { data: maintenanceData } = useQuery<MaintenanceListPageResponse>({
    queryKey: ['imei-history-maintenance', activeSerial],
    queryFn: () =>
      activeSerial
        ? maintenanceApi.list({ q: activeSerial })
        : Promise.resolve({ tickets: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }),
    enabled: Boolean(activeSerial),
  });

  const { data: tradeinData } = useQuery<TradeInListPageResponse>({
    queryKey: ['imei-history-tradein', activeSerial],
    queryFn: () =>
      activeSerial
        ? tradeInApi.list({ q: activeSerial })
        : Promise.resolve({ transactions: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }),
    enabled: Boolean(activeSerial),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    performLookup(q);
  };

  const performLookup = (serial: string) => {
    setActiveSerial(serial);
    setSearchInput(serial);
    setRecentLookups((prev) => {
      const updated = [serial, ...prev.filter((s) => s !== serial)].slice(0, 6);
      try {
        localStorage.setItem('zm_recent_imei_lookups', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    in_stock: { label: 'متاح بالمخزن', bg: '#dcfce7', color: '#166534' },
    sold: { label: 'تم البيع للعميل', bg: '#dbeafe', color: '#1e40af' },
    returned: { label: 'مرتجع', bg: '#ffedd5', color: '#9a3412' },
    under_repair: { label: 'قيد الصيانة', bg: '#fef3c7', color: '#92400e' },
    defective: { label: 'معيب / تالف', bg: '#fee2e2', color: '#991b1b' },
  };

  const tickets: MaintenanceTicket[] = maintenanceData?.tickets || [];
  const tradeins: TradeInTransaction[] = tradeinData?.transactions || [];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1100px', margin: '0 auto' }}>
        <PageHeader
          title={`سجل وتتبع دورة حياة الأجهزة والسيريالات (${profile.serialLabel})`}
          description="استعلام شامل وفحص أمني عن أي سيريال أو باركود: تاريخ الشراء، فواتير البيع والعميل، الضمان، سجل الصيانة، وتجارة المستعمل."
        />

        {/* Big Search Bar */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              dir="ltr"
              autoFocus
              className="purchase-prototype-field-input"
              placeholder={`امسح الباركود بالسكانر أو اكتب ${profile.serialLabel}...`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ flex: 1, fontSize: '1rem', padding: '10px 14px', fontFamily: 'monospace' }}
            />
            <Button type="submit" variant="primary" style={{ padding: '0 24px', fontSize: '0.95rem' }}>
              بحث وفحص الجهاز
            </Button>
          </form>

          {/* Recent Lookups Quick Tags */}
          {recentLookups.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>عمليات بحث حديثة:</span>
              {recentLookups.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => performLookup(s)}
                  style={{
                    background: activeSerial === s ? '#eff6ff' : '#f8fafc',
                    border: '1px solid',
                    borderColor: activeSerial === s ? '#93c5fd' : '#cbd5e1',
                    color: activeSerial === s ? '#1e40af' : '#475569',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Area */}
        {activeSerial ? (
          <div className="page-stack" style={{ gap: '16px', marginTop: '16px' }}>
            {/* 1. Device Overview Card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>بيانات الجهاز والصنف:</div>
                  <h3 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 800 }}>
                    {serialItem?.productName || (tradeins[0] ? `${tradeins[0].deviceBrand ? `${tradeins[0].deviceBrand} ` : ''}${tradeins[0].deviceModel}` : (tickets[0] ? `${tickets[0].deviceBrand ? `${tickets[0].deviceBrand} ` : ''}${tickets[0].deviceModel}` : 'جهاز غير مسجل كصنف مباشر'))}
                  </h3>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: '#475569', direction: 'ltr', textAlign: 'right' }}>
                    IMEI: <strong>{activeSerial}</strong>
                    {serialItem?.imei2 ? <span style={{ marginInlineStart: '16px', color: '#64748b' }}>IMEI 2: {serialItem.imei2}</span> : null}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button variant="secondary" onClick={() => window.print()} style={{ fontSize: '0.825rem' }}>
                    طباعة تقرير الفحص
                  </Button>
                  {serialItem && (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: statusMap[serialItem.status]?.bg || '#f1f5f9',
                        color: statusMap[serialItem.status]?.color || '#334155',
                      }}
                    >
                      {statusMap[serialItem.status]?.label || serialItem.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Specs & History Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.875rem' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    الموقع الحالي / الفرع:
                  </div>
                  <strong>{serialItem?.locationName || serialItem?.branchName || 'متاح بالسجل العام'}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    فاتورة وتاريخ الشراء:
                  </div>
                  <strong>{serialItem?.purchaseDocNo || (tradeins[0] ? `إقرار شراء ${tradeins[0].docNo}` : '—')}</strong>
                  {serialItem?.supplierName && <div style={{ color: '#475569', fontSize: '0.78rem' }}>المورد: {serialItem.supplierName}</div>}
                  {!serialItem?.supplierName && tradeins[0] && <div style={{ color: '#475569', fontSize: '0.78rem' }}>البائع: {tradeins[0].sellerName}</div>}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    فاتورة وتاريخ البيع:
                  </div>
                  <strong>{serialItem?.saleDocNo || 'لم يتم بيعه بعد'}</strong>
                  {serialItem?.customerName && (
                    <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                      العميل: {serialItem.customerName} {serialItem.customerPhone ? `(${serialItem.customerPhone})` : ''}
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    موقف الضمان:
                  </div>
                  {serialItem?.warrantyEndDate ? (
                    <strong style={{ color: new Date(serialItem.warrantyEndDate) >= new Date() ? '#16a34a' : '#dc2626' }}>
                      {new Date(serialItem.warrantyEndDate) >= new Date() ? 'ساري حتى: ' : 'منتهي في: '}
                      {new Date(serialItem.warrantyEndDate).toLocaleDateString('ar-EG')}
                    </strong>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>

            {/* 2. Maintenance History */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                سجل عمليات الصيانة لهذا الجهاز ({tickets.length})
              </h4>
              {tickets.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>لا توجد سجلات صيانة مسجلة لهذا الجهاز.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <th style={{ padding: '8px 12px' }}>رقم التذكرة</th>
                      <th style={{ padding: '8px 12px' }}>العميل</th>
                      <th style={{ padding: '8px 12px' }}>العطل</th>
                      <th style={{ padding: '8px 12px' }}>الحالة</th>
                      <th style={{ padding: '8px 12px' }}>التكلفة</th>
                      <th style={{ padding: '8px 12px' }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t: MaintenanceTicket) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#0284c7' }}>{t.ticketNo}</td>
                        <td style={{ padding: '8px 12px' }}>{t.customerName}</td>
                        <td style={{ padding: '8px 12px' }}>{t.problemDescription}</td>
                        <td style={{ padding: '8px 12px' }}>{t.status}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{(t.finalCost || t.expectedCost).toFixed(2)} ج.م</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{new Date(t.receivedAt).toLocaleDateString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 3. Trade-In History */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                سجلات الشراء المستعمل وعقود التنازل ({tradeins.length})
              </h4>
              {tradeins.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>لا توجد عمليات شراء مستعمل مسجلة لهذا السيريال.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <th style={{ padding: '8px 12px' }}>رقم الإيصال</th>
                      <th style={{ padding: '8px 12px' }}>البائع</th>
                      <th style={{ padding: '8px 12px' }}>الرقم القومي</th>
                      <th style={{ padding: '8px 12px' }}>سعر الشراء</th>
                      <th style={{ padding: '8px 12px' }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeins.map((tr: TradeInTransaction) => (
                      <tr key={tr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace' }}>{tr.docNo}</td>
                        <td style={{ padding: '8px 12px' }}>{tr.sellerName}</td>
                        <td style={{ padding: '8px 12px' }} dir="ltr">{tr.sellerNationalId}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#166534' }}>{tr.agreedPurchasePrice.toFixed(2)} ج.م</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{new Date(tr.createdAt).toLocaleDateString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Explanatory Empty State Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '12px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>1. تتبع المخزون وفواتير البيع</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                معرفة فاتورة شراء الجهاز من المورد، تاريخ البيع للعميل، الفرع الحالي، وفترة سريان الضمان الفعلي.
              </p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '12px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>2. أرشيف الصيانة والإصلاح</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                سجل تذاكر الصيانة السابقة للجهاز، الأعطال المشتكى منها، وقطع الغيار المستبدلة وتواريخ استلامه.
              </p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '12px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>3. تجارة المستعمل وعقود التنازل</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                سجل شراء الجهاز كمستعمل (Trade-In)، بيانات البائع الأصلي ورقمه القومي، وعقد التنازل الأمني.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
