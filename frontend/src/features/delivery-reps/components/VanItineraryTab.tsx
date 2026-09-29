import React, { useState, useMemo, useEffect } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, VanCustomerItineraryItem } from '../api/van-sales.api';
import { MapPinIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SearchIcon, PhoneIcon, ArrowRightIcon, ArrowLeftIcon, CalendarIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';

interface VanItineraryTabProps {
  itinerary: VanCustomerItineraryItem[];
  tripId?: number;
  onSelectCustomerForSale: (customerId: number) => void;
  onRefreshItinerary: () => void;
  isLoading?: boolean;
}

export const VanItineraryTab: React.FC<VanItineraryTabProps> = ({
  itinerary,
  tripId,
  onSelectCustomerForSale,
  onRefreshItinerary,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'positive' | 'negative'>('all');
  const [dayFilter, setDayFilter] = useState<'today' | 'all' | string>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const arabicDayNames = useMemo(() => ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], []);
  const todayArabicName = useMemo(() => {
    return itinerary[0]?.currentDayName || arabicDayNames[new Date().getDay()];
  }, [itinerary, arabicDayNames]);

  // Check if any shops have scheduled visit days
  const hasScheduledShops = useMemo(() => {
    return itinerary.some((i) => (i.visitDays && i.visitDays.length > 0) || i.visitDay);
  }, [itinerary]);

  const todayCount = useMemo(() => {
    if (!hasScheduledShops) return itinerary.length;
    return itinerary.filter(
      (i) => i.isScheduledToday || i.visitDay === todayArabicName || i.visitDays?.includes(todayArabicName),
    ).length;
  }, [itinerary, hasScheduledShops, todayArabicName]);

  // Reset pagination to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, routeFilter, statusFilter, dayFilter]);

  // Negative visit modal state
  const [negativeModalOpen, setNegativeModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<VanCustomerItineraryItem | null>(null);
  const [negativeReason, setNegativeReason] = useState<
    'no_cash' | 'shop_closed' | 'sufficient_stock' | 'item_unavailable' | 'postponed' | 'other'
  >('shop_closed');
  const [postponedDate, setPostponedDate] = useState('');
  const [negativeNotes, setNegativeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique routes
  const routes = useMemo(() => {
    return Array.from(new Set(itinerary.map((i) => i.route).filter(Boolean)));
  }, [itinerary]);

  const filtered = useMemo(() => {
    return itinerary.filter((item) => {
      // Day / schedule filter
      if (dayFilter === 'today' && hasScheduledShops) {
        const isToday =
          item.isScheduledToday ||
          item.visitDay === todayArabicName ||
          (item.visitDays && item.visitDays.includes(todayArabicName));
        if (!isToday) return false;
      } else if (dayFilter !== 'today' && dayFilter !== 'all') {
        const matchesDay =
          item.visitDay === dayFilter || (item.visitDays && item.visitDays.includes(dayFilter));
        if (!matchesDay) return false;
      }

      if (statusFilter !== 'all' && item.visitStatus !== statusFilter) return false;
      if (routeFilter !== 'all' && item.route !== routeFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.customerCode.toLowerCase().includes(q) ||
        item.customerPhone.includes(q) ||
        item.route.toLowerCase().includes(q)
      );
    });
  }, [itinerary, dayFilter, hasScheduledShops, todayArabicName, statusFilter, routeFilter, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(() => {
    return filtered.slice(startIdx, startIdx + pageSize);
  }, [filtered, startIdx, pageSize]);

  const openNegativeVisitModal = (customer: VanCustomerItineraryItem) => {
    setActiveCustomer(customer);
    setNegativeReason('shop_closed');
    setPostponedDate('');
    setNegativeNotes('');
    setNegativeModalOpen(true);
  };

  const handleSubmitNegativeVisit = async () => {
    if (!activeCustomer) return;
    if (!tripId) {
      toast.warning('يرجى بدء رحلة التوزيع أولاً لتسجيل الزيارات الميدانية');
      return;
    }

    if (negativeReason === 'postponed' && !postponedDate) {
      toast.warning('يرجى تحديد تاريخ تأجيل الزيارة');
      return;
    }

    setIsSubmitting(true);
    let lat: number | undefined;
    let lng: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS optional if timed out or rejected
      }
    }

    try {
      const res = await vanSalesApi.recordFieldVisit({
        tripId,
        customerId: activeCustomer.customerId,
        visitType: 'negative',
        negativeReason,
        postponedToDate: negativeReason === 'postponed' ? postponedDate : undefined,
        gpsLat: lat,
        gpsLng: lng,
        notes: negativeNotes.trim() || undefined,
      });

      if (res.consecutiveNegativeAlert) {
        toast.warning(
          `تنبيه: تكررت الزيارة السلبية للمرة الثالثة على التوالي للمحل (${activeCustomer.customerName}) - تم إشعار الإدارة تلقائياً`,
        );
      } else {
        toast.success(`تم تسجيل الزيارة السلبية للمحل: ${activeCustomer.customerName}`);
      }

      setNegativeModalOpen(false);
      onRefreshItinerary();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل الزيارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'no_cash':
        return 'مفيش نقدية / رفض الدفع';
      case 'shop_closed':
        return 'المحل مغلق';
      case 'sufficient_stock':
        return 'لديه بضاعة كافية';
      case 'item_unavailable':
        return 'الصنف المطلوب غير متوفر بالسيارة';
      case 'postponed':
        return 'تأجيل الزيارة';
      default:
        return 'أسباب أخرى';
    }
  };

  // KPIs
  const total = itinerary.length;
  const positiveCount = itinerary.filter((i) => i.visitStatus === 'positive').length;
  const negativeCount = itinerary.filter((i) => i.visitStatus === 'negative').length;
  const pendingCount = total - positiveCount - negativeCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
      {/* Unified High-Density Itinerary Toolbar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '8px 10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* Row 1: Visit Status Quick Filters (Height 28px) */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', textAlign: 'center', width: '100%' }}>
          <div
            onClick={() => setStatusFilter((prev) => (prev === 'positive' ? 'all' : 'positive'))}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              backgroundColor: statusFilter === 'positive' ? '#d1fae5' : '#f0fdf4',
              borderRadius: '6px',
              padding: '2px 4px',
              border: statusFilter === 'positive' ? '1.5px solid #059669' : '1px solid #bbf7d0',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '28px',
            }}
            title="المحلات التي تم البيع لها"
          >
            <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700, whiteSpace: 'nowrap' }}>تم البيع:</span>
            <strong style={{ fontSize: '12px', fontWeight: 900, color: '#15803d' }}>{positiveCount}</strong>
          </div>

          <div
            onClick={() => setStatusFilter((prev) => (prev === 'negative' ? 'all' : 'negative'))}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              backgroundColor: statusFilter === 'negative' ? '#fee2e2' : '#fef2f2',
              borderRadius: '6px',
              padding: '2px 4px',
              border: statusFilter === 'negative' ? '1.5px solid #dc2626' : '1px solid #fecaca',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '28px',
            }}
            title="الزيارات السلبية"
          >
            <span style={{ fontSize: '10px', color: '#991b1b', fontWeight: 700, whiteSpace: 'nowrap' }}>سلبية:</span>
            <strong style={{ fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>{negativeCount}</strong>
          </div>

          <div
            onClick={() => setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              backgroundColor: statusFilter === 'pending' ? '#e2e8f0' : '#f8fafc',
              borderRadius: '6px',
              padding: '2px 4px',
              border: statusFilter === 'pending' ? '1.5px solid #334155' : '1px solid #e2e8f0',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '28px',
            }}
            title="المحلات المتبقية للزيارة"
          >
            <span style={{ fontSize: '10px', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>متبقي:</span>
            <strong style={{ fontSize: '12px', fontWeight: 900, color: '#1e293b' }}>{pendingCount}</strong>
          </div>
        </div>

        {/* Row 2: Day Filter Segment Switcher (اليوم vs الكل vs يوم آخر) */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', width: '100%', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setDayFilter('today')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '3px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: dayFilter === 'today' ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
              backgroundColor: dayFilter === 'today' ? '#170e5e' : '#f8fafc',
              color: dayFilter === 'today' ? '#ffffff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '30px',
            }}
          >
            <CalendarIcon size={12} />
            <span style={{ whiteSpace: 'nowrap' }}>اليوم ({todayArabicName})</span>
            <span
              style={{
                backgroundColor: dayFilter === 'today' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: dayFilter === 'today' ? '#ffffff' : '#475569',
                padding: '0 4px',
                borderRadius: '6px',
                fontSize: '9.5px',
                fontWeight: 800,
              }}
            >
              {todayCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDayFilter('all')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '3px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: dayFilter === 'all' ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
              backgroundColor: dayFilter === 'all' ? '#170e5e' : '#f8fafc',
              color: dayFilter === 'all' ? '#ffffff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '30px',
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>كافة المحلات</span>
            <span
              style={{
                backgroundColor: dayFilter === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: dayFilter === 'all' ? '#ffffff' : '#475569',
                padding: '0 4px',
                borderRadius: '6px',
                fontSize: '9.5px',
                fontWeight: 800,
              }}
            >
              {total}
            </span>
          </button>

          <div style={{ width: '90px', flexShrink: 0 }}>
            <CustomSelect
              value={dayFilter !== 'today' && dayFilter !== 'all' ? dayFilter : ''}
              onChange={(val) => setDayFilter(val || 'all')}
              dropdownAlign="left"
              options={[
                { value: '', label: 'كافة الأيام' },
                ...arabicDayNames.map((d) => ({ value: d, label: `يوم ${d}` })),
              ]}
              placeholder="يوم..."
              style={{ height: '30px', fontSize: '11px' }}
            />
          </div>
        </div>

        {/* Row 3: Compact Search & Route Filter */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المحل، الكود، أو الهاتف..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 10px 5px 28px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                height: '32px',
              }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8' }}>
              <SearchIcon size={13} />
            </span>
          </div>

          {routes.length > 1 && (
            <div style={{ minWidth: '90px', maxWidth: '110px' }}>
              <CustomSelect
                value={routeFilter}
                onChange={(val) => setRouteFilter(val || 'all')}
                dropdownAlign="left"
                options={[
                  { value: 'all', label: 'كافة الخطوط' },
                  ...routes.map((r) => ({ value: r, label: r })),
                ]}
                placeholder="الخط"
                style={{ height: '32px', fontSize: '11.5px' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Active filter badge / reset */}
      {statusFilter !== 'all' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f1f5f9',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11.5px',
            color: '#334155',
            border: '1px solid #e2e8f0',
          }}
        >
          <span>
            تصفية نشطة:{' '}
            <strong>
              {statusFilter === 'pending'
                ? 'المحلات المتبقية فقط'
                : statusFilter === 'positive'
                ? 'المحلات التي تم البيع لها'
                : 'الزيارات السلبية'}
            </strong>{' '}
            ({filtered.length} محل)
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: 0,
            }}
          >
            إلغاء التصفية وعرض الكل
          </button>
        </div>
      )}

      {/* Customers List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
          جاري تحميل خط السير...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '30px 16px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
          }}
        >
          لا توجد محلات مسجلة تطابق معايير البحث
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {paginatedItems.map((item, idx) => {
            const isPositive = item.visitStatus === 'positive';
            const isNegative = item.visitStatus === 'negative';
            const isPending = item.visitStatus === 'pending';
            const itemNumber = startIdx + idx + 1;

            return (
              <div
                key={item.customerId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: isPositive
                    ? '1.5px solid #10b981'
                    : isNegative
                    ? '1.5px solid #f87171'
                    : '1px solid #e2e8f0',
                  padding: '7px 10px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {/* Header: Sequence, Code, Name, Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        backgroundColor: '#170e5e',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        width: '20px',
                        height: '20px',
                        borderRadius: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {itemNumber}
                    </span>
                    <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 800, color: '#0369a1', flexShrink: 0 }}>
                      [{item.customerCode}]
                    </span>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.customerName}
                    >
                      {item.customerName}
                    </h4>
                  </div>

                  {/* Status Badge */}
                  <div style={{ flexShrink: 0 }}>
                    {isPositive && (
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #a7f3d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <CheckCircleIcon size={11} color="#047857" />
                        <span>تم البيع</span>
                      </span>
                    )}
                    {isNegative && (
                      <span
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#b91c1c',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #fecaca',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <XCircleIcon size={11} color="#b91c1c" />
                        <span>سلبية</span>
                      </span>
                    )}
                    {isPending && (
                      <span
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <ClockIcon size={11} color="#64748b" />
                        <span>بالانتظار</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Repeated Negative Alert Badge */}
                {item.hasRepeatedNegativeAlert && (
                  <div
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangleIcon size={12} color="#b45309" />
                    <span>تنبيه: {item.repeatedNegativesCount} زيارات سابقة بدون بيع</span>
                  </div>
                )}

                {/* Sub-info: Phone, Route, Debt */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {item.customerPhone && (
                      <a
                        href={`tel:${item.customerPhone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#170e5e',
                          backgroundColor: '#eef2ff',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '10.5px',
                          textDecoration: 'none',
                          border: '1px solid #c7d2fe',
                        }}
                      >
                        <PhoneIcon size={11} />
                        <span dir="ltr">{item.customerPhone}</span>
                      </a>
                    )}
                    {item.locationUrl && (
                      <a
                        href={item.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#0369a1',
                          backgroundColor: '#e0f2fe',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '10.5px',
                          textDecoration: 'none',
                          border: '1px solid #bae6fd',
                        }}
                      >
                        <MapPinIcon size={11} />
                        <span>خريطة</span>
                      </a>
                    )}
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>{item.route}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '10.5px' }}>المديونية: </span>
                    <strong style={{ color: item.balance > 0 ? '#b91c1c' : '#047857', fontSize: '11.5px' }}>
                      {item.balance.toFixed(0)} <CurrencySymbol />
                    </strong>
                  </div>
                </div>

                {/* If already visited: show visit outcome details */}
                {item.todayVisit && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', color: '#475569', border: '1px solid #e2e8f0' }}>
                    {item.todayVisit.visitType === 'positive' ? (
                      <span>
                        فاتورة #{item.todayVisit.saleDocNo} بمبلغ <strong>{item.todayVisit.saleTotal} <CurrencySymbol /></strong>
                      </span>
                    ) : (
                      <span>
                        السبب: <strong>{getReasonLabel(item.todayVisit.negativeReason)}</strong>
                        {item.todayVisit.postponedToDate && ` (تم التأجيل إلى: ${item.todayVisit.postponedToDate})`}
                        {item.todayVisit.notes && ` — "${item.todayVisit.notes}"`}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions: Direct Sale vs Record Negative Visit */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <Button
                    variant="primary"
                    onClick={() => onSelectCustomerForSale(item.customerId)}
                    style={{
                      flex: 1,
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      minHeight: '30px',
                      height: '30px',
                      padding: '0 8px',
                    }}
                  >
                    + فاتورة بيع
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => openNegativeVisitModal(item)}
                    style={{
                      fontSize: '11px',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      minHeight: '30px',
                      height: '30px',
                      padding: '0 8px',
                    }}
                  >
                    زيارة سلبية
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > pageSize && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
            عرض {startIdx + 1} - {Math.min(startIdx + pageSize, filtered.length)} من أصل {filtered.length} محلاً
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              style={{ fontSize: '12px', padding: '4px 10px', height: '30px' }}
            >
              <ArrowRightIcon size={13} style={{ marginInlineEnd: '4px' }} />
              السابق
            </Button>

            <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', padding: '0 6px' }}>
              {currentPage} / {totalPages}
            </span>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              style={{ fontSize: '12px', padding: '4px 10px', height: '30px' }}
            >
              التالي
              <ArrowLeftIcon size={13} style={{ marginInlineStart: '4px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Negative Visit Dialog */}
      {negativeModalOpen && activeCustomer && (
        <StandardDialog
          open={true}
          onClose={() => setNegativeModalOpen(false)}
          title="تسجيل زيارة سلبية للمحل"
          subtitle={`${activeCustomer.customerName} [${activeCustomer.customerCode}]`}
          badge="خط السير الميداني"
          width="min(460px, 95vw)"
          footerActions={
            <StandardDialogFooter
              onClose={() => setNegativeModalOpen(false)}
              cancelText="إلغاء"
              extraActions={
                <Button
                  variant="primary"
                  onClick={handleSubmitNegativeVisit}
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '12.5px', fontWeight: 800 }}
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ الزيارة السلبية'}
                </Button>
              }
            />
          }
        >
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                سبب عدم إتمام البيع:
              </label>
              <CustomSelect
                value={negativeReason}
                onChange={(val) => setNegativeReason(val as any)}
                options={[
                  { value: 'shop_closed', label: 'المحل مغلق' },
                  { value: 'no_cash', label: 'مفيش نقدية / رفض الدفع' },
                  { value: 'sufficient_stock', label: 'لديه بضاعة كافية' },
                  { value: 'item_unavailable', label: 'الصنف المطلوب غير متوفر بالسيارة' },
                  { value: 'postponed', label: 'تأجيل الزيارة لموعد لاحق' },
                  { value: 'other', label: 'أسباب أخرى' },
                ]}
                placeholder="اختر سبب الزيارة السلبية"
              />
            </div>

            {negativeReason === 'postponed' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                  تاريخ التأجيل المقترح:
                </label>
                <input
                  type="date"
                  value={postponedDate}
                  onChange={(e) => setPostponedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #93c5fd',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                ملاحظات المندوب الميدانية:
              </label>
              <textarea
                value={negativeNotes}
                onChange={(e) => setNegativeNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية حول سبب الزيارة..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '11px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MapPinIcon size={14} color="#0284c7" />
              <span>سيتم التقاط إحداثيات الموقع الجغرافي (GPS) تلقائياً لتوثيق وصول المندوب للمحل.</span>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
};
