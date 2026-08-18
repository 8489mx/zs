import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { productSerialsApi, type ProductSerialItem } from '../api/product-serials.api';
import { maintenanceApi, type MaintenanceListPageResponse } from '@/features/maintenance/api/maintenance.api';
import { tradeInApi, type TradeInListPageResponse } from '@/features/tradein/api/tradein.api';
import type { MaintenanceTicket } from '@/types/domain-models/maintenance';
import type { TradeInTransaction } from '@/types/domain-models/tradein';

export function ImeiHistoryPage() {
  const [searchInput, setSearchInput] = useState('');
  const [activeSerial, setActiveSerial] = useState('');

  useAppToolbar([{ label: 'سجل وتتبع الأجهزة والـ IMEI' }]);

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
    setActiveSerial(q);
  };

  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    in_stock: { label: '🟢 متاح بالمخزن', bg: '#dcfce7', color: '#166534' },
    sold: { label: '🔵 تم البيع للعميل', bg: '#dbeafe', color: '#1e40af' },
    returned: { label: '🟠 مرتجع', bg: '#ffedd5', color: '#9a3412' },
    under_repair: { label: '⚙️ قيد الصيانة', bg: '#fef3c7', color: '#92400e' },
    defective: { label: '🔴 معيب / تالف', bg: '#fee2e2', color: '#991b1b' },
  };

  const tickets: MaintenanceTicket[] = maintenanceData?.tickets || [];
  const tradeins: TradeInTransaction[] = tradeinData?.transactions || [];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1100px', margin: '0 auto' }}>
        <PageHeader
          title="🔍 سجل وتتبع دورة حياة الجهاز (IMEI Lifecycle Audit)"
          description="استعلام شامل عن أي سيريال أو IMEI: تاريخ الشراء، فواتير البيع والعميل، الضمان، سجل الصيانة، وتجارة المستعمل."
        />

        {/* Big Search Bar */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              dir="ltr"
              autoFocus
              className="purchase-prototype-field-input"
              placeholder="امسح الباركود بالسكانر أو اكتب رقم الـ IMEI / السيريال..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ flex: 1, fontSize: '1.1rem', padding: '12px 16px', fontFamily: 'monospace' }}
            />
            <Button type="submit" variant="primary" style={{ padding: '0 28px', fontSize: '1rem' }}>
              بحث وفحص الجهاز
            </Button>
          </form>
        </div>

        {/* Results Area */}
        {activeSerial && (
          <div className="page-stack" style={{ gap: '20px', marginTop: '16px' }}>
            {/* 1. Device Overview Card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>بيانات الجهاز والصنف:</div>
                  <h3 style={{ margin: '4px 0', fontSize: '1.3rem', fontWeight: 800 }}>
                    {serialItem?.productName || 'جهاز غير مسجل كصنف مباشر'}
                  </h3>
                  <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#475569', direction: 'ltr', textAlign: 'right' }}>
                    IMEI: <strong>{activeSerial}</strong>
                    {serialItem?.imei2 ? <span style={{ marginInlineStart: '16px', color: '#64748b' }}>IMEI 2: {serialItem.imei2}</span> : null}
                  </div>
                </div>

                {serialItem && (
                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      background: statusMap[serialItem.status]?.bg || '#f1f5f9',
                      color: statusMap[serialItem.status]?.color || '#334155',
                    }}
                  >
                    {statusMap[serialItem.status]?.label || serialItem.status}
                  </span>
                )}
              </div>

              {/* Specs & History Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.9rem' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>🏢 الموقع الحالي / الفرع:</div>
                  <strong>{serialItem?.locationName || serialItem?.branchName || 'غير محدد'}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>📦 فاتورة وتاريخ الشراء:</div>
                  <strong>{serialItem?.purchaseDocNo || '—'}</strong>
                  {serialItem?.supplierName && <div style={{ color: '#475569', fontSize: '0.8rem' }}>المورد: {serialItem.supplierName}</div>}
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>🛒 فاتورة وتاريخ البيع:</div>
                  <strong>{serialItem?.saleDocNo || 'لم يتم بيعه بعد'}</strong>
                  {serialItem?.customerName && (
                    <div style={{ color: '#475569', fontSize: '0.8rem' }}>
                      العميل: {serialItem.customerName} {serialItem.customerPhone ? `(${serialItem.customerPhone})` : ''}
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>🛡️ موقف الضمان:</div>
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
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700 }}>
                🛠️ سجل عمليات الصيانة لهذا الجهاز ({tickets.length})
              </h4>
              {tickets.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>لا توجد سجلات صيانة مسجلة لهذا الجهاز.</div>
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
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{t.ticketNo}</td>
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
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700 }}>
                🔄 سجلات الشراء المستعمل وعقود التنازل ({tradeins.length})
              </h4>
              {tradeins.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>لا توجد عمليات شراء مستعمل مسجلة لهذا السيريال.</div>
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
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{tr.docNo}</td>
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
        )}
      </main>
    </div>
  );
}
