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

  const scheduleMutation = useMutation({
    mutationFn: (payload: {
      customerId: number;
      route: string;
      routeSequence: number;
      visitDays: string[];
      assignedRepId?: number | null;
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
    setSelectedDays(Array.isArray(customer.visitDays) && customer.visitDays.length > 0 ? customer.visitDays : ['saturday', 'monday', 'wednesday']);
    setAssignedRepId(customer.assignedRepId ? String(customer.assignedRepId) : '');
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

  const singleRepOptions = useMemo(() => [
    { value: '', label: '— بدون مندوب (غير مخصص) —' },
    ...vanReps.map((r) => ({
      value: String(r.id),
      label: `${r.name}${r.phone ? ` (${r.phone})` : ''}`,
    })),
  ], [vanReps]);

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
          تخصيص خطوط السير والمناديب ({customerRoutes.length})
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
                تخصيص خطوط السير والمناديب للمتاجر والعملاء
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                توزيع محلات التوزيع على مناديب الفان، تثبيت مسارات وخطوط السير، تسلسل الزيارة، وأيام التغطية الأسبوعية
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                إجمالي المتاجر: {customerRoutes.length}
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
                placeholder="بحث باسم المحل، الكود، الهاتف، أو خط السير..."
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
                placeholder="فلترة بالمندوب..."
              />
            </div>

            {/* Route Filter */}
            <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
              <CustomSelect
                value={routeFilter}
                onChange={(val) => setRouteFilter(val as any)}
                options={routeFilterOptions}
                placeholder="فلترة بالخط..."
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
                إعادة ضبط الفلاتر
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
                  تم تحديد {selectedCustomerIds.length} متجر / عميل
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
                  تخصيص جماعي للمندوب والخط ({selectedCustomerIds.length})
                </Button>
                <Button
                  variant="secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setSelectedCustomerIds([])}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {isRoutesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              <RefreshCwIcon size={20} className="spin-animation" style={{ margin: '0 auto 10px', display: 'block' }} />
              جارٍ تحميل قائمة المحلات وبيانات التخصيص...
            </div>
          ) : customerRoutes.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              لا توجد متاجر مطابقة لمعايير البحث والفلترة.
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
                        title="تحديد الكل"
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, width: '90px' }}>كود المحل</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '170px' }}>اسم المحل / العميل</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '150px' }}>المندوب المسؤول</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '130px' }}>خط السير</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', width: '90px' }}>الترتيب</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, minWidth: '160px' }}>أيام الزيارة الأسبوعية</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'left', minWidth: '100px' }}>رصيد المديونية</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', width: '110px' }}>الإجراءات</th>
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
                          {c.assignedRepName ? (
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
                              غير مخصص لمندوب
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
                            {c.route || 'غير محدد'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#170e5e' }}>
                          #{c.routeSequence || 1}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {Array.isArray(c.visitDays) && c.visitDays.length > 0 ? (
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
                        <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: Number(c.balance || 0) > 0 ? '#b91c1c' : '#15803d' }}>
                          {Number(c.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <CurrencySymbol />
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Button
                            variant="secondary"
                            style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => openScheduleModal(c)}
                          >
                            <EditIcon size={12} />
                            تعديل التخصيص
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
          title={`تخصيص خط ومندوب: ${editingCustomer.customerName}`}
          subtitle={`كود المحل: [${editingCustomer.customerCode ? editingCustomer.customerCode.replace(/^#/, '') : `C-${String(editingCustomer.customerId).padStart(4, '0')}`}]`}
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            {/* Assigned Rep Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مندوب الفان المسؤول (Assigned Rep):
              </label>
              <CustomSelect
                value={assignedRepId}
                onChange={(val) => setAssignedRepId(val)}
                options={singleRepOptions}
                placeholder="اختر مندوب الفان المسؤول عن المتجر..."
              />
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                عند تخصيص مندوب، سيظهر هذا المحل حصرياً في خطة زيارات وتطبيق هذا المندوب.
              </small>
            </div>

            {/* Route Name */}
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

            {/* Sequence in Route */}
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

            {/* Weekly Visit Days */}
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setEditingCustomer(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                disabled={scheduleMutation.isPending}
                onClick={() => {
                  const repObj = vanReps.find((r) => String(r.id) === assignedRepId);
                  const repName = repObj ? repObj.name : undefined;
                  const repIdNum = assignedRepId ? parseInt(assignedRepId, 10) : null;

                  scheduleMutation.mutate({
                    customerId: editingCustomer.customerId,
                    route: routeInput.trim() || 'غير محدد',
                    routeSequence: parseInt(sequenceInput, 10) || 1,
                    visitDays: selectedDays,
                    assignedRepId: repIdNum,
                    assignedRepName: repName,
                  });
                }}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {scheduleMutation.isPending ? 'جاري الحفظ...' : 'حفظ التخصيص'}
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
          title="تخصيص جماعي لخطوط السير والمناديب"
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
              سيتم تطبيق التعديلات المحددة أدناه على كافة المحلات المختارة ({selectedCustomerIds.length} متجر) دفعة واحدة.
              الحقول التي تترك دون تغيير ستحتفظ بقيمها الحالية في كل محل.
            </div>

            {/* Bulk Assigned Rep */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                تخصيص مندوب الفان المسؤول:
              </label>
              <CustomSelect
                value={bulkRepId}
                onChange={(val) => setBulkRepId(val)}
                options={bulkRepOptions}
                placeholder="اختر الإجراء للمندوب..."
              />
            </div>

            {/* Bulk Route Input */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                توحيد اسم خط السير (اختياري):
              </label>
              <input
                type="text"
                placeholder="اترك فارغاً للإبقاء على خط السير الحالي لكل متجر..."
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
                  تطبيق أيام زيارة موحدة على المحلات المختارة
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
                إلغاء
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
                    visitDays: bulkApplyDays ? bulkVisitDays : undefined,
                  });
                }}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {bulkAssignMutation.isPending ? 'جاري التنفيذ...' : `تطبيق على (${selectedCustomerIds.length}) متجر`}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
