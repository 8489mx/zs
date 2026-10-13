import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vanSalesApi } from '../api/van-sales.api';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  RefreshCwIcon,
  CheckShieldIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';

export const VanVisitsTrackingAdminTab: React.FC = () => {
  const [selectedSubTab, setSelectedSubTab] = useState<'visits' | 'surveys' | 'breadcrumbs'>('visits');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterNoSaleOnly, setFilterNoSaleOnly] = useState(false);
  const [selectedTripIdForTrail, setSelectedTripIdForTrail] = useState<number | null>(null);
  const [selectedInventoryVisit, setSelectedInventoryVisit] = useState<any | null>(null);

  // 1. Fetch Visits History & Strike Rate KPIs
  const {
    data: visitsData,
    isLoading: isVisitsLoading,
    refetch: refetchVisits,
  } = useQuery({
    queryKey: ['van-admin-visits', filterDate, filterNoSaleOnly],
    queryFn: () => vanSalesApi.getVisitsHistory({ date: filterDate, noSaleOnly: filterNoSaleOnly }),
  });

  // 2. Fetch Trade Surveys
  const {
    data: surveysData,
    isLoading: isSurveysLoading,
    refetch: refetchSurveys,
  } = useQuery({
    queryKey: ['van-admin-trade-surveys'],
    queryFn: () => vanSalesApi.getTradeSurveys(),
  });

  // 3. Fetch Breadcrumbs for selected trip
  const {
    data: breadcrumbsData,
    isLoading: isBreadcrumbsLoading,
  } = useQuery({
    queryKey: ['van-admin-trip-breadcrumbs', selectedTripIdForTrail],
    queryFn: () => (selectedTripIdForTrail ? vanSalesApi.getLiveTripBreadcrumbs(selectedTripIdForTrail) : null),
    enabled: Boolean(selectedTripIdForTrail),
  });

  const metrics = visitsData?.metrics || {
    totalVisits: 0,
    productiveVisits: 0,
    nonProductiveVisits: 0,
    strikeRatePercentage: 0,
    totalSalesAmount: 0,
    totalCollectionsAmount: 0,
    avgDwellTimeMinutes: 0,
    noSaleReasonsCount: {},
  };

  const visits = visitsData?.visits || [];
  const surveys = surveysData?.surveys || [];
  const breadcrumbs = breadcrumbsData?.breadcrumbs || [];

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI Ribbons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* KPI 1: Strike Rate */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>معدل ضرب الزيارات (Strike Rate)</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon size={15} color="#170e5e" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#170e5e' }}>
            {metrics.strikeRatePercentage}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
            {metrics.productiveVisits} زيارة ببيع من أصل {metrics.totalVisits}
          </div>
        </div>

        {/* KPI 2: Total Visits */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>إجمالي الزيارات الميدانية</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPinIcon size={15} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            {metrics.totalVisits}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {metrics.nonProductiveVisits} محطة لم تشترِ (سلبية)
          </div>
        </div>

        {/* KPI 3: Total Sales */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>مبيعات الزيارات المنفذة</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckShieldIcon size={15} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
            {metrics.totalSalesAmount.toLocaleString('en-US')} <span style={{ fontSize: '13px' }}><CurrencySymbol /></span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            تحصيلات: {metrics.totalCollectionsAmount.toLocaleString('en-US')} <CurrencySymbol />
          </div>
        </div>

        {/* KPI 4: Average Dwell Time */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>متوسط وقت الزيارة بالمحل</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClockIcon size={15} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>
            {metrics.avgDwellTimeMinutes} <span style={{ fontSize: '13px' }}>دقيقة</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            من تسجيل الـ Check-In للمغادرة
          </div>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '8px 12px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setSelectedSubTab('visits')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedSubTab === 'visits' ? '1px solid #170e5e' : '1px solid transparent',
              backgroundColor: selectedSubTab === 'visits' ? '#170e5e' : 'transparent',
              color: selectedSubTab === 'visits' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            سجل الزيارات والإنتاجية ({visits.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubTab('surveys')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedSubTab === 'surveys' ? '1px solid #170e5e' : '1px solid transparent',
              backgroundColor: selectedSubTab === 'surveys' ? '#170e5e' : 'transparent',
              color: selectedSubTab === 'surveys' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            تفتيش الثلاجات والمنافسين ({surveys.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubTab('breadcrumbs')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedSubTab === 'breadcrumbs' ? '1px solid #170e5e' : '1px solid transparent',
              backgroundColor: selectedSubTab === 'breadcrumbs' ? '#170e5e' : 'transparent',
              color: selectedSubTab === 'breadcrumbs' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            خريطة التتبع الحي ومسار اليوم
          </button>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#0f172a',
            }}
          />
          <button
            type="button"
            onClick={() => setFilterNoSaleOnly(!filterNoSaleOnly)}
            style={{
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: filterNoSaleOnly ? '1px solid #ef4444' : '1px solid #cbd5e1',
              backgroundColor: filterNoSaleOnly ? '#fef2f2' : '#ffffff',
              color: filterNoSaleOnly ? '#b91c1c' : '#475569',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {filterNoSaleOnly ? 'عرض كل الزيارات' : 'الزيارات السلبية فقط'}
          </button>
          <Button
            variant="secondary"
            onClick={() => {
              refetchVisits();
              refetchSurveys();
            }}
            style={{ height: '32px', padding: '0 10px', fontSize: '11.5px' }}
          >
            <RefreshCwIcon size={13} style={{ marginInlineEnd: '4px' }} />
            تحديث
          </Button>
        </div>
      </div>

      {/* SUB-TAB 1: VISITS TABLE */}
      {selectedSubTab === 'visits' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'start' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المحل والعميل</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>وقت الوصول Check-In</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>مدة الزيارة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>النطاق الجغرافي</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>حالة الإنتاجية</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المبيعات والتحصيل</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>جرد الرف</th>
                </tr>
              </thead>
              <tbody>
                {isVisitsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      جاري تحميل سجل الزيارات الميدانية...
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد زيارات مسجلة في هذا التاريخ المحدد
                    </td>
                  </tr>
                ) : (
                  visits.map((v: any) => {
                    const dwellMins = Math.round((v.dwellTimeSeconds || 0) / 60);
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          <div>{v.customerName || `عميل #${v.customerId}`}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
                            رحلة #{v.tripId || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                          {v.checkInAt ? new Date(v.checkInAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                          <span style={{ fontWeight: 700 }}>{dwellMins}</span> دقيقة
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {v.isGeofenceValid ? (
                            <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              مطابق ({v.geofenceDistanceMeters}م)
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              كسر نطاق ({v.geofenceDistanceMeters}م)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {v.hasSale ? (
                            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              ✓ تم البيع بنجاح
                            </span>
                          ) : (
                            <div>
                              <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                ✕ زيارة سلبية (لم يشترِ)
                              </span>
                              {v.noSaleReason && (
                                <div style={{ fontSize: '10.5px', color: '#b91c1c', marginTop: '3px', fontWeight: 600 }}>
                                  السبب: {v.noSaleReason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {v.saleAmount > 0 ? (
                            <div style={{ fontWeight: 800, color: '#15803d' }}>
                              {Number(v.saleAmount).toLocaleString('en-US')} <CurrencySymbol />
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {Array.isArray(v.storeInventory) && v.storeInventory.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedInventoryVisit(v)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                color: '#1e293b',
                              }}
                            >
                              عرض ({v.storeInventory.length} صنف)
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '11px' }}>تم التخطي</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TRADE MARKETING & COOLERS SURVEYS */}
      {selectedSubTab === 'surveys' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'start' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع التفتيش</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المحل / العميل</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>بيانات الأصل / الثلاجة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>النظافة والتبريد</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>منتجات منافسة؟</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>رصد المنافس وسعره</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {isSurveysLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      جاري تحميل استطلاعات الميرشندايز والتفتيش...
                    </td>
                  </tr>
                ) : surveys.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد استطلاعات تفتيش مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  surveys.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            backgroundColor: s.surveyType === 'cooler_inspection' ? '#e0f2fe' : '#fef3c7',
                            color: s.surveyType === 'cooler_inspection' ? '#0369a1' : '#b45309',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {s.surveyType === 'cooler_inspection' ? 'تفتيش ثلاجة وأصل' : 'استطلاع منافسين'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        عميل #{s.customerId}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {s.assetName || s.assetId ? (
                          <div>
                            <div style={{ fontWeight: 700 }}>{s.assetName || 'ثلاجة عرض'}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>كود: {s.assetId || '—'}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {s.temperatureCelsius != null && (
                          <div>حرارة: <b>{s.temperatureCelsius}°م</b></div>
                        )}
                        {s.cleanlinessRating && (
                          <div style={{ fontSize: '11px', color: '#d97706' }}>نظافة: {s.cleanlinessRating} / 5</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {s.isPureCompanyProducts ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11.5px' }}>✓ نقية (منتجاتنا فقط)</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '11.5px' }}>✕ مخالفة (يوجد منافس)</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {s.competitorName ? (
                          <div>
                            <div style={{ fontWeight: 700 }}>{s.competitorName} ({s.competitorProduct || ''})</div>
                            {s.competitorPrice && (
                              <div style={{ color: '#059669', fontSize: '11px' }}>السعر: {s.competitorPrice} ج.م</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '11px' }}>
                        {new Date(s.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LIVE GPS BREADCRUMBS & FLEET MAP */}
      {selectedSubTab === 'breadcrumbs' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                المسار الجغرافي الحي لحركة السيارة (GPS Breadcrumb Trail)
              </h4>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                رسم المسار الفعلي المتصل للسيارة طوال اليوم مع نقاط التوقف والمحطات المنفذة
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>رقم الرحلة:</span>
              <input
                type="number"
                placeholder="أدخل رقم الرحلة..."
                value={selectedTripIdForTrail || ''}
                onChange={(e) => setSelectedTripIdForTrail(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '140px',
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          {/* Map & Coordinates Visualizer */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '24px',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {!selectedTripIdForTrail ? (
              <div>
                <MapPinIcon size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <h5 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                  يرجى تحديد رقم رحلة لعرض مسار الـ GPS
                </h5>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                  سيتم رسم خط السير الفعلي لنقاط حركة المندوب والتوقفات عند المحلات
                </p>
              </div>
            ) : isBreadcrumbsLoading ? (
              <div style={{ color: '#64748b', fontSize: '12.5px' }}>جاري استرجاع إحداثيات المسار الحي...</div>
            ) : breadcrumbs.length === 0 ? (
              <div>
                <AlertTriangleIcon size={32} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#b45309' }}>
                  لا توجد نقاط تتبع مسجلة لهذه الرحلة حتى الآن
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  تأكد من بدء الرحلة وتفعيل صلاحية الموقع الجغرافي بهاتف المندوب
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'start' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    تم تسجيل {breadcrumbs.length} نقطة مسار جغرافي للرحلة #{selectedTripIdForTrail}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    آخر نقطة: {new Date(breadcrumbs[breadcrumbs.length - 1].recordedAt).toLocaleTimeString('ar-EG')}
                  </span>
                </div>

                {/* Breadcrumb Steps Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {breadcrumbs.map((b: any, idx: number) => (
                    <div
                      key={b.id}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                          {idx + 1}
                        </span>
                        <span>إحداثيات: {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#64748b' }}>
                        <span>السرعة: {b.speedKmh} كم/س</span>
                        <span>البطارية: {b.batteryLevel}%</span>
                        <span>{new Date(b.recordedAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Store Inventory Viewer */}
      {selectedInventoryVisit && (
        <StandardDialog
          open={true}
          onClose={() => setSelectedInventoryVisit(null)}
          title={`جرد رصيد رف العميل: ${selectedInventoryVisit.customerName}`}
          subtitle="الأصناف والكميات المتبقية على رف المحل أثناء الزيارة"
          badge="جرد الرف"
          width="min(560px, 96vw)"
          footerActions={
            <StandardDialogFooter
              onClose={() => setSelectedInventoryVisit(null)}
              cancelText="إغلاق"
            />
          }
        >
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'start' }}>الصنف</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>الكمية على الرف</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>تاريخ الصلاحية</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInventoryVisit.storeInventory || []).map((it: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.productName || `صنف #${it.productId}`}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#170e5e' }}>{it.qtyOnShelf}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{it.expiryDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StandardDialog>
      )}
    </div>
  );
};
