import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { toast } from '@/shared/components/system-alert';
import {
  vanSalesApi,
  SupervisorRouteKpiSummary,
  InterVanTransferRecord,
} from '../api/van-sales.api';
import {
  TruckIcon,
  MapPinIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ArrowLeftIcon,
  SlidersIcon,
  EditIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';

const WEEKDAYS = [
  { id: 'saturday', label: 'السبت' },
  { id: 'sunday', label: 'الأحد' },
  { id: 'monday', label: 'الإثنين' },
  { id: 'tuesday', label: 'الثلاثاء' },
  { id: 'wednesday', label: 'الأربعاء' },
  { id: 'thursday', label: 'الخميس' },
];

const NEGATIVE_REASON_LABELS: Record<string, string> = {
  shop_closed: 'المحل مغلق',
  no_cash: 'لا توجد نقدية كافية',
  sufficient_stock: 'البضاعة متوفرة وكافية',
  item_unavailable: 'الصنف المطلوب غير متوفر بالسيارة',
  postponed: 'طلب تأجيل الميعاد',
  other: 'أسباب ميدانية أخرى',
};

export function VanRoutesKpiAdminTab() {
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeSection, setActiveSection] = useState<'transfers' | 'visits' | 'scheduling'>('transfers');

  // Customer Route Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [routeInput, setRouteInput] = useState('');
  const [sequenceInput, setSequenceInput] = useState('1');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Supervisor KPIs Query
  const { data: kpiData, refetch: refetchKpis } = useQuery<SupervisorRouteKpiSummary>({
    queryKey: ['van-supervisor-kpis', dateFrom, dateTo],
    queryFn: () => vanSalesApi.fetchSupervisorRouteKpis({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    refetchInterval: 30000,
  });

  // 2. Inter-Van Transfers Live Ribbon Query
  const { data: transfers = [], isLoading: isTransfersLoading, refetch: refetchTransfers } = useQuery<InterVanTransferRecord[]>({
    queryKey: ['van-admin-transfers'],
    queryFn: () => vanSalesApi.fetchAdminTransfers(),
    refetchInterval: 15000,
  });

  // 3. Field Visits Query
  const { data: fieldVisits = [], isLoading: isVisitsLoading, refetch: refetchVisits } = useQuery<any[]>({
    queryKey: ['van-admin-field-visits', dateFrom, dateTo],
    queryFn: () => vanSalesApi.fetchAdminFieldVisits({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    refetchInterval: 25000,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['van-supervisor-kpis'] }),
        queryClient.invalidateQueries({ queryKey: ['van-admin-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['van-admin-field-visits'] }),
        refetchKpis(),
        refetchTransfers(),
        refetchVisits(),
      ]);
      await new Promise((r) => setTimeout(r, 450));
      toast.success('تم تحديث بيانات خطوط السير والرقابة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: (payload: { customerId: number; route: string; routeSequence: number; visitDays: string[] }) =>
      vanSalesApi.setCustomerRouteSchedule(payload.customerId, {
        route: payload.route,
        routeSequence: payload.routeSequence,
        visitDays: payload.visitDays,
      }),
    onSuccess: () => {
      toast.success('تم تحديث وتثبيت خط سير العميل بنجاح');
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['van-admin-field-visits'] });
      queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تحديث خط سير العميل');
    },
  });

  const openScheduleModal = (customer: any) => {
    setEditingCustomer(customer);
    setRouteInput(customer.route || 'خط رئيسي');
    setSequenceInput(String(customer.routeSequence || 1));
    setSelectedDays(Array.isArray(customer.visitDays) ? customer.visitDays : ['saturday', 'monday', 'wednesday']);
  };

  const handleToggleDay = (dayId: string) => {
    setSelectedDays((prev) => (prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]));
  };

  // Repeated negative visits (3+)
  const repeatedNegativeVisits = useMemo(() => {
    return fieldVisits.filter((v) => v.consecutiveNegativeCount >= 3 || v.hasRepeatedNegativeAlert);
  }, [fieldVisits]);

  // Unique customers for scheduling section
  const customersList = useMemo(() => {
    const map = new Map<number, any>();
    fieldVisits.forEach((v) => {
      if (v.customerId && !map.has(v.customerId)) {
        map.set(v.customerId, {
          customerId: v.customerId,
          customerName: v.customerName,
          customerCode: v.customerCode || `CUST-${v.customerId}`,
          customerPhone: v.customerPhone,
          route: v.route || 'غير محدد',
          routeSequence: v.routeSequence || 1,
          visitDays: v.visitDays || [],
          locationUrl: v.locationUrl,
        });
      }
    });
    return Array.from(map.values()).filter((c) => {
      if (!customerSearch.trim()) return true;
      const q = customerSearch.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.route && c.route.toLowerCase().includes(q))
      );
    });
  }, [fieldVisits, customerSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* Date Filters Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarIcon size={14} color="#64748b" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>الفترة:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#0f172a',
            }}
          />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>إلى</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#0f172a',
            }}
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="secondary"
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
            >
              إلغاء الفلتر
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            title="تحديث بيانات خطوط السير والرقابة من السيرفر"
          >
            <RefreshCwIcon
              size={13}
              className={isRefreshing ? 'spin-animation' : undefined}
              style={isRefreshing ? { animation: 'spin 0.75s linear infinite' } : undefined}
            />
            {isRefreshing ? 'جارٍ التحديث...' : 'تحديث البيانات'}
          </Button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>إجمالي الزيارات الميدانية</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '4px' }}>
            {kpiData?.totalVisits ?? 0}
          </span>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            {kpiData?.positiveVisits ?? 0} ناجحة • {kpiData?.negativeVisits ?? 0} سلبية
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a', display: 'block' }}>نسبة الضربات الناجحة (Strike Rate)</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {kpiData?.strikeRate ?? 0}%
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>نسبة تحويل الزيارة إلى فاتورة بيع فعلية</span>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: (kpiData?.repeatedNegativeCustomersCount ?? 0) > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            backgroundColor: (kpiData?.repeatedNegativeCustomersCount ?? 0) > 0 ? '#fffdfd' : '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#dc2626', display: 'block' }}>محلات سلبية متكررة (3+)</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#b91c1c', display: 'block', marginTop: '4px' }}>
            {kpiData?.repeatedNegativeCustomersCount ?? 0}
          </span>
          <span style={{ fontSize: '11px', color: '#b91c1c' }}>محلات تتطلب تدخل المشرف فوراً</span>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', display: 'block' }}>استهلاك ومعدل وقود الأسطول</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#0369a1', display: 'block', marginTop: '4px' }}>
            {kpiData?.totalFuelLiters ?? 0} <span style={{ fontSize: '13px', fontWeight: 600 }}>لتر</span>
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            معدل الاستهلاك: {kpiData?.avgConsumptionRate ?? 0} كم/لتر ({kpiData?.totalFuelCost ?? 0} <CurrencySymbol />)
          </span>
        </div>
      </div>

      {/* Repeated Negative Visits Alert Box (If any exists) */}
      {(repeatedNegativeVisits.length > 0 || (kpiData?.repeatedNegativeCustomersCount ?? 0) > 0) && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangleIcon size={18} color="#e11d48" />
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#9f1239' }}>
              تنبيه رقابي: محلات ومتاجر تكررت زياراتها السلبية (3 مرات فأكثر) دون شراء
            </h4>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#be123c', lineHeight: 1.5 }}>
            وفقاً لسياسة التوزيع المؤسسية، المحل الذي يتم رفض الشراء منه 3 مرات متتالية يتم إخطار المشرف لإعادة دراسة الائتمان، فحص مسار الخط، أو التفاوض مع التاجر.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {repeatedNegativeVisits.slice(0, 5).map((v, i) => (
              <div
                key={i}
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  border: '1px solid #ffe4e6',
                }}
              >
                <div>
                  <strong style={{ color: '#0f172a' }}>{v.customerName}</strong>
                  <span style={{ color: '#64748b', marginRight: '8px' }}>({v.customerPhone || 'بدون هاتف'})</span>
                  <span style={{ color: '#94a3b8', marginRight: '8px' }}>خط: {v.route || 'عام'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#e11d48', fontWeight: 700 }}>{v.consecutiveNegativeCount} زيارات سلبية</span>
                  <span style={{ background: '#fef2f2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    آخر سبب: {NEGATIVE_REASON_LABELS[v.negativeReason] || v.negativeReason || 'محل مغلق'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#ffffff',
          padding: '6px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection('transfers')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeSection === 'transfers' ? '#170e5e' : 'transparent',
            color: activeSection === 'transfers' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <TruckIcon size={14} />
          شريط مناقلات سيارات الشارع ({transfers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('visits')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeSection === 'visits' ? '#170e5e' : 'transparent',
            color: activeSection === 'visits' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <MapPinIcon size={14} />
          سجل الزيارات وأسباب الرفض ({fieldVisits.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('scheduling')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeSection === 'scheduling' ? '#170e5e' : 'transparent',
            color: activeSection === 'scheduling' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <SlidersIcon size={14} />
          تحديد وجدولة خطوط سير العملاء
        </button>
      </div>

      {/* SECTION 1: Inter-Van Transfers Live Ribbon */}
      {activeSection === 'transfers' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                شريط الرقابة المباشرة: مناقلات البضاعة بين سيارات التوزيع في الميدان
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                توثيق فوري لأي عملية إسناد أو مناقلة بضاعة بين سيارتين في الشارع بموافقة الطرفين
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#170e5e' }}>
              إجمالي الحركات: {transfers.length}
            </span>
          </div>

          {isTransfersLoading ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>جاري تحميل مناقلات الشارع...</div>
          ) : transfers.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              لا توجد عمليات مناقلة بين السيارات حتى الآن اليوم.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم المناقلة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>السيارة المصدر (المحوّل)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>اتجاه الحركة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>السيارة المستلمة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>الأصناف المنقولة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>إجمالي القطع</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#170e5e' }}>
                      {t.transferNo}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {t.fromRepName}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#0284c7',
                          background: '#f0f9ff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        <ArrowLeftIcon size={12} /> مناقلة
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {t.toRepName}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {t.items.slice(0, 2).map((it, idx) => (
                          <span key={idx} style={{ color: '#334155' }}>
                            • {it.productName} ({it.qty} قطعة)
                          </span>
                        ))}
                        {t.items.length > 2 && (
                          <span style={{ fontSize: '10.5px', color: '#64748b' }}>+{t.items.length - 2} أصناف أخرى</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                      {t.totalQty}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background:
                            t.status === 'accepted'
                              ? '#dcfce7'
                              : t.status === 'rejected'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            t.status === 'accepted'
                              ? '#15803d'
                              : t.status === 'rejected'
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        {t.status === 'accepted'
                          ? 'تم القبول والاستلام'
                          : t.status === 'rejected'
                          ? 'مرفوضة من المندوب'
                          : 'بانتظار موافقة المستلم'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: '#64748b' }}>
                      {new Date(t.createdAt).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SECTION 2: Visits & Negative Reasons Audit */}
      {activeSection === 'visits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Negative Reasons Breakdown Cards */}
          {kpiData?.negativeReasonsBreakdown && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '14px 18px',
                border: '1px solid #e2e8f0',
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                تحليل أسباب عدم الشراء (أسباب الزيارات السلبية):
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {Object.entries(kpiData.negativeReasonsBreakdown).map(([reason, count]) => (
                  <div
                    key={reason}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                      {NEGATIVE_REASON_LABELS[reason] || reason}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '2px' }}>
                      {count} <span style={{ fontSize: '11px', color: '#94a3b8' }}>زيارة</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visits Table */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {isVisitsLoading ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>جاري تحميل الزيارات...</div>
            ) : fieldVisits.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                لا توجد زيارات ميدانية مسجلة خلال الفترة المحددة.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>المحل / العميل</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>خط السير</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>المندوب</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>النتيجة</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>السبب / الفاتورة</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>تاريخ التأجيل</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>توقيت الزيارة</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldVisits.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{v.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{v.customerPhone || 'بدون هاتف'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {v.route || 'عام'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {v.repName}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: v.visitType === 'positive' ? '#dcfce7' : '#fee2e2',
                            color: v.visitType === 'positive' ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {v.visitType === 'positive' ? 'إيجابية (تم البيع)' : 'سلبية (لم يشترِ)'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {v.visitType === 'positive' ? (
                          <span style={{ color: '#15803d', fontWeight: 700 }}>فاتورة #{v.saleDocNo || 'مكتملة'}</span>
                        ) : (
                          <span style={{ color: '#b91c1c' }}>
                            {NEGATIVE_REASON_LABELS[v.negativeReason] || v.negativeReason || 'بدون سبب'}
                          </span>
                        )}
                        {v.notes && <div style={{ fontSize: '11px', color: '#64748b' }}>{v.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11.5px', color: '#475569' }}>
                        {v.postponedToDate ? v.postponedToDate : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: '#64748b' }}>
                        {new Date(v.visitedAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: Customer Route Scheduling */}
      {activeSection === 'scheduling' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                جدولة وتثبيت خطوط سير المحلات والعملاء
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                تحديد مسار الزيارة (Route)، وترتيب المحل في مسار السيارة، والأيام المفضلة أسبوعياً
              </p>
            </div>
            <div style={{ width: '240px' }}>
              <input
                type="text"
                placeholder="بحث بالاسم أو الخط أو الكود..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {customersList.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              لا توجد بيانات محلات مطابقة.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>كود المحل</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>اسم المحل / العميل</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>خط السير الحالي</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الترتيب في الخط</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>أيام الزيارة الأسبوعية</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customersList.map((c) => (
                  <tr key={c.customerId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>
                      {c.customerCode}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                      {c.customerName}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        {c.route}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#170e5e' }}>
                      #{c.routeSequence}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {c.visitDays && c.visitDays.length > 0 ? (
                          c.visitDays.map((d: string) => {
                            const found = WEEKDAYS.find((w) => w.id === d);
                            return (
                              <span
                                key={d}
                                style={{
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                }}
                              >
                                {found?.label || d}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>يومياً / غير محدد</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => openScheduleModal(c)}
                      >
                        <EditIcon size={12} />
                        تعديل الخط
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Customer Route Modal */}
      {editingCustomer && (
        <StandardDialog
          open={Boolean(editingCustomer)}
          onClose={() => setEditingCustomer(null)}
          title={`تخصيص خط سير: ${editingCustomer.customerName}`}
          subtitle={`كود المحل: ${editingCustomer.customerCode}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                اسم خط السير (Route Name) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: خط الهرم والجيزة، خط فيصل، خط أكتوبر..."
                value={routeInput}
                onChange={(e) => setRouteInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                الترتيب التسلسلي للزيارة في مسار السيارة
              </label>
              <input
                type="number"
                min="1"
                value={sequenceInput}
                onChange={(e) => setSequenceInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                المحل رقم 1 يظهر كأول محطة في خط سير سيارة التوزيع
              </small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                أيام الزيارة الأسبوعية المحددة:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {WEEKDAYS.map((w) => {
                  const isChecked = selectedDays.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleToggleDay(w.id)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid #170e5e' : '1px solid #cbd5e1',
                        background: isChecked ? '#170e5e' : '#f8fafc',
                        color: isChecked ? '#ffffff' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setEditingCustomer(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                disabled={scheduleMutation.isPending}
                onClick={() => {
                  if (!routeInput.trim()) {
                    toast.warning('يرجى تحديد اسم خط السير');
                    return;
                  }
                  scheduleMutation.mutate({
                    customerId: editingCustomer.customerId,
                    route: routeInput.trim(),
                    routeSequence: parseInt(sequenceInput, 10) || 1,
                    visitDays: selectedDays,
                  });
                }}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {scheduleMutation.isPending ? 'جاري الحفظ...' : 'حفظ خط السير'}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
