import { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type VanTripSummary, type TripAdminDetails } from '../api/van-sales.api';

export function VanTripsTab() {
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const {
    data: trips = [],
    isLoading: isTripsLoading,
    refetch: refetchTrips,
  } = useQuery<VanTripSummary[]>({
    queryKey: ['van-sales-admin-trips', tripStatusFilter],
    queryFn: () => vanSalesApi.listAdminTrips({ status: tripStatusFilter || undefined }),
    refetchInterval: 25000,
  });

  // Query for trip details when a trip is selected
  const { data: tripDetails, isLoading: isDetailsLoading } = useQuery<TripAdminDetails>({
    queryKey: ['van-trip-admin-details', selectedTripId],
    queryFn: () => vanSalesApi.getTripDetails(selectedTripId!),
    enabled: Boolean(selectedTripId),
  });

  const totalLoaded = trips.reduce((sum, t) => sum + t.loadedAmount, 0);
  const totalSales = trips.reduce((sum, t) => sum + t.salesAmount, 0);
  const totalCash = trips.reduce((sum, t) => sum + t.cashCollected, 0);
  const activeTripsCount = trips.filter((t) => t.status === 'open').length;

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block' }}>إجمالي مبيعات سيارات الفان</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '4px' }}>
            {totalSales.toFixed(2)} <span style={{ fontSize: '13px', color: '#94a3b8' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>إجمالي النقدية المحصلة (كاش)</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {totalCash.toFixed(2)} <span style={{ fontSize: '13px', color: '#86efac' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', display: 'block' }}>إجمالي البضاعة المشحونة بالفان</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', display: 'block', marginTop: '4px' }}>
            {totalLoaded.toFixed(2)} <span style={{ fontSize: '13px', color: '#a5b4fc' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', display: 'block' }}>السيارات في خط السير الآن</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', display: 'block', marginTop: '4px' }}>
            {activeTripsCount} <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>رحلات مفتوحة</span>
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>تصفية حسب الحالة:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'كافة الرحلات', value: '' },
              { label: 'مفتوحة بالشارع', value: 'open' },
              { label: 'تمت التصفية والإغلاق', value: 'settled' },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTripStatusFilter(f.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: tripStatusFilter === f.value ? '#170e5e' : '#f1f5f9',
                  color: tripStatusFilter === f.value ? '#ffffff' : '#475569',
                  transition: 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            إجمالي السجلات: {trips.length}
          </span>
          <Button
            variant="secondary"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => refetchTrips()}
          >
            <RefreshCwIcon size={13} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Trips Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isTripsLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
            جاري تحميل رحلات التوزيع...
          </div>
        ) : trips.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            لا توجد رحلات توزيع مسجلة مطابقة للفلاتر.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}># الرحلة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المندوب والمركبة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>الوردية والعداد</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المستودع المصدر</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>البضاعة المحمّلة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>المبيعات</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الكاش المحصل</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>عجز / زيادة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>تاريخ الفتح والإغلاق</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                    #{t.id}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{t.repName}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                      {t.vehiclePlate ? (
                        <span style={{ fontSize: '10.5px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          لوحة: {t.vehiclePlate}
                        </span>
                      ) : null}
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{t.vanLocationName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{t.shiftName || 'وردية أساسية'}</div>
                    {t.startOdometer !== undefined && (
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace' }}>
                        عداد: {t.startOdometer} كم {t.endOdometer ? `← ${t.endOdometer} كم` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                    {t.sourceWarehouseName}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: t.status === 'open' ? '#dcfce7' : '#f1f5f9',
                        color: t.status === 'open' ? '#15803d' : '#475569',
                        border: `1px solid ${t.status === 'open' ? '#bbf7d0' : '#e2e8f0'}`,
                      }}
                    >
                      {t.status === 'open' ? 'نشطة بالشارع' : 'تمت التصفية'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                    {t.loadedAmount.toFixed(2)} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                    {t.salesAmount.toFixed(2)} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                    {t.cashCollected.toFixed(2)} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                    {t.variance === 0 ? (
                      <span style={{ color: '#94a3b8' }}>0.00</span>
                    ) : t.variance < 0 ? (
                      <span style={{ color: '#dc2626' }}>{t.variance.toFixed(2)}</span>
                    ) : (
                      <span style={{ color: '#2563eb' }}>+{t.variance.toFixed(2)}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '11px', color: '#64748b' }}>
                    <div>بدء: {new Date(t.openedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                    {t.closedAt && (
                      <div style={{ color: '#94a3b8' }}>
                        إغلاق: {new Date(t.closedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <Button
                      variant="secondary"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => setSelectedTripId(t.id)}
                    >
                      تفاصيل ومواقع الرحلة ↗
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Trip Details & GPS Locations Dialog */}
      {selectedTripId && (
        <StandardDialog
          open={Boolean(selectedTripId)}
          onClose={() => setSelectedTripId(null)}
          title={`سجل عمليات ومواقع رحلة التوزيع #${selectedTripId}`}
          subtitle={
            tripDetails?.trip
              ? `المندوب: ${tripDetails.trip.repName} • المركبة: ${tripDetails.trip.vehiclePlate || 'بدون لوحة'} • المستودع: ${tripDetails.trip.sourceWarehouseName}`
              : 'جاري تحميل تفاصيل الرحلة...'
          }
          maxWidth="920px"
        >
          {isDetailsLoading || !tripDetails ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }} dir="rtl">
              جاري تحميل سجل العمليات والمواقع الجغرافية...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
              {/* Financial KPI Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>البضاعة المحملة</span>
                  <strong style={{ fontSize: '14px', color: '#1e293b' }}>{tripDetails.trip.loadedAmount.toFixed(2)} <CurrencySymbol /></strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المبيعات الميدانية</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{tripDetails.trip.salesAmount.toFixed(2)} <CurrencySymbol /></strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>الكاش المحصل</span>
                  <strong style={{ fontSize: '14px', color: '#15803d' }}>{tripDetails.trip.cashCollected.toFixed(2)} <CurrencySymbol /></strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>إجمالي المرتجعات</span>
                  <strong style={{ fontSize: '14px', color: '#b91c1c' }}>{tripDetails.trip.returnsAmount.toFixed(2)} <CurrencySymbol /></strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>عجز / زيادة الوردية</span>
                  <strong style={{ fontSize: '14px', color: tripDetails.trip.variance < 0 ? '#dc2626' : '#16a34a' }}>
                    {tripDetails.trip.variance.toFixed(2)} <CurrencySymbol />
                  </strong>
                </div>
              </div>

              {/* Section 1: Sales Invoices with GPS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    فواتير المبيعات الميدانية ({tripDetails.sales.length} فاتورة)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    موضحاً إحداثيات GPS لموقع البيع والتسليم
                  </span>
                </div>
                {tripDetails.sales.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لم يتم تسجيل فواتير مبيعات ميدانية في هذه الرحلة.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>رقم الفاتورة</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>العميل</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>طريقة الدفع</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>القيمة</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>الوقت</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>موقع GPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripDetails.sales.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{s.docNo}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.customerName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: s.paymentMethod === 'cash' ? '#dcfce7' : '#eff6ff', color: s.paymentMethod === 'cash' ? '#15803d' : '#1d4ed8', fontWeight: 700 }}>
                              {s.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>
                            {s.total.toFixed(2)} <CurrencySymbol />
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b' }}>
                            {new Date(s.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {s.deliveryGpsLat && s.deliveryGpsLng ? (
                              <button
                                type="button"
                                onClick={() => openGoogleMaps(s.deliveryGpsLat!, s.deliveryGpsLng!)}
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                خريطة الموقع ({s.deliveryGpsLat.toFixed(4)}, {s.deliveryGpsLng.toFixed(4)}) ↗
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>بدون GPS</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Section 2: Collections with GPS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    سندات التحصيل النقدية ({tripDetails.collections.length} سند)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    موضحاً إحداثيات GPS لموقع الاستلام
                  </span>
                </div>
                {tripDetails.collections.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لم يتم تسجيل سندات تحصيل نقدية في هذه الرحلة.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}># السند</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>العميل</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>المبلغ المحصل</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>الوقت والبيان</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>موقع GPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripDetails.collections.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>#{c.id}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.customerName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                            {c.amount.toFixed(2)} <CurrencySymbol />
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b' }}>
                            <div>{new Date(c.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                            {c.note && <div style={{ color: '#475569' }}>{c.note}</div>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {c.gpsLat && c.gpsLng ? (
                              <button
                                type="button"
                                onClick={() => openGoogleMaps(c.gpsLat!, c.gpsLng!)}
                                style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                خريطة التحصيل ({c.gpsLat.toFixed(4)}, {c.gpsLng.toFixed(4)}) ↗
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>بدون GPS</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Section 3: Current Stock on Van */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    مخزون السيارة الحالي ({tripDetails.vanStock.length} أصناف متبقية بالسيارة)
                  </strong>
                </div>
                {tripDetails.vanStock.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لا توجد أصناف متبقية داخل مستودع السيارة المتنقل.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>الصنف والباركود</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>سعر البيع</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>الكمية المتبقية بالسيارة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripDetails.vanStock.map((v) => (
                        <tr key={v.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                            {v.productName}
                            {v.barcode && <span style={{ fontSize: '10.5px', color: '#64748b', marginRight: '6px' }}>({v.barcode})</span>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {v.retailPrice.toFixed(2)} <CurrencySymbol />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>
                            {v.qty} قطعة
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button variant="secondary" onClick={() => setSelectedTripId(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </StandardDialog>
      )}
    </div>
  );
}
