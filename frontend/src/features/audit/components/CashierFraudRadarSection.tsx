import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDateTimeArabic } from '@/lib/format';
import {
  RefreshCwIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import {
  cashierFraudRadarApi,
  type CashierRiskProfile,
  type FraudRadarEventItem,
} from '../api/cashier-fraud-radar.api';

export function CashierFraudRadarSection() {
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '30days'>('today');
  const [selectedCashierId, setSelectedCashierId] = useState<number | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['cashier-fraud-radar-summary', timeframe],
    queryFn: () => cashierFraudRadarApi.getSummary(timeframe),
    refetchInterval: 30000, // auto-refresh every 30 seconds
  });

  const eventsQuery = useQuery({
    queryKey: ['cashier-fraud-radar-events'],
    queryFn: () => cashierFraudRadarApi.getEvents(50),
    refetchInterval: 30000,
  });

  const summary = summaryQuery.data;
  const events = eventsQuery.data || [];

  const filteredEvents = selectedCashierId
    ? events.filter((e) => e.cashierId === selectedCashierId)
    : events;

  const handleRefresh = () => {
    void summaryQuery.refetch();
    void eventsQuery.refetch();
  };

  const getRiskBadge = (level: CashierRiskProfile['riskLevel'], score: number) => {
    if (level === 'high') {
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          عالي الخطورة ({score}%)
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            background: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fef3c7',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          تحت الملاحظة ({score}%)
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 700,
          background: '#f0fdf4',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
        طبيعي وآمن ({score}%)
      </span>
    );
  };

  const getEventBadge = (eventType: FraudRadarEventItem['eventType']) => {
    switch (eventType) {
      case 'cart_remove':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
            حذف من السلة
          </span>
        );
      case 'draft_cancel':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#ffedd5', color: '#9a3412' }}>
            إلغاء فاتورة
          </span>
        );
      case 'sale_cancelled':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#fce7f3', color: '#9d174d' }}>
            فاتورة ملغاة
          </span>
        );
      case 'discount_override':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#ede9fe', color: '#6b21a8' }}>
            تجاوز خصم
          </span>
        );
      default:
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
            أمني
          </span>
        );
    }
  };

  return (
    <div className="cashier-fraud-radar-section" dir="rtl" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Control Header */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              رادار كشف تلاعب وسرقات الكاشير ومنع الخسائر
            </h3>
            <span
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
              }}
            >
              محدث آلياً (Radar Active)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            رصد تلقائي للأنماط المريبة (حذف أصناف بعد مسحها، إلغاء فواتير، تلاعب الخصم) مع إنذارات واتساب للمالك عند الاشتباه.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Timeframe selector pills */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                background: timeframe === 'today' ? '#ffffff' : 'transparent',
                color: timeframe === 'today' ? '#170e5e' : '#64748b',
                boxShadow: timeframe === 'today' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('7days')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                background: timeframe === '7days' ? '#ffffff' : 'transparent',
                color: timeframe === '7days' ? '#170e5e' : '#64748b',
                boxShadow: timeframe === '7days' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30days')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                background: timeframe === '30days' ? '#ffffff' : 'transparent',
                color: timeframe === '30days' ? '#170e5e' : '#64748b',
                boxShadow: timeframe === '30days' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              آخر 30 يوماً
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={handleRefresh}
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCwIcon size={14} />
            <span>تحديث الرادار</span>
          </Button>
        </div>
      </div>

      {/* Proactive Anomaly Status Banner */}
      {summary && summary.highRiskCashiersCount > 0 ? (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangleIcon size={24} color="#9f1239" />
            <div>
              <div style={{ fontWeight: 800, color: '#9f1239', fontSize: '14px' }}>
                تنبيه رادار الرقابة: تم رصد {summary.highRiskCashiersCount} كاشير في دائرة الخطر المرتفع!
              </div>
              <div style={{ fontSize: '12.5px', color: '#be123c', marginTop: '2px' }}>
                تكرار عمليات حذف الأصناف أو إلغاء الفواتير تجاوز المعدل الطبيعي. تم تفعيل المراقبة وإرسال تنبيه واتساب فوري للإدارة.
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              background: '#ffffff',
              color: '#9f1239',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #fecdd3',
            }}
          >
            نظام التنبيه التلقائي: نشط
          </span>
        </div>
      ) : (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldCheckIcon size={20} color="#166534" />
          <div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '13.5px' }}>
              الوضع الرقابي مستقر وآمن
            </div>
            <div style={{ fontSize: '12px', color: '#15803d' }}>
              لا توجد أنماط تلاعب غير اعتيادية مرصودة حالياً. نظام كشف التلاعب يعمل على مدار الساعة.
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>إجمالي العمليات المشبوهة</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
            {summary?.totalSuspiciousEvents ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            حذف أصناف + إلغاء فواتير + خصومات
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: summary && summary.highRiskCashiersCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#b91c1c', fontWeight: 600 }}>كاشيرات في دائرة الخطر</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#b91c1c', marginTop: '6px' }}>
            {summary?.highRiskCashiersCount ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            مؤشر خطر مرتفع (&gt;= 60%)
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 600 }}>كاشيرات تحت الملاحظة</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#b45309', marginTop: '6px' }}>
            {summary?.mediumRiskCashiersCount ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            مؤشر خطر متوسط (30% - 59%)
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#0f766e', fontWeight: 600 }}>الخسائر المرصودة / المحمية</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f766e', marginTop: '6px' }}>
            {formatCurrency(summary?.estimatedProtectedLoss ?? 0)} ج.م
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            إجمالي مبالغ الحركات الملغاة والمحذوفة
          </div>
        </div>
      </div>

      {/* Symmetrical 2-Column Section: Cashiers Risk Ranking + Live Audit Feed */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Column 1: Cashier Risk Profiles */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                تقييم مؤشر أمان وسلوك الكاشيرات
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                ترتيب الكاشيرات حسب معدل الحركات المشبوهة وحذوفات السلة
              </p>
            </div>
            {selectedCashierId ? (
              <Button
                variant="secondary"
                onClick={() => setSelectedCashierId(null)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                عرض كل الكاشيرات
              </Button>
            ) : null}
          </div>

          {summaryQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
              جاري تحليل بيانات الأمان وسلوك الكاشيرات...
            </div>
          ) : !summary?.cashiers.length ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
              لا يوجد كاشيرات مسجلين حالياً
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summary.cashiers.map((c) => {
                const isSelected = selectedCashierId === c.cashierId;
                return (
                  <div
                    key={c.cashierId}
                    onClick={() => setSelectedCashierId(isSelected ? null : c.cashierId)}
                    style={{
                      border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      background: isSelected ? '#f8faff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Top Row: Name and Risk Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: c.riskLevel === 'high' ? '#fee2e2' : c.riskLevel === 'medium' ? '#fef3c7' : '#e0f2fe',
                            color: c.riskLevel === 'high' ? '#991b1b' : c.riskLevel === 'medium' ? '#92400e' : '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                          }}
                        >
                          {c.cashierName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                            {c.cashierName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {c.totalSalesCount} فاتورة بيع ناجحة
                          </div>
                        </div>
                      </div>
                      {getRiskBadge(c.riskLevel, c.riskScore)}
                    </div>

                    {/* Progress Bar for Risk Score */}
                    <div style={{ margin: '10px 0 8px', background: '#f1f5f9', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(4, c.riskScore)}%`,
                          background: c.riskLevel === 'high' ? '#ef4444' : c.riskLevel === 'medium' ? '#f59e0b' : '#22c55e',
                          borderRadius: '9999px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {/* Mini Stats Breakdown */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px',
                        background: '#f8fafc',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        textAlign: 'center',
                        marginTop: '6px',
                      }}
                    >
                      <div>
                        <div style={{ color: '#64748b', fontSize: '10.5px' }}>حذف سلة</div>
                        <div style={{ fontWeight: 800, color: c.cartVoidsCount > 0 ? '#b91c1c' : '#334155' }}>
                          {c.cartVoidsCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '10.5px' }}>إلغاء مسودة</div>
                        <div style={{ fontWeight: 800, color: c.draftCancelsCount > 0 ? '#b45309' : '#334155' }}>
                          {c.draftCancelsCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '10.5px' }}>فواتير ملغاة</div>
                        <div style={{ fontWeight: 800, color: c.cancelledSalesCount > 0 ? '#b91c1c' : '#334155' }}>
                          {c.cancelledSalesCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '10.5px' }}>تجاوز خصم</div>
                        <div style={{ fontWeight: 800, color: c.discountOverridesCount > 0 ? '#6b21a8' : '#334155' }}>
                          {c.discountOverridesCount}
                        </div>
                      </div>
                    </div>

                    {c.lastSuspiciousAt ? (
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '6px', textAlign: 'left' }}>
                        آخر حركة مشبوهة: {formatDateTimeArabic(c.lastSuspiciousAt)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Live Suspicious Audit Feed */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                شريط الرصد الحي للعمليات المشبوهة
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                {selectedCashierId
                  ? `عرض العمليات المشبوهة للكاشير المحدد فقط`
                  : `تسجيل لحظي لكافة حركات الحذف والإلغاء والتلاعب عبر أجهزة الكاشير`}
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {filteredEvents.length} حدث
            </span>
          </div>

          {eventsQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
              جاري جلب سجل الأحداث الأمنية...
            </div>
          ) : !filteredEvents.length ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <CheckCircleIcon size={24} color="#16a34a" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#475569' }}>
                لا توجد عمليات مشبوهة مسجلة
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                كافة عمليات البيع والكاشير تسير بصورة طبيعية ونظامية.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '520px',
                overflowY: 'auto',
                paddingInlineEnd: '4px',
              }}
            >
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getEventBadge(evt.eventType)}
                      <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#0f172a' }}>
                        {evt.cashierName}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {formatDateTimeArabic(evt.createdAt)}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                    {evt.details || evt.eventTitle}
                  </div>

                  {typeof evt.amount === 'number' && evt.amount > 0 ? (
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', textAlign: 'left' }}>
                      القيمة: {formatCurrency(evt.amount)} ج.م
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
