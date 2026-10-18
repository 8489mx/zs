import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { deliveryRepsApi, DeliveryRep } from '@/shared/api/delivery-reps.api';
import {
  vanSalesApi,
  SupervisorRouteKpiSummary,
  InterVanTransferRecord,
  SupervisorCustomerRouteItem,
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
  CheckCircleIcon,
  SearchIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';
import { normalizeDayKey, DAY_KEY_TO_ARABIC } from './VanItineraryTab';

const WEEKDAYS = [
  { id: 'saturday', label: 'السبت' },
  { id: 'sunday', label: 'الأحد' },
  { id: 'monday', label: 'الإثنين' },
  { id: 'tuesday', label: 'الثلاثاء' },
  { id: 'wednesday', label: 'الأربعاء' },
  { id: 'thursday', label: 'الخميس' },
  { id: 'friday', label: 'الجمعة' },
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
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeSection, setActiveSection] = useState<'transfers' | 'visits' | 'scheduling'>('transfers');
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

  // 4. Van Delivery Representatives Query
  const { data: allReps = [] } = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps'],
    queryFn: () => deliveryRepsApi.list(),
  });

  const vanReps = useMemo(() => {
    return allReps.filter((r) => r.is_active && (r.is_van_rep || r.rep_type === 'van' || r.rep_type === 'both' || !r.rep_type));
  }, [allReps]);

  // Section 3: Route & Rep Scheduling Filters & Data
  const [repFilter, setRepFilter] = useState<'all' | 'unassigned' | string>('all');
  const [routeFilter, setRouteFilter] = useState<'all' | string>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);

  const handleOptimizeSupervisorRoute = async () => {
    if (routeFilter === 'all') return;
    try {
      setIsOptimizingRoute(true);
      const res = await vanSalesApi.optimizeSupervisorRoute({
        route: routeFilter,
        persistSequence: true,
      });

      if (res && res.stats) {
        toast.success(
          `تم ترتيب خط «${routeFilter}» جغرافياً بنجاح! توفير ${res.stats.savedDistanceKm} كم (${res.stats.savingsPercent}%) وتحديث تسلسل ${res.persistedCount || res.orderedStops.length} عميل.`,
        );
        refetchCustomerRoutes();
      }
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء تحسين مسار خط السير');
    } finally {
      setIsOptimizingRoute(false);
    }
  };

  // 5. Supervisor Customer Routes Query (Full Customer Base from Dedicated API)
  const {
    data: customerRoutes = [],
    isLoading: isRoutesLoading,
    refetch: refetchCustomerRoutes,
  } = useQuery<SupervisorCustomerRouteItem[]>({
    queryKey: ['van-supervisor-customer-routes', customerSearch, repFilter, routeFilter],
    queryFn: () =>
      vanSalesApi.getSupervisorCustomerRoutes({
        search: customerSearch.trim() || undefined,
        repId: repFilter !== 'all' ? repFilter : undefined,
        route: routeFilter !== 'all' ? routeFilter : undefined,
        unassignedOnly: repFilter === 'unassigned',
      }),
    staleTime: 30000,
  });

  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    customerRoutes.forEach((c) => {
      if (c.route && c.route !== 'غير محدد') set.add(c.route);
    });
    return Array.from(set).sort();
  }, [customerRoutes]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['van-supervisor-kpis'] }),
        queryClient.invalidateQueries({ queryKey: ['van-admin-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['van-admin-field-visits'] }),
        queryClient.invalidateQueries({ queryKey: ['van-supervisor-customer-routes'] }),
        queryClient.invalidateQueries({ queryKey: ['delivery-reps'] }),
        refetchKpis(),
        refetchTransfers(),
        refetchVisits(),
        refetchCustomerRoutes(),
      ]);
      await new Promise((r) => setTimeout(r, 450));
      toast.success('تم تحديث بيانات خطوط السير والرقابة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Single Customer Route & Rep Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState<SupervisorCustomerRouteItem | null>(null);
  const [routeInput, setRouteInput] = useState('');
  const [sequenceInput, setSequenceInput] = useState('1');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [assignedRepId, setAssignedRepId] = useState<string>('');
  const [assignedRepIds, setAssignedRepIds] = useState<number[]>([]);

  const scheduleMutation = useMutation({
    mutationFn: (payload: {
      customerId: number;
      route: string;
      routeSequence: number;
      visitDays: string[];
      assignedRepId?: number | null;
      assignedRepIds?: number[];
      assignedRepName?: string;
    }) => vanSalesApi.setCustomerRouteSchedule(payload.customerId, payload),
    onSuccess: () => {
      toast.success('تم تحديث وتخصيص خط سير العميل بنجاح');
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['van-supervisor-customer-routes'] });
      queryClient.invalidateQueries({ queryKey: ['van-supervisor-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] });
      queryClient.invalidateQueries({ queryKey: ['van-admin-field-visits'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تحديث خط سير العميل');
    },
  });

  const openScheduleModal = (customer: SupervisorCustomerRouteItem) => {
    setEditingCustomer(customer);
    setRouteInput(customer.route === 'غير محدد' ? '' : customer.route);
    setSequenceInput(String(customer.routeSequence || 1));
    const initDays = Array.isArray(customer.visitDays) && customer.visitDays.length > 0
      ? customer.visitDays.map((d: string) => normalizeDayKey(d)).filter(Boolean)
      : (customer.visitDay ? [normalizeDayKey(customer.visitDay)].filter(Boolean) : []);
    setSelectedDays(initDays);
    setAssignedRepId(customer.assignedRepId ? String(customer.assignedRepId) : '');
    const initRepIds =
      Array.isArray(customer.assignedRepIds) && customer.assignedRepIds.length > 0
        ? customer.assignedRepIds
        : customer.assignedRepId
          ? [customer.assignedRepId]
          : [];
    setAssignedRepIds(initRepIds);
  };

  const handleToggleRepAssignment = (repIdNum: number) => {
    setAssignedRepIds((prev) => {
      const next = prev.includes(repIdNum) ? prev.filter((id) => id !== repIdNum) : [...prev, repIdNum];
      setAssignedRepId(next.length > 0 ? String(next[0]) : '');
      return next;
    });
  };

  const handleToggleDay = (dayId: string) => {
    setSelectedDays((prev) => (prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]));
  };

  // Bulk Customer Assignment Modal State & Mutation
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRepId, setBulkRepId] = useState<string>('no_change');
  const [bulkRouteInput, setBulkRouteInput] = useState<string>('');
  const [bulkVisitDays, setBulkVisitDays] = useState<string[]>(['saturday', 'monday', 'wednesday']);
  const [bulkApplyDays, setBulkApplyDays] = useState<boolean>(false);

  const bulkAssignMutation = useMutation({
    mutationFn: (payload: {
      customerIds: number[];
      assignedRepId?: number | null;
      assignedRepName?: string;
      route?: string;
      visitDays?: string[];
    }) => vanSalesApi.bulkAssignCustomerRoutes(payload),
    onSuccess: (res) => {
      toast.success(`تم التخصيص الجماعي بنجاح لـ (${res.updatedCount}) متجر/عميل!`);
      setBulkModalOpen(false);
      setSelectedCustomerIds([]);
      queryClient.invalidateQueries({ queryKey: ['van-supervisor-customer-routes'] });
      queryClient.invalidateQueries({ queryKey: ['van-supervisor-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل التخصيص الجماعي للمحلات');
    },
  });

  const handleToggleBulkDay = (dayId: string) => {
    setBulkVisitDays((prev) => (prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]));
  };

  // Selection helpers
  const isAllSelected = customerRoutes.length > 0 && selectedCustomerIds.length === customerRoutes.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customerRoutes.map((c) => c.customerId));
    }
  };

  const toggleSelectCustomer = (customerId: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId],
    );
  };

  // Repeated negative visits (3+)
  const repeatedNegativeVisits = useMemo(() => {
    return fieldVisits.filter((v) => v.consecutiveNegativeCount >= 3 || v.hasRepeatedNegativeAlert);
  }, [fieldVisits]);

  // Dropdown options for supervisor filters and assignment modals
  const repFilterOptions = useMemo(() => [
    { value: 'all', label: 'جميع المناديب' },
    { value: 'unassigned', label: 'المتاجر غير المخصصة لمندوب' },
    ...vanReps.map((r) => ({
      value: String(r.id),
      label: `${r.name}${r.phone ? ` (${r.phone})` : ''}`,
    })),
  ], [vanReps]);

  const routeFilterOptions = useMemo(() => [
    { value: 'all', label: 'جميع خطوط السير' },
    ...availableRoutes.map((r) => ({
      value: r,
      label: r,
    })),
  ], [availableRoutes]);

  const bulkRepOptions = useMemo(() => [
    { value: 'no_change', label: '— الإبقاء على المندوب الحالي لكل متجر (بدون تغيير) —' },
    { value: 'unassigned', label: 'إلغاء التخصيص (تفريغ المندوب من المحلات المختارة)' },
    ...vanReps.map((r) => ({
      value: String(r.id),
      label: `${r.name}${r.phone ? ` (${r.phone})` : ''}`,
    })),
  ], [vanReps]);

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
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s0', __t('delivery_reps.van_routes_kpi_admin_tab.s0', "الفترة:"))}</span>
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
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s1', __t('delivery_reps.van_routes_kpi_admin_tab.s1', "إلى"))}</span>
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
              {__t('delivery_reps.van_routes_kpi_admin_tab.s2', __t('delivery_reps.van_routes_kpi_admin_tab.s2', "إلغاء الفلتر"))}
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
            title={__t('delivery_reps.van_routes_kpi_admin_tab.s3', __t('delivery_reps.van_routes_kpi_admin_tab.s3', "تحديث بيانات خطوط السير والرقابة من السيرفر"))}
          >
            <RefreshCwIcon
              size={13}
              className={isRefreshing ? 'spin-animation' : undefined}
              style={isRefreshing ? { animation: 'spin 0.75s linear infinite' } : undefined}
            />
            {isRefreshing ? __t('delivery_reps.van_routes_kpi_admin_tab.s4', __t('delivery_reps.van_routes_kpi_admin_tab.s4', "جارٍ التحديث...")) : __t('delivery_reps.van_routes_kpi_admin_tab.s5', __t('delivery_reps.van_routes_kpi_admin_tab.s5', "تحديث البيانات"))}
          </Button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '12px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s6', __t('delivery_reps.van_routes_kpi_admin_tab.s6', "إجمالي الزيارات الميدانية"))}</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '4px' }}>
            {kpiData?.totalVisits ?? 0}
          </span>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            {kpiData?.positiveVisits ?? 0} {__t('delivery_reps.van_routes_kpi_admin_tab.s7', __t('delivery_reps.van_routes_kpi_admin_tab.s7', "ناجحة •"))} {kpiData?.negativeVisits ?? 0} {__t('delivery_reps.van_routes_kpi_admin_tab.s8', __t('delivery_reps.van_routes_kpi_admin_tab.s8', "سلبية"))}
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
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a', display: 'block' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s9', __t('delivery_reps.van_routes_kpi_admin_tab.s9', "نسبة الضربات الناجحة (Strike Rate)"))}</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {kpiData?.strikeRate ?? 0}%
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s10', __t('delivery_reps.van_routes_kpi_admin_tab.s10', "نسبة تحويل الزيارة إلى فاتورة بيع فعلية"))}</span>
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
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4338ca', display: 'block' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s11', __t('delivery_reps.van_routes_kpi_admin_tab.s11', "الالتزام بالنطاق الجغرافي (Geofence)"))}</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#170e5e', display: 'block', marginTop: '4px' }}>
            {kpiData?.geofenceComplianceRate ?? 100}%
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {__t('delivery_reps.van_routes_kpi_admin_tab.s12', __t('delivery_reps.van_routes_kpi_admin_tab.s12', "ضمن 300م:"))} {kpiData?.withinGeofenceCount ?? 0} {__t('delivery_reps.van_routes_kpi_admin_tab.s13', __t('delivery_reps.van_routes_kpi_admin_tab.s13', "• خارج النطاق:"))} {kpiData?.outOfGeofenceCount ?? 0}
          </span>
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
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#dc2626', display: 'block' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s14', __t('delivery_reps.van_routes_kpi_admin_tab.s14', "محلات سلبية متكررة (3+)"))}</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#b91c1c', display: 'block', marginTop: '4px' }}>
            {kpiData?.repeatedNegativeCustomersCount ?? 0}
          </span>
          <span style={{ fontSize: '11px', color: '#b91c1c' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s15', __t('delivery_reps.van_routes_kpi_admin_tab.s15', "محلات تتطلب تدخل المشرف فوراً"))}</span>
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
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', display: 'block' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s16', __t('delivery_reps.van_routes_kpi_admin_tab.s16', "استهلاك ومعدل وقود الأسطول"))}</span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#0369a1', display: 'block', marginTop: '4px' }}>
            {kpiData?.totalFuelLiters ?? 0} <span style={{ fontSize: '13px', fontWeight: 600 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s17', __t('delivery_reps.van_routes_kpi_admin_tab.s17', "لتر"))}</span>
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {__t('delivery_reps.van_routes_kpi_admin_tab.s18', __t('delivery_reps.van_routes_kpi_admin_tab.s18', "معدل الاستهلاك:"))} {kpiData?.avgConsumptionRate ?? 0} {__t('delivery_reps.van_routes_kpi_admin_tab.s19', __t('delivery_reps.van_routes_kpi_admin_tab.s19', "كم/لتر ("))}{kpiData?.totalFuelCost ?? 0} <CurrencySymbol />)
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
              {__t('delivery_reps.van_routes_kpi_admin_tab.s20', __t('delivery_reps.van_routes_kpi_admin_tab.s20', "تنبيه رقابي: محلات ومتاجر تكررت زياراتها السلبية (3 مرات فأكثر) دون شراء"))}
            </h4>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#be123c', lineHeight: 1.5 }}>
            {__t('delivery_reps.van_routes_kpi_admin_tab.s21', __t('delivery_reps.van_routes_kpi_admin_tab.s21', "وفقاً لسياسة التوزيع المؤسسية، المحل الذي يتم رفض الشراء منه 3 مرات متتالية يتم إخطار المشرف لإعادة دراسة الائتمان، فحص مسار الخط، أو التفاوض مع التاجر."))}
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
                  <span style={{ color: '#64748b', marginRight: '8px' }}>({v.customerPhone || __t('delivery_reps.van_routes_kpi_admin_tab.s22', __t('delivery_reps.van_routes_kpi_admin_tab.s22', "بدون هاتف"))})</span>
                  <span style={{ color: '#94a3b8', marginRight: '8px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s23', __t('delivery_reps.van_routes_kpi_admin_tab.s23', "خط:"))} {v.route || __t('delivery_reps.van_routes_kpi_admin_tab.s24', __t('delivery_reps.van_routes_kpi_admin_tab.s24', "عام"))}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#e11d48', fontWeight: 700 }}>{v.consecutiveNegativeCount} {__t('delivery_reps.van_routes_kpi_admin_tab.s25', __t('delivery_reps.van_routes_kpi_admin_tab.s25', "زيارات سلبية"))}</span>
                  <span style={{ background: '#fef2f2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    {__t('delivery_reps.van_routes_kpi_admin_tab.s26', __t('delivery_reps.van_routes_kpi_admin_tab.s26', "آخر سبب:"))} {NEGATIVE_REASON_LABELS[v.negativeReason] || v.negativeReason || __t('delivery_reps.van_routes_kpi_admin_tab.s27', __t('delivery_reps.van_routes_kpi_admin_tab.s27', "محل مغلق"))}
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
          {__t('delivery_reps.van_routes_kpi_admin_tab.s28', __t('delivery_reps.van_routes_kpi_admin_tab.s28', "شريط مناقلات سيارات الشارع ("))}{transfers.length})
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
          {__t('delivery_reps.van_routes_kpi_admin_tab.s29', __t('delivery_reps.van_routes_kpi_admin_tab.s29', "سجل الزيارات وأسباب الرفض ("))}{fieldVisits.length})
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
          {__t('delivery_reps.van_routes_kpi_admin_tab.s30', __t('delivery_reps.van_routes_kpi_admin_tab.s30', "تخصيص خطوط السير والمناديب ("))}{customerRoutes.length})
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
                {__t('delivery_reps.van_routes_kpi_admin_tab.s31', __t('delivery_reps.van_routes_kpi_admin_tab.s31', "شريط الرقابة المباشرة: مناقلات البضاعة بين سيارات التوزيع في الميدان"))}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s32', __t('delivery_reps.van_routes_kpi_admin_tab.s32', "توثيق فوري لأي عملية إسناد أو مناقلة بضاعة بين سيارتين في الشارع بموافقة الطرفين"))}
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#170e5e' }}>
              {__t('delivery_reps.van_routes_kpi_admin_tab.s33', __t('delivery_reps.van_routes_kpi_admin_tab.s33', "إجمالي الحركات:"))} {transfers.length}
            </span>
          </div>

          {isTransfersLoading ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s34', __t('delivery_reps.van_routes_kpi_admin_tab.s34', "جاري تحميل مناقلات الشارع..."))}</div>
          ) : transfers.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              {__t('delivery_reps.van_routes_kpi_admin_tab.s35', __t('delivery_reps.van_routes_kpi_admin_tab.s35', "لا توجد عمليات مناقلة بين السيارات حتى الآن اليوم."))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s36', __t('delivery_reps.van_routes_kpi_admin_tab.s36', "رقم المناقلة"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s37', __t('delivery_reps.van_routes_kpi_admin_tab.s37', "السيارة المصدر (المحوّل)"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s38', __t('delivery_reps.van_routes_kpi_admin_tab.s38', "اتجاه الحركة"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s39', __t('delivery_reps.van_routes_kpi_admin_tab.s39', "السيارة المستلمة"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s40', __t('delivery_reps.van_routes_kpi_admin_tab.s40', "الأصناف المنقولة"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s41', __t('delivery_reps.van_routes_kpi_admin_tab.s41', "إجمالي القطع"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s42', __t('delivery_reps.van_routes_kpi_admin_tab.s42', "الحالة"))}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s43', __t('delivery_reps.van_routes_kpi_admin_tab.s43', "التاريخ والوقت"))}</th>
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
                        <ArrowLeftIcon size={12} /> {__t('delivery_reps.van_routes_kpi_admin_tab.s44', __t('delivery_reps.van_routes_kpi_admin_tab.s44', "مناقلة"))}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {t.toRepName}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {t.items.slice(0, 2).map((it, idx) => (
                          <span key={idx} style={{ color: '#334155' }}>
                            • {it.productName} ({it.qty} {__t('delivery_reps.van_routes_kpi_admin_tab.s45', __t('delivery_reps.van_routes_kpi_admin_tab.s45', "قطعة)"))}
                          </span>
                        ))}
                        {t.items.length > 2 && (
                          <span style={{ fontSize: '10.5px', color: '#64748b' }}>+{t.items.length - 2} {__t('delivery_reps.van_routes_kpi_admin_tab.s46', __t('delivery_reps.van_routes_kpi_admin_tab.s46', "أصناف أخرى"))}</span>
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
                          ? __t('delivery_reps.van_routes_kpi_admin_tab.s47', __t('delivery_reps.van_routes_kpi_admin_tab.s47', "تم القبول والاستلام"))
                          : t.status === 'rejected'
                          ? __t('delivery_reps.van_routes_kpi_admin_tab.s48', __t('delivery_reps.van_routes_kpi_admin_tab.s48', "مرفوضة من المندوب"))
                          : __t('delivery_reps.van_routes_kpi_admin_tab.s49', __t('delivery_reps.van_routes_kpi_admin_tab.s49', "بانتظار موافقة المستلم"))}
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
                {__t('delivery_reps.van_routes_kpi_admin_tab.s50', __t('delivery_reps.van_routes_kpi_admin_tab.s50', "تحليل أسباب عدم الشراء (أسباب الزيارات السلبية):"))}
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
                      {count} <span style={{ fontSize: '11px', color: '#94a3b8' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s51', __t('delivery_reps.van_routes_kpi_admin_tab.s51', "زيارة"))}</span>
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
              <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s52', __t('delivery_reps.van_routes_kpi_admin_tab.s52', "جاري تحميل الزيارات..."))}</div>
            ) : fieldVisits.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s53', __t('delivery_reps.van_routes_kpi_admin_tab.s53', "لا توجد زيارات ميدانية مسجلة خلال الفترة المحددة."))}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s54', __t('delivery_reps.van_routes_kpi_admin_tab.s54', "المحل / العميل"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s55', __t('delivery_reps.van_routes_kpi_admin_tab.s55', "خط السير"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s56', __t('delivery_reps.van_routes_kpi_admin_tab.s56', "المندوب"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s57', __t('delivery_reps.van_routes_kpi_admin_tab.s57', "النتيجة"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s58', __t('delivery_reps.van_routes_kpi_admin_tab.s58', "السبب / الفاتورة"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s59', __t('delivery_reps.van_routes_kpi_admin_tab.s59', "النطاق الجغرافي (Geofence)"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s60', __t('delivery_reps.van_routes_kpi_admin_tab.s60', "تاريخ التأجيل"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s61', __t('delivery_reps.van_routes_kpi_admin_tab.s61', "توقيت الزيارة"))}</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldVisits.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{v.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{v.customerPhone || __t('delivery_reps.van_routes_kpi_admin_tab.s62', __t('delivery_reps.van_routes_kpi_admin_tab.s62', "بدون هاتف"))}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {v.route || __t('delivery_reps.van_routes_kpi_admin_tab.s63', __t('delivery_reps.van_routes_kpi_admin_tab.s63', "عام"))}
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
                          {v.visitType === 'positive' ? __t('delivery_reps.van_routes_kpi_admin_tab.s64', __t('delivery_reps.van_routes_kpi_admin_tab.s64', "إيجابية (تم البيع)")) : __t('delivery_reps.van_routes_kpi_admin_tab.s65', __t('delivery_reps.van_routes_kpi_admin_tab.s65', "سلبية (لم يشترِ)"))}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {v.visitType === 'positive' ? (
                          <span style={{ color: '#15803d', fontWeight: 700 }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s66', __t('delivery_reps.van_routes_kpi_admin_tab.s66', "فاتورة #"))}{v.saleDocNo || __t('delivery_reps.van_routes_kpi_admin_tab.s67', __t('delivery_reps.van_routes_kpi_admin_tab.s67', "مكتملة"))}</span>
                        ) : (
                          <span style={{ color: '#b91c1c' }}>
                            {NEGATIVE_REASON_LABELS[v.negativeReason] || v.negativeReason || __t('delivery_reps.van_routes_kpi_admin_tab.s68', __t('delivery_reps.van_routes_kpi_admin_tab.s68', "بدون سبب"))}
                          </span>
                        )}
                        {v.notes && <div style={{ fontSize: '11px', color: '#64748b' }}>{v.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                          {v.geofenceStatus === 'within_range' ? (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              {__t('delivery_reps.van_routes_kpi_admin_tab.s69', __t('delivery_reps.van_routes_kpi_admin_tab.s69', "ضمن النطاق ("))}{v.distanceMeters}{__t('delivery_reps.van_routes_kpi_admin_tab.s70', __t('delivery_reps.van_routes_kpi_admin_tab.s70', "م)"))}
                            </span>
                          ) : v.geofenceStatus === 'out_of_range' ? (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                              }}
                            >
                              {__t('delivery_reps.van_routes_kpi_admin_tab.s71', __t('delivery_reps.van_routes_kpi_admin_tab.s71', "خارج النطاق ("))}{v.distanceMeters}{__t('delivery_reps.van_routes_kpi_admin_tab.s72', __t('delivery_reps.van_routes_kpi_admin_tab.s72', "م)"))}
                            </span>
                          ) : v.gpsLat && v.gpsLng ? (
                            <span style={{ fontSize: '10px', color: '#64748b' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s73', __t('delivery_reps.van_routes_kpi_admin_tab.s73', "مسجل GPS (بدون إحداثيات محل)"))}</span>
                          ) : (
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>—</span>
                          )}
                          {v.gpsLat && v.gpsLng && (
                            <a
                              href={`https://www.google.com/maps?q=${v.gpsLat},${v.gpsLng}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}
                            >
                              {__t('delivery_reps.van_routes_kpi_admin_tab.s74', __t('delivery_reps.van_routes_kpi_admin_tab.s74', "فتح موقع المندوب"))}
                            </a>
                          )}
                        </div>
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

      {/* SECTION 3: Customer Route Scheduling & Rep Assignment */}
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
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s75', __t('delivery_reps.van_routes_kpi_admin_tab.s75', "تخصيص خطوط السير والمناديب للمتاجر والعملاء"))}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s76', __t('delivery_reps.van_routes_kpi_admin_tab.s76', "توزيع محلات التوزيع على مناديب الفان، تثبيت مسارات وخطوط السير، تسلسل الزيارة، وأيام التغطية الأسبوعية"))}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {routeFilter !== 'all' && (
                <Button
                  variant="primary"
                  onClick={handleOptimizeSupervisorRoute}
                  disabled={isOptimizingRoute}
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    height: '32px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title={__t('delivery_reps.van_routes_kpi_admin_tab.s77', __t('delivery_reps.van_routes_kpi_admin_tab.s77', "إعادة الترتيب التلقائي بأقصر مسار جغرافي لتوفير الوقود وحفظ التسلسل الدائم"))}
                >
                  <MapPinIcon size={14} />
                  {isOptimizingRoute ? __t('delivery_reps.van_routes_kpi_admin_tab.s78', __t('delivery_reps.van_routes_kpi_admin_tab.s78', "جاري التحسين...")) : `الترتيب الجغرافي الأمثل لخط «${routeFilter}» (TSP)`}
                </Button>
              )}
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {__t('delivery_reps.van_routes_kpi_admin_tab.s79', __t('delivery_reps.van_routes_kpi_admin_tab.s79', "إجمالي المتاجر:"))} {customerRoutes.length}
              </span>
            </div>
          </div>

          {/* Supervisor Filters Strip */}
          <div
            style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', minWidth: '200px', position: 'relative' }}>
              <input
                type="text"
                placeholder={__t('delivery_reps.van_routes_kpi_admin_tab.s80', __t('delivery_reps.van_routes_kpi_admin_tab.s80', "بحث باسم المحل، الكود، الهاتف، أو خط السير..."))}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#94a3b8',
                }}
              >
                <SearchIcon size={14} />
              </span>
            </div>

            {/* Rep Filter */}
            <div style={{ flex: '0 1 220px', minWidth: '180px' }}>
              <CustomSelect
                value={repFilter}
                onChange={(val) => setRepFilter(val as any)}
                options={repFilterOptions}
                placeholder={__t('delivery_reps.van_routes_kpi_admin_tab.s81', __t('delivery_reps.van_routes_kpi_admin_tab.s81', "فلترة بالمندوب..."))}
              />
            </div>

            {/* Route Filter */}
            <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
              <CustomSelect
                value={routeFilter}
                onChange={(val) => setRouteFilter(val as any)}
                options={routeFilterOptions}
                placeholder={__t('delivery_reps.van_routes_kpi_admin_tab.s82', __t('delivery_reps.van_routes_kpi_admin_tab.s82', "فلترة بالخط..."))}
              />
            </div>

            {/* Clear Filters Button (if active) */}
            {(customerSearch || repFilter !== 'all' || routeFilter !== 'all') && (
              <Button
                variant="secondary"
                style={{ fontSize: '11.5px', padding: '6px 12px' }}
                onClick={() => {
                  setCustomerSearch('');
                  setRepFilter('all');
                  setRouteFilter('all');
                }}
              >
                {__t('delivery_reps.van_routes_kpi_admin_tab.s83', __t('delivery_reps.van_routes_kpi_admin_tab.s83', "إعادة ضبط الفلاتر"))}
              </Button>
            )}
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedCustomerIds.length > 0 && (
            <div
              style={{
                padding: '10px 20px',
                background: '#eef2ff',
                borderBottom: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleIcon size={16} color="#3730a3" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#312e81' }}>
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s84', __t('delivery_reps.van_routes_kpi_admin_tab.s84', "تم تحديد"))} {selectedCustomerIds.length} {__t('delivery_reps.van_routes_kpi_admin_tab.s85', __t('delivery_reps.van_routes_kpi_admin_tab.s85', "متجر / عميل"))}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  style={{
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    fontSize: '12px',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                  onClick={() => {
                    setBulkRepId('no_change');
                    setBulkRouteInput('');
                    setBulkApplyDays(false);
                    setBulkVisitDays(['saturday', 'monday', 'wednesday']);
                    setBulkModalOpen(true);
                  }}
                >
                  <SlidersIcon size={13} />
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s86', __t('delivery_reps.van_routes_kpi_admin_tab.s86', "تخصيص جماعي للمندوب والخط ("))}{selectedCustomerIds.length})
                </Button>
                <Button
                  variant="secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setSelectedCustomerIds([])}
                >
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s87', __t('delivery_reps.van_routes_kpi_admin_tab.s87', "إلغاء التحديد"))}
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {isRoutesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              <RefreshCwIcon size={20} className="spin-animation" style={{ margin: '0 auto 10px', display: 'block' }} />
              {__t('delivery_reps.van_routes_kpi_admin_tab.s88', __t('delivery_reps.van_routes_kpi_admin_tab.s88', "جارٍ تحميل قائمة المحلات وبيانات التخصيص..."))}
            </div>
          ) : customerRoutes.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              {__t('delivery_reps.van_routes_kpi_admin_tab.s89', __t('delivery_reps.van_routes_kpi_admin_tab.s89', "لا توجد متاجر مطابقة لمعايير البحث والفلترة."))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', width: '38px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        title={__t('delivery_reps.van_routes_kpi_admin_tab.s90', __t('delivery_reps.van_routes_kpi_admin_tab.s90', "تحديد الكل"))}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, width: '90px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s91', __t('delivery_reps.van_routes_kpi_admin_tab.s91', "كود المحل"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '170px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s92', __t('delivery_reps.van_routes_kpi_admin_tab.s92', "اسم المحل / العميل"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '150px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s93', __t('delivery_reps.van_routes_kpi_admin_tab.s93', "المندوب المسؤول"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '130px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s94', __t('delivery_reps.van_routes_kpi_admin_tab.s94', "خط السير"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', width: '90px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s95', __t('delivery_reps.van_routes_kpi_admin_tab.s95', "الترتيب"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '160px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s96', __t('delivery_reps.van_routes_kpi_admin_tab.s96', "أيام الزيارة الأسبوعية"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'left', minWidth: '100px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s97', __t('delivery_reps.van_routes_kpi_admin_tab.s97', "رصيد المديونية"))}</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', width: '110px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s98', __t('delivery_reps.van_routes_kpi_admin_tab.s98', "الإجراءات"))}</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRoutes.map((c) => {
                    const isSelected = selectedCustomerIds.includes(c.customerId);
                    return (
                      <tr
                        key={c.customerId}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#f8fafc' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCustomer(c.customerId)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>
                          {c.customerCode ? c.customerCode.replace(/^#/, '') : `C-${String(c.customerId).padStart(4, '0')}`}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                            {c.customerName}
                          </div>
                          {(c.customerPhone || c.customerAddress) && (
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                              {c.customerPhone && <span>{c.customerPhone}</span>}
                              {c.customerPhone && c.customerAddress && <span>•</span>}
                              {c.customerAddress && <span>{c.customerAddress}</span>}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {Array.isArray(c.assignedRepNames) && c.assignedRepNames.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {c.assignedRepNames.map((rName, idx) => (
                                <span
                                  key={`${c.customerId}-rep-${idx}`}
                                  style={{
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '11.5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <TruckIcon size={12} />
                                  {rName}
                                </span>
                              ))}
                            </div>
                          ) : c.assignedRepName ? (
                            <span
                              style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '11.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <TruckIcon size={12} />
                              {c.assignedRepName}
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '11px',
                              }}
                            >
                              {__t('delivery_reps.van_routes_kpi_admin_tab.s99', __t('delivery_reps.van_routes_kpi_admin_tab.s99', "غير مخصص لمندوب"))}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '11.5px',
                            }}
                          >
                            {c.route || __t('delivery_reps.van_routes_kpi_admin_tab.s100', __t('delivery_reps.van_routes_kpi_admin_tab.s100', "غير محدد"))}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#170e5e' }}>
                          #{c.routeSequence || 1}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {((Array.isArray(c.visitDays) && c.visitDays.length > 0) ? c.visitDays : (c.visitDay ? [c.visitDay] : [])).length > 0 ? (
                              ((Array.isArray(c.visitDays) && c.visitDays.length > 0) ? c.visitDays : [c.visitDay!]).map((d: string) => {
                                const found = WEEKDAYS.find((w) => w.id === d || w.id === normalizeDayKey(d) || w.label === d);
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
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>{__t('delivery_reps.van_routes_kpi_admin_tab.s101', __t('delivery_reps.van_routes_kpi_admin_tab.s101', "يومياً / غير محدد"))}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'left', minWidth: '170px' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: Number(c.balance || 0) > 0 ? '#b91c1c' : '#15803d' }}>
                            {__t('delivery_reps.van_routes_kpi_admin_tab.s102', __t('delivery_reps.van_routes_kpi_admin_tab.s102', "إجمالي:"))} {Number(c.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <CurrencySymbol />
                          </div>
                          {Array.isArray(c.repBalances) && c.repBalances.filter((rb) => rb.balance !== 0).length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                              {c.repBalances
                                .filter((rb) => rb.balance !== 0)
                                .map((rb) => (
                                  <div
                                    key={`${c.customerId}-bal-${rb.repId}`}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '6px',
                                      background: '#fff1f2',
                                      border: '1px solid #fecdd3',
                                      borderRadius: '5px',
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      color: '#9f1239',
                                      fontWeight: 700,
                                    }}
                                  >
                                    <span>{rb.repName}:</span>
                                    <span>
                                      {Number(rb.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <CurrencySymbol />
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Button
                            variant="secondary"
                            style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => openScheduleModal(c)}
                          >
                            <EditIcon size={12} />
                            {__t('delivery_reps.van_routes_kpi_admin_tab.s103', __t('delivery_reps.van_routes_kpi_admin_tab.s103', "تعديل التخصيص"))}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Customer Route & Rep Modal */}
      {editingCustomer && (
        <StandardDialog
          open={Boolean(editingCustomer)}
          onClose={() => setEditingCustomer(null)}
          title={`تخصيص خط ومناديب: ${editingCustomer.customerName}`}
          subtitle={`كود المحل: [${editingCustomer.customerCode ? editingCustomer.customerCode.replace(/^#/, '') : `C-${String(editingCustomer.customerId).padStart(4, '0')}`}]`}
          maxWidth="620px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
            {/* Per-Rep Balance Breakdown Card for Supervisor */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s104', __t('delivery_reps.van_routes_kpi_admin_tab.s104', "إجمالي مديونية العميل للمنشأة:"))}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: Number(editingCustomer.balance || 0) > 0 ? '#b91c1c' : '#15803d' }}>
                  {Number(editingCustomer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <CurrencySymbol />
                </span>
              </div>
              {Array.isArray(editingCustomer.repBalances) && editingCustomer.repBalances.filter((rb) => rb.balance !== 0).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px', marginTop: '6px' }}>
                  {editingCustomer.repBalances
                    .filter((rb) => rb.balance !== 0)
                    .map((rb) => (
                      <div
                        key={`modal-bal-${rb.repId}`}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fecdd3',
                          borderRadius: '7px',
                          padding: '6px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11.5px',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{rb.repName}</span>
                        <span style={{ fontWeight: 800, color: '#be123c' }}>
                          {Number(rb.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <CurrencySymbol />
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s105', __t('delivery_reps.van_routes_kpi_admin_tab.s105', "لا توجد مديونيات مجزأة حالياً على المناديب لهذا العميل."))}
                </div>
              )}
            </div>

            {/* Assigned Reps Multi-Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s106', __t('delivery_reps.van_routes_kpi_admin_tab.s106', "مناديب الفان المسؤولون عن المحل (يمكن اختيار مندوب أو أكثر مع عزل حساب كل مندوب):"))}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '6px' }}>
                {vanReps.map((r) => {
                  const isSelectedRep = assignedRepIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleToggleRepAssignment(r.id)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '7px',
                        border: isSelectedRep ? '1px solid #170e5e' : '1px solid #cbd5e1',
                        background: isSelectedRep ? '#170e5e' : '#ffffff',
                        color: isSelectedRep ? '#ffffff' : '#334155',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      {isSelectedRep && <CheckIcon size={13} />}
                    </button>
                  );
                })}
              </div>
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s107', __t('delivery_reps.van_routes_kpi_admin_tab.s107', "حساب ومديونية وتحصيل كل مندوب مع المحل معزول تماماً عن المناديب الآخرين."))}
              </small>
            </div>

            {/* Route Name & Sequence in 2-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s108', __t('delivery_reps.van_routes_kpi_admin_tab.s108', "اسم خط السير (Route Name)"))} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={__t('delivery_reps.van_routes_kpi_admin_tab.s109', __t('delivery_reps.van_routes_kpi_admin_tab.s109', "مثال: خط الهرم والجيزة، خط فيصل..."))}
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
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s110', __t('delivery_reps.van_routes_kpi_admin_tab.s110', "الترتيب التسلسلي بالخط"))}
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
              </div>
            </div>

            {/* Weekly Visit Days */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s111', __t('delivery_reps.van_routes_kpi_admin_tab.s111', "أيام الزيارة الأسبوعية المحددة:"))}
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
                        padding: '7px 4px',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid #170e5e' : '1px solid #cbd5e1',
                        background: isChecked ? '#170e5e' : '#f8fafc',
                        color: isChecked ? '#ffffff' : '#334155',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      {isChecked && <CheckIcon size={12} />}
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setEditingCustomer(null)}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s112', __t('delivery_reps.van_routes_kpi_admin_tab.s112', "إلغاء"))}
              </Button>
              <Button
                variant="primary"
                disabled={scheduleMutation.isPending}
                onClick={() => {
                  const primaryRepId = assignedRepIds.length > 0 ? assignedRepIds[0] : (assignedRepId ? parseInt(assignedRepId, 10) : null);
                  const repNames = assignedRepIds
                    .map((id) => vanReps.find((r) => r.id === id)?.name)
                    .filter(Boolean)
                    .join(__t('delivery_reps.van_routes_kpi_admin_tab.s113', __t('delivery_reps.van_routes_kpi_admin_tab.s113', " ، ")));

                  scheduleMutation.mutate({
                    customerId: editingCustomer.customerId,
                    route: routeInput.trim() || __t('delivery_reps.van_routes_kpi_admin_tab.s114', __t('delivery_reps.van_routes_kpi_admin_tab.s114', "غير محدد")),
                    routeSequence: parseInt(sequenceInput, 10) || 1,
                    visitDays: selectedDays.map((d) => DAY_KEY_TO_ARABIC[d] || d),
                    assignedRepId: primaryRepId,
                    assignedRepIds,
                    assignedRepName: repNames || undefined,
                  });
                }}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {scheduleMutation.isPending ? __t('delivery_reps.van_routes_kpi_admin_tab.s115', __t('delivery_reps.van_routes_kpi_admin_tab.s115', "جاري الحفظ...")) : __t('delivery_reps.van_routes_kpi_admin_tab.s116', __t('delivery_reps.van_routes_kpi_admin_tab.s116', "حفظ التخصيص"))}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Bulk Customer Assignment Modal */}
      {bulkModalOpen && (
        <StandardDialog
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          title={__t('delivery_reps.van_routes_kpi_admin_tab.s117', __t('delivery_reps.van_routes_kpi_admin_tab.s117', "تخصيص جماعي لخطوط السير والمناديب"))}
          subtitle={`تعديل موحد لـ (${selectedCustomerIds.length}) متجر تم تحديدهم`}
          maxWidth="540px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              {__t('delivery_reps.van_routes_kpi_admin_tab.s118', __t('delivery_reps.van_routes_kpi_admin_tab.s118', "سيتم تطبيق التعديلات المحددة أدناه على كافة المحلات المختارة ("))}{selectedCustomerIds.length} {__t('delivery_reps.van_routes_kpi_admin_tab.s119', __t('delivery_reps.van_routes_kpi_admin_tab.s119', "متجر) دفعة واحدة.\n              الحقول التي تترك دون تغيير ستحتفظ بقيمها الحالية في كل محل."))}
            </div>

            {/* Bulk Assigned Rep */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s120', __t('delivery_reps.van_routes_kpi_admin_tab.s120', "تخصيص مندوب الفان المسؤول:"))}
              </label>
              <CustomSelect
                value={bulkRepId}
                onChange={(val) => setBulkRepId(val)}
                options={bulkRepOptions}
                placeholder={__t('delivery_reps.van_routes_kpi_admin_tab.s121', __t('delivery_reps.van_routes_kpi_admin_tab.s121', "اختر الإجراء للمندوب..."))}
              />
            </div>

            {/* Bulk Route Input */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s122', __t('delivery_reps.van_routes_kpi_admin_tab.s122', "توحيد اسم خط السير (اختياري):"))}
              </label>
              <input
                type="text"
                placeholder={__t('delivery_reps.van_routes_kpi_admin_tab.s123', __t('delivery_reps.van_routes_kpi_admin_tab.s123', "اترك فارغاً للإبقاء على خط السير الحالي لكل متجر..."))}
                value={bulkRouteInput}
                onChange={(e) => setBulkRouteInput(e.target.value)}
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

            {/* Bulk Weekly Visit Days Override */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={bulkApplyDays}
                  onChange={(e) => setBulkApplyDays(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  {__t('delivery_reps.van_routes_kpi_admin_tab.s124', __t('delivery_reps.van_routes_kpi_admin_tab.s124', "تطبيق أيام زيارة موحدة على المحلات المختارة"))}
                </span>
              </label>

              {bulkApplyDays && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
                  {WEEKDAYS.map((w) => {
                    const isChecked = bulkVisitDays.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleToggleBulkDay(w.id)}
                        style={{
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: isChecked ? '1px solid #170e5e' : '1px solid #cbd5e1',
                          background: isChecked ? '#170e5e' : '#f8fafc',
                          color: isChecked ? '#ffffff' : '#334155',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        {isChecked && <CheckIcon size={12} />}
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="secondary" onClick={() => setBulkModalOpen(false)}>
                {__t('delivery_reps.van_routes_kpi_admin_tab.s125', __t('delivery_reps.van_routes_kpi_admin_tab.s125', "إلغاء"))}
              </Button>
              <Button
                variant="primary"
                disabled={bulkAssignMutation.isPending}
                onClick={() => {
                  let repId: number | null | undefined = undefined;
                  let repName: string | undefined = undefined;

                  if (bulkRepId === 'unassigned') {
                    repId = null;
                    repName = '';
                  } else if (bulkRepId !== 'no_change') {
                    const found = vanReps.find((r) => String(r.id) === bulkRepId);
                    if (found) {
                      repId = found.id;
                      repName = found.name;
                    }
                  }

                  bulkAssignMutation.mutate({
                    customerIds: selectedCustomerIds,
                    assignedRepId: repId,
                    assignedRepName: repName,
                    route: bulkRouteInput.trim() ? bulkRouteInput.trim() : undefined,
                    visitDays: bulkApplyDays ? bulkVisitDays.map((d) => DAY_KEY_TO_ARABIC[d] || d) : undefined,
                  });
                }}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {bulkAssignMutation.isPending ? __t('delivery_reps.van_routes_kpi_admin_tab.s126', __t('delivery_reps.van_routes_kpi_admin_tab.s126', "جاري التنفيذ...")) : `تطبيق على (${selectedCustomerIds.length}) متجر`}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
