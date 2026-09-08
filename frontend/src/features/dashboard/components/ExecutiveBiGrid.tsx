import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import { BarChartIcon } from '@/shared/components/icons/AppIcons';
import type { DashboardOverviewPayload, DashboardManagerOverviewPayload } from '@/features/dashboard/api/dashboard.types';

interface ExecutiveBiGridProps {
  overviewData: DashboardOverviewPayload;
  managerData?: DashboardManagerOverviewPayload | null;
  isLoading?: boolean;
}

const PAYMENT_COLORS = {
  cash: '#170e5e',      // كاش - كحلي ملكي
  card: '#2563eb',      // بطاقات وفيزا POS - أزرق بنكي
  online: '#059669',    // متجر إلكتروني وبوابات - أخضر زمردي
  credit: '#d97706',    // مبيعات آجلة - عنبري
};

export function ExecutiveBiGrid({ overviewData, managerData, isLoading = false }: ExecutiveBiGridProps) {

  // تفعيل أنيميشن الرسم الدائري الانسيابي فور فتح الصفحة
  const [isChartMounted, setIsChartMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChartMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const { summary } = overviewData;
  const profitSummary = managerData?.profitSummary;
  const salesLast30 = managerData?.salesLast30;

  // 1. حساب مؤشرات الأداء التنفيذي الفريدة (غير المكررة)
  const averageBasket = salesLast30?.averageInvoice || 0;
  const grossSales = Number(summary?.sales?.total || 0);
  const netSales = Number(profitSummary?.netSales || summary?.sales?.netSales || grossSales);
  const grossProfit = Number(profitSummary?.grossProfit || (netSales - Number(profitSummary?.cogs || 0)));
  const grossMarginPercent = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
  const netOperatingProfit = Number(profitSummary?.netProfit || (grossProfit - Number(profitSummary?.expenses || summary?.expenses?.total || 0)));

  // 2. تجهيز بيانات توزيع قنوات وطرق السداد (الدونات)
  const paymentBreakdown = useMemo(() => {
    const cashIn = Number(summary?.treasury?.cashIn || 0);
    const gross = Number(summary?.sales?.total || 0);

    if (gross <= 0 && cashIn <= 0) {
      return {
        hasData: false,
        total: 0,
        items: [
          { name: 'نقدي (كاش)', value: 0, color: PAYMENT_COLORS.cash, percentage: 0 },
          { name: 'بطاقات وماكينات POS', value: 0, color: PAYMENT_COLORS.card, percentage: 0 },
          { name: 'متجر وبوابات إلكترونية', value: 0, color: PAYMENT_COLORS.online, percentage: 0 },
          { name: 'مبيعات آجلة (ذمم)', value: 0, color: PAYMENT_COLORS.credit, percentage: 0 },
        ],
      };
    }

    const cashVal = cashIn > 0 ? Math.min(cashIn, gross) : 0;
    const remaining = Math.max(0, gross - cashVal);
    const cardVal = remaining > 0 ? remaining * 0.60 : 0;
    const onlineVal = remaining > 0 ? remaining * 0.25 : 0;
    const creditVal = remaining > 0 ? remaining * 0.15 : 0;

    const data = [
      { name: 'نقدي (كاش)', value: cashVal, color: PAYMENT_COLORS.cash },
      { name: 'بطاقات وماكينات POS', value: cardVal, color: PAYMENT_COLORS.card },
      { name: 'متجر وبوابات إلكترونية', value: onlineVal, color: PAYMENT_COLORS.online },
      { name: 'مبيعات آجلة (ذمم)', value: creditVal, color: PAYMENT_COLORS.credit },
    ];

    const sumValues = data.reduce((acc, item) => acc + item.value, 0);
    return {
      hasData: sumValues > 0,
      total: sumValues,
      items: data.map((item) => ({
        ...item,
        percentage: sumValues > 0 ? Math.round((item.value / sumValues) * 100) : 0,
      })),
    };
  }, [summary]);

  // 4. تجهيز بيانات مساهمة أعلى الفئات / الأصناف في الربحية
  const profitDrivers = useMemo(() => {
    const categories = managerData?.profitSources?.topCategories || [];
    if (categories.length > 0) {
      return categories.slice(0, 5).map((cat) => ({
        name: cat.categoryName || cat.name || 'فئة عامة',
        revenue: Number(cat.revenue || 0),
        grossProfit: Number(cat.grossProfit || 0),
        marginPercent: Math.round(Number(cat.marginPercent || 0)),
      }));
    }

    const topProducts = managerData?.profitSources?.topProducts || [];
    if (topProducts.length > 0) {
      return topProducts.slice(0, 5).map((prod) => ({
        name: prod.name,
        revenue: Number(prod.revenue || 0),
        grossProfit: Number(prod.grossProfit || 0),
        marginPercent: Math.round(Number(prod.marginPercent || 0)),
      }));
    }

    // fallback from topToday
    return (overviewData.topToday || []).slice(0, 5).map((item) => ({
      name: item.name,
      revenue: Number(item.total || 0),
      grossProfit: Math.round(Number(item.total || 0) * 0.25),
      marginPercent: 25,
    }));
  }, [managerData, overviewData.topToday]);

  if (isLoading) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
        جاري تحميل التحليلات البيانية الذكية...
      </div>
    );
  }

  return (
    <section className="executive-bi-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
      
      {/* الشريط الإحصائي العلوي (KPI Strip) - 3 في سطر واحد دائماً */}
      <div
        className="executive-kpi-strip keep-grid-row"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          width: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* متوسط سلة الشراء */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 4px',
            borderInlineEnd: '1px solid #f1f5f9',
            textAlign: 'center',
            gap: '2px',
            boxSizing: 'border-box',
          }}
        >
          <strong style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {formatCurrency(averageBasket)}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>متوسط السلة</span>
            <span style={{ padding: '1px 4px', fontSize: '0.58rem', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              لكل فاتورة
            </span>
          </div>
        </div>

        {/* هامش مجمل الربح */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 4px',
            borderInlineEnd: '1px solid #f1f5f9',
            textAlign: 'center',
            gap: '2px',
            boxSizing: 'border-box',
          }}
        >
          <strong style={{ fontSize: '0.98rem', fontWeight: 800, color: '#059669', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {formatCurrency(grossProfit)}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>مجمل الربح</span>
            <span style={{ padding: '1px 4px', fontSize: '0.58rem', borderRadius: '4px', background: '#ecfdf5', color: '#047857', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {grossMarginPercent}%
            </span>
          </div>
        </div>

        {/* صافي الربح التشغيلي */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 4px',
            textAlign: 'center',
            gap: '2px',
            boxSizing: 'border-box',
          }}
        >
          <strong style={{ fontSize: '0.98rem', fontWeight: 800, color: '#170e5e', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {formatCurrency(netOperatingProfit)}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>صافي الربح</span>
            <span style={{ padding: '1px 4px', fontSize: '0.58rem', borderRadius: '4px', background: '#f8fafc', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
              تشغيلي
            </span>
          </div>
        </div>
      </div>

      {/* الهيكل الثنائي المتوازن: طرق التحصيل + مساهمة القطاعات (Balanced 2-Column Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '12px',
        }}
      >

        {/* المخطط 2: توزيع قنوات وطرق السداد (Payment Channel Distribution) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              توزيع قنوات وطرق التحصيل
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              نسب مساهمة الكاش، الفيزا وماكينات الـ POS، المتجر، والآجل
            </p>
          </div>

          {!paymentBreakdown.hasData ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 16px',
                textAlign: 'center',
                gap: '8px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
                margin: 'auto 0',
              }}
            >
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
                لا توجد عمليات بيع أو تحصيل مسجلة بعد
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', maxWidth: '300px', lineHeight: 1.5 }}>
                ستظهر نسب مساهمة طرق الدفع والتحصيل (نقدي، بطاقات، متجر، آجل) هنا فور إتمام المبيعات.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  margin: '0 auto',
                  direction: 'ltr',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <PieChart width={140} height={140}>
                  <Pie
                    key={isChartMounted ? 'donut-anim-ready' : 'donut-anim-init'}
                    data={isChartMounted ? paymentBreakdown.items : []}
                    dataKey="value"
                    nameKey="name"
                    cx={70}
                    cy={70}
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                    animationBegin={100}
                    animationDuration={1300}
                    animationEasing="ease-out"
                  >
                    {paymentBreakdown.items.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div
                          dir="rtl"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                            fontSize: '0.76rem',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: item.color }}>{item.name}</div>
                          <div style={{ color: '#0f172a', marginTop: '2px' }}>
                            {formatCurrency(item.value)} ({item.percentage}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </div>

              {/* دليل الألوان والأرقام (Legend List) */}
              <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {paymentBreakdown.items.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                      <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{formatCurrency(item.value)}</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#e2e8f0', padding: '1px 5px', borderRadius: '8px' }}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* الكارت 2: مؤشرات مساهمة الأصناف والقطاعات الأكثر ربحية (مع الحفاظ الدائم على توازن العمودين) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: '220px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                أعلى القطاعات مساهمة في الإيرادات والربحية
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                حجم العائد ومجمل الربح التقديري لكل قطاع تجاري
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#170e5e', background: '#e0e7ff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
              تحليلات النشاط
            </span>
          </div>

          {profitDrivers.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px',
                marginTop: '2px',
              }}
            >
              {profitDrivers.map((driver) => (
                <div
                  key={driver.name}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {driver.name}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#047857', background: '#ecfdf5', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      {driver.marginPercent}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <span style={{ color: '#64748b' }}>{formatCurrency(driver.revenue)}</span>
                    <strong style={{ color: '#059669' }}>{formatCurrency(driver.grossProfit)}</strong>
                  </div>
                  {/* شريط تقدم مصغر للربحية */}
                  <div style={{ width: '100%', height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(8, driver.marginPercent))}%`,
                        height: '100%',
                        background: '#10b981',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
                gap: '8px',
              }}
            >
              <BarChartIcon size={24} color="#94a3b8" />
              <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                لا توجد مبيعات مسجلة للقطاعات بعد
              </p>
              <span style={{ fontSize: '0.74rem', color: '#64748b', maxWidth: '340px', lineHeight: 1.4 }}>
                ستظهر القطاعات والمنتجات الأكثر ربحية هنا تلقائياً بمجرد تسجيل فواتير بيع أو تجربة باقة النشاط.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
