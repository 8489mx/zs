import { useState, useMemo } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, type VanTripSummary, type TripAdminDetails, type VanTripExpense, type VanPackagingMovement } from '../api/van-sales.api';

export function VanTripsTab() {
  const queryClient = useQueryClient();
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: trips = [],
    isLoading: isTripsLoading,
    refetch: refetchTrips,
  } = useQuery<VanTripSummary[]>({
    queryKey: ['van-sales-admin-trips', tripStatusFilter],
    queryFn: () => vanSalesApi.listAdminTrips({ status: tripStatusFilter || undefined }),
    refetchInterval: 25000,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['van-sales-admin-trips'] }),
        refetchTrips(),
      ]);
      await new Promise((r) => setTimeout(r, 450));
      toast.success('تم تحديث رحلات التوزيع بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Query for trip details when a trip is selected
  const { data: tripDetails, isLoading: isDetailsLoading } = useQuery<TripAdminDetails>({
    queryKey: ['van-trip-admin-details', selectedTripId],
    queryFn: () => vanSalesApi.getTripDetails(selectedTripId!),
    enabled: Boolean(selectedTripId),
  });

  // Query for admin trip expenses
  // Query for admin trip expenses
  const { data: adminExpensesData } = useQuery({
    queryKey: ['van-admin-trip-expenses', selectedTripId],
    queryFn: () => (selectedTripId ? vanSalesApi.getAdminTripExpenses(selectedTripId) : Promise.resolve({ expenses: [], totalExpenses: 0 })),
    enabled: Boolean(selectedTripId),
  });
  const adminExpenses: VanTripExpense[] = useMemo(() => {
    if (!adminExpensesData) return [];
    if (Array.isArray(adminExpensesData)) return adminExpensesData;
    return (adminExpensesData as any).expenses || [];
  }, [adminExpensesData]);

  // Query for admin trip packaging movements
  const { data: adminPackagingData } = useQuery({
    queryKey: ['van-admin-trip-packaging', selectedTripId],
    queryFn: () => (selectedTripId ? vanSalesApi.getAdminTripPackaging(selectedTripId) : Promise.resolve([])),
    enabled: Boolean(selectedTripId),
  });
  const adminPackaging: VanPackagingMovement[] = useMemo(() => {
    if (!adminPackagingData) return [];
    if (Array.isArray(adminPackagingData)) return adminPackagingData;
    return (adminPackagingData as any).movements || [];
  }, [adminPackagingData]);

  // Chronological journey trail of the van trip
  const chronologicalTrail = useMemo(() => {
    if (!tripDetails) return [];
    const events: {
      id: string;
      type: 'sale' | 'collection' | 'expense' | 'packaging';
      time: string;
      title: string;
      subtitle: string;
      amount?: number;
      gpsLat?: number;
      gpsLng?: number;
      badge: string;
      badgeBg: string;
      badgeColor: string;
    }[] = [];

    for (const s of tripDetails.sales) {
      events.push({
        id: `sale-${s.id}`,
        type: 'sale',
        time: s.createdAt,
        title: `فاتورة بيع #${s.docNo} - ${s.customerName || 'عميل نقدي'}`,
        subtitle: `طريقة الدفع: ${s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'credit' ? 'آجل' : 'مجزأ'}${s.isCreditOverridden ? ' • تم الاعتماد الاستثنائي لسقف الائتمان بالـ PIN' : ''}`,
        amount: s.total,
        gpsLat: s.deliveryGpsLat,
        gpsLng: s.deliveryGpsLng,
        badge: s.paymentMethod === 'cash' ? 'بيع كاش' : 'بيع آجل',
        badgeBg: s.paymentMethod === 'cash' ? '#dcfce7' : '#fef3c7',
        badgeColor: s.paymentMethod === 'cash' ? '#15803d' : '#b45309',
      });
    }

    for (const c of tripDetails.collections) {
      events.push({
        id: `col-${c.id}`,
        type: 'collection',
        time: c.createdAt,
        title: `سند تحصيل نقدي - ${c.customerName}`,
        subtitle: c.note || 'تحصيل من حساب العميل',
        amount: c.amount,
        gpsLat: c.gpsLat,
        gpsLng: c.gpsLng,
        badge: 'تحصيل كاش',
        badgeBg: '#e0f2fe',
        badgeColor: '#0369a1',
      });
    }

    for (const exp of adminExpenses) {
      events.push({
        id: `exp-${exp.id}`,
        type: 'expense',
        time: exp.createdAt,
        title: `مصروف رحلة: ${exp.expenseType === 'fuel' ? 'وقود' : exp.expenseType === 'toll' ? 'كارتة' : exp.expenseType === 'maintenance' ? 'صيانة' : 'إكراميات'}`,
        subtitle: (exp as any).notes || (exp as any).description || 'مصروف ميداني للسيارة',
        amount: -exp.amount,
        badge: 'مصروف',
        badgeBg: '#fee2e2',
        badgeColor: '#b91c1c',
      });
    }

    for (const pkg of adminPackaging) {
      const pType = (pkg as any).packageType || (pkg as any).packagingType;
      const delivered = (pkg as any).deliveredQty ?? (pkg as any).qtyOut ?? 0;
      const returned = (pkg as any).returnedQty ?? (pkg as any).qtyIn ?? 0;
      events.push({
        id: `pkg-${pkg.id}`,
        type: 'packaging',
        time: pkg.createdAt,
        title: `حركة فوارغ: ${pType === 'crate_plastic' || pType === 'plastic_crate' ? 'صناديق بلاستيك' : 'بالتات/أسطوانات'}`,
        subtitle: `${pkg.customerName ? `عميل: ${pkg.customerName} • ` : ''}صادر: ${delivered} | وارد: ${returned}`,
        badge: 'فوارغ',
        badgeBg: '#f3e8ff',
        badgeColor: '#7e22ce',
      });
    }

    return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [tripDetails, adminExpenses, adminPackaging]);

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
            disabled={isRefreshing}
            style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRefreshing ? 'wait' : 'pointer',
              opacity: isRefreshing ? 0.75 : 1,
            }}
            onClick={handleManualRefresh}
            title="تحديث قائمة رحلات التوزيع من السيرفر"
          >
            <RefreshCwIcon
              size={13}
              className={isRefreshing ? 'spin-animation' : undefined}
              style={isRefreshing ? { animation: 'spin 0.75s linear infinite' } : undefined}
            />
            {isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}
          </Button>
        </div>
      </div>

      {/* Trips Table (Zero Horizontal Scroll Standard) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          width: '100%',
          boxSizing: 'border-box',
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
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'right',
              fontSize: '12px',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '17.5%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '7.5%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '7.5%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>#</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, fontSize: '11.5px' }}>المندوب والمركبة</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, fontSize: '11.5px' }}>الوردية والعداد</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, fontSize: '11.5px' }}>المستودع</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>الحالة</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>المحمّل</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>المبيعات</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>المحصّل</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>عجز / زيادة</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, fontSize: '11.5px' }}>التاريخ والتوقيت</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', textAlign: 'center', fontSize: '11.5px' }}>
                    #{t.id}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.repName}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                      {t.vehiclePlate ? (
                        <span style={{ fontSize: '10px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0 4px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {t.vehiclePlate}
                        </span>
                      ) : null}
                      <span style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.vanLocationName}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {t.shiftName || 'وردية أساسية'}
                    </div>
                    {t.startOdometer !== undefined && (
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        عداد: {t.startOdometer} {t.endOdometer ? `← ${t.endOdometer}` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', color: '#475569', fontWeight: 600, fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.sourceWarehouseName}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: t.status === 'open' ? '#dcfce7' : '#f1f5f9',
                        color: t.status === 'open' ? '#15803d' : '#475569',
                        border: `1px solid ${t.status === 'open' ? '#bbf7d0' : '#e2e8f0'}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.status === 'open' ? 'نشطة بالشارع' : 'تمت التصفية'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {t.loadedAmount.toFixed(2)} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {t.salesAmount.toFixed(2)} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 800, color: '#15803d', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {t.cashCollected.toFixed(2)} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {t.variance === 0 ? (
                      <span style={{ color: '#94a3b8' }}>0.00</span>
                    ) : t.variance < 0 ? (
                      <span style={{ color: '#dc2626' }}>{t.variance.toFixed(2)}</span>
                    ) : (
                      <span style={{ color: '#2563eb' }}>+{t.variance.toFixed(2)}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', fontSize: '10.5px', color: '#64748b', lineHeight: 1.3 }}>
                    <div style={{ whiteSpace: 'nowrap' }}>بدء: {new Date(t.openedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                    {t.closedAt && (
                      <div style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        إغلاق: {new Date(t.closedAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <Button
                      variant="secondary"
                      style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                      onClick={() => setSelectedTripId(t.id)}
                    >
                      تفاصيل ↗
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
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
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>مصروفات الرحلة</span>
                  <strong style={{ fontSize: '14px', color: '#b91c1c' }}>
                    {(adminExpenses.reduce((s, e) => s + Number(e.amount || 0), 0) || Number(tripDetails.trip.tripExpenses || 0)).toFixed(2)} <CurrencySymbol />
                  </strong>
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
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                            <div>{s.customerName}</div>
                            {s.isCreditOverridden && (
                              <span style={{ fontSize: '9.5px', backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '2px' }}>
                                اعتماد استثنائي بالـ PIN: {s.creditOverrideReason || 'موافقة المشرف'}
                              </span>
                            )}
                          </td>
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

              {/* Section 4: Approved Field Trip Expenses */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    مصروفات الرحلة الميدانية ({adminExpenses.length} مصروف)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>
                    إجمالي المصروفات: {adminExpenses.reduce((s, e) => s + Number(e.amount || 0), 0).toFixed(2)} <CurrencySymbol />
                  </span>
                </div>
                {adminExpenses.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لم يتم تسجيل أي مصروفات تشغيلية في هذه الرحلة.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>نوع المصروف</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>المبلغ</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>البيان والتفاصيل</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminExpenses.map((e) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                            {e.expenseType === 'fuel' ? 'وقود وبنزين' :
                             e.expenseType === 'toll' ? 'كارتات وبوابات' :
                             e.expenseType === 'maintenance' ? 'صيانة وإصلاح طارئ' :
                             e.expenseType === 'food_allowance' ? 'بدل وجبة وإكراميات' : 'مصروفات نثرية أخرى'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#b91c1c' }}>
                            {Number(e.amount).toFixed(2)} <CurrencySymbol />
                          </td>
                          <td style={{ padding: '8px 12px', color: '#475569' }}>
                            {(e as any).notes || (e as any).description || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b' }}>
                            {new Date(e.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Section 5: Returnable Packaging & Empties Ledger */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    ذمة الفوارغ والصناديق والبالتات ({adminPackaging.length} حركة)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    متابعة الأقفاص البلاستيكية والأسطوانات المسلمة والمستردة
                  </span>
                </div>
                {adminPackaging.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لا توجد حركات تسليم أو استلام فوارغ مسجلة في هذه الرحلة.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>نوع الفارغ</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>العميل / المحل</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>المسلم (صادر)</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>المستلم (وارد)</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>ملاحظات والوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPackaging.map((p: any) => {
                        const pType = p.packageType || p.packagingType;
                        const delivered = p.deliveredQty ?? p.qtyOut ?? 0;
                        const returned = p.returnedQty ?? p.qtyIn ?? 0;
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                              {pType === 'crate_plastic' || pType === 'plastic_crate' ? 'صناديق بلاستيك' :
                               pType === 'wooden_pallet' || pType === 'pallet' || pType === 'box_wooden' ? 'طبالي خشبية (بالتات)' :
                               pType === 'cylinder_gas' || pType === 'gas_cylinder' ? 'أسطوانات غاز' : 'فوارغ أخرى'}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                              {p.customerName || 'حركة عامة'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: delivered > 0 ? '#c2410c' : '#94a3b8' }}>
                              {delivered}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: returned > 0 ? '#15803d' : '#94a3b8' }}>
                              {returned}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b' }}>
                              <span>{new Date(p.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                              {p.notes && <span style={{ marginRight: '6px' }}>• {p.notes}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Section 6: Chronological Visual Journey / Route Trail */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    مسار الرحلة الزمني الميداني ({chronologicalTrail.length} محطة وحركة)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    تسلسل زمني دقيق لكافة تحركات وفواتير وتحصيلات ومصروفات الفان
                  </span>
                </div>
                {chronologicalTrail.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لم تبدأ حركات هذه الرحلة بعد.
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chronologicalTrail.map((ev, idx) => (
                      <div
                        key={ev.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          position: 'relative',
                        }}
                      >
                        {/* Timeline Step Dot & Line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: ev.badgeBg,
                              border: `2px solid ${ev.badgeColor}`,
                              color: ev.badgeColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {idx + 1}
                          </div>
                          {idx < chronologicalTrail.length - 1 && (
                            <div style={{ width: '2px', height: '28px', backgroundColor: '#e2e8f0', marginTop: '4px' }} />
                          )}
                        </div>

                        {/* Event Content */}
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                {ev.title}
                              </span>
                              <span style={{ fontSize: '10px', backgroundColor: ev.badgeBg, color: ev.badgeColor, padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                {ev.badge}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {ev.subtitle}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {ev.amount != null && (
                              <strong style={{ fontSize: '13px', color: ev.amount > 0 ? '#15803d' : '#b91c1c' }}>
                                {ev.amount > 0 ? `+${ev.amount.toFixed(2)}` : ev.amount.toFixed(2)} <CurrencySymbol />
                              </strong>
                            )}
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {new Date(ev.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {ev.gpsLat && ev.gpsLng && (
                              <button
                                type="button"
                                onClick={() => openGoogleMaps(ev.gpsLat!, ev.gpsLng!)}
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                GPS ↗
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
