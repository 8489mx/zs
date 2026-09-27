import React, { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, VanCustomerItineraryItem } from '../api/van-sales.api';
import { MapPinIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SearchIcon, PhoneIcon } from '@/shared/components/icons/AppIcons';

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
  const routes = Array.from(new Set(itinerary.map((i) => i.route).filter(Boolean)));

  const filtered = itinerary.filter((item) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Route Progress Summary */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '12px 14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e' }}>خط سير اليوم والزيارات الميدانية</span>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>
            إجمالي المحلات: <strong>{total}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '6px 8px', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: '10.5px', color: '#065f46', fontWeight: 700, display: 'block' }}>تم البيع (إيجابية)</span>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#047857' }}>{positiveCount}</span>
          </div>
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '6px 8px', border: '1px solid #fecaca' }}>
            <span style={{ fontSize: '10.5px', color: '#991b1b', fontWeight: 700, display: 'block' }}>زيارة سلبية</span>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#b91c1c' }}>{negativeCount}</span>
          </div>
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '6px 8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700, display: 'block' }}>متبقي للزيارة</span>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المحل، الكود، أو الهاتف..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px 8px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }}>
            <SearchIcon size={14} />
          </span>
        </div>

        {routes.length > 1 && (
          <div style={{ minWidth: '130px' }}>
            <CustomSelect
              value={routeFilter}
              onChange={(val) => setRouteFilter(val || 'all')}
              options={[
                { value: 'all', label: 'كافة الخطوط' },
                ...routes.map((r) => ({ value: r, label: r })),
              ]}
              placeholder="الخط"
            />
          </div>
        )}
      </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((item, idx) => {
            const isPositive = item.visitStatus === 'positive';
            const isNegative = item.visitStatus === 'negative';
            const isPending = item.visitStatus === 'pending';

            return (
              <div
                key={item.customerId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: isPositive
                    ? '1.5px solid #10b981'
                    : isNegative
                    ? '1.5px solid #f87171'
                    : '1px solid #e2e8f0',
                  padding: '12px 14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Header: Sequence, Code, Name, Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#170e5e',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#0369a1' }}>
                          [{item.customerCode}]
                        </span>
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                          {item.customerName}
                        </h4>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{item.route}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPositive && (
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #a7f3d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircleIcon size={12} color="#047857" />
                        <span>تم البيع</span>
                      </span>
                    )}
                    {isNegative && (
                      <span
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#b91c1c',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <XCircleIcon size={12} color="#b91c1c" />
                        <span>زيارة سلبية</span>
                      </span>
                    )}
                    {isPending && (
                      <span
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ClockIcon size={12} color="#64748b" />
                        <span>في الانتظار</span>
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
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>⚠️ تنبيه: زيارات سلبية متكررة ({item.repeatedNegativesCount} زيارات سابقة بدون بيع)</span>
                  </div>
                )}

                {/* Sub-info: Phone, Balance, Location */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#475569', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.customerPhone && (
                      <a
                        href={`tel:${item.customerPhone}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#170e5e', textDecoration: 'none', fontWeight: 700 }}
                      >
                        <PhoneIcon size={12} />
                        <span>{item.customerPhone}</span>
                      </a>
                    )}
                    {item.locationUrl && (
                      <a
                        href={item.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0284c7', textDecoration: 'underline', fontWeight: 700 }}
                      >
                        <MapPinIcon size={12} />
                        <span>الموقع</span>
                      </a>
                    )}
                  </div>
                  <div>
                    <span>المديونية: </span>
                    <strong style={{ color: item.balance > 0 ? '#b91c1c' : '#047857' }}>
                      {item.balance.toFixed(2)} <CurrencySymbol />
                    </strong>
                  </div>
                </div>

                {/* If already visited: show visit outcome details */}
                {item.todayVisit && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', color: '#475569', border: '1px solid #e2e8f0' }}>
                    {item.todayVisit.visitType === 'positive' ? (
                      <span>
                        تم إصدار فاتورة رقم <strong>{item.todayVisit.saleDocNo}</strong> بقيمة{' '}
                        <strong>{item.todayVisit.saleTotal} <CurrencySymbol /></strong>
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
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <Button
                    variant="primary"
                    onClick={() => onSelectCustomerForSale(item.customerId)}
                    style={{
                      flex: 1,
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      height: '32px',
                    }}
                  >
                    + إصدار فاتورة بيع
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => openNegativeVisitModal(item)}
                    style={{
                      fontSize: '11.5px',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      height: '32px',
                    }}
                  >
                    تسجيل زيارة سلبية
                  </Button>
                </div>
              </div>
            );
          })}
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
