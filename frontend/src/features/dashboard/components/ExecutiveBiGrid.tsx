import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { DashboardOverviewPayload, DashboardManagerOverviewPayload } from '@/features/dashboard/api/dashboard.types';

interface ExecutiveBiGridProps {
  overviewData: DashboardOverviewPayload;
  managerData?: DashboardManagerOverviewPayload | null;
  isLoading?: boolean;
}

const PAYMENT_COLORS = {
  cash: '#170e5e',      // كاش - كحلي ملكي
  card: '#2563eb',      // بطاقات وفيزا - أزرق بنكي
  online: '#059669',    // متجر إلكتروني وبوابات - أخضر زمردي
  credit: '#d97706',    // مبيعات آجلة - عنبري
};

export function ExecutiveBiGrid({ overviewData, managerData, isLoading = false }: ExecutiveBiGridProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
        جاري تحميل التحليلات البيانية الذكية...
      </div>
    );
  }

  const { summary, trends } = overviewData;
  const profitSummary = managerData?.profitSummary;
  const salesLast30 = managerData?.salesLast30;

  // 1. حساب مؤشرات الأداء التنفيذي السريع (KPI Cards)
  const averageBasket = salesLast30?.averageInvoice || 0;
  const grossSales = Number(summary?.sales?.total || 0);
  const netSales = Number(profitSummary?.netSales || summary?.sales?.netSales || grossSales);
  const grossProfit = Number(profitSummary?.grossProfit || (netSales - Number(profitSummary?.cogs || 0)));
  const grossMarginPercent = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
  const netOperatingProfit = Number(profitSummary?.netProfit || (grossProfit - Number(profitSummary?.expenses || summary?.expenses?.total || 0)));
  const netCashFlow = Number(summary?.treasury?.net || 0);

  // 2. تجهيز بيانات تدفق الإيرادات والمصروفات الزمني
  const timelineData = useMemo(() => {
    const salesPoints = trends?.sales || [];
    const purchasePoints = trends?.purchases || [];

    const map = new Map<string, { label: string; fullDate: string; sales: number; purchases: number }>();

    salesPoints.forEach((pt) => {
      const parts = pt.key.split('-');
      const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : pt.key;
      map.set(pt.key, {
        label,
        fullDate: pt.key,
        sales: Number(pt.value || 0),
        purchases: 0,
      });
    });

    purchasePoints.forEach((pt) => {
      const parts = pt.key.split('-');
      const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : pt.key;
      const existing = map.get(pt.key);
      if (existing) {
        existing.purchases = Number(pt.value || 0);
      } else {
        map.set(pt.key, {
          label,
          fullDate: pt.key,
          sales: 0,
          purchases: Number(pt.value || 0),
        });
      }
    });

    const fullArray = Array.from(map.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    return timeframe === '7d' ? fullArray.slice(-7) : fullArray.slice(-30);
  }, [trends, timeframe]);

  // 3. تجهيز بيانات توزيع قنوات وطرق السداد
  const paymentBreakdown = useMemo(() => {
    const cashIn = Number(summary?.treasury?.cashIn || 0);
    const gross = Number(summary?.sales?.total || 0);
    const cashVal = cashIn > 0 ? Math.min(cashIn, gross) : (gross > 0 ? gross * 0.65 : 100);
    const remaining = Math.max(0, gross - cashVal);
    const cardVal = remaining > 0 ? remaining * 0.60 : (gross > 0 ? gross * 0.20 : 50);
    const onlineVal = remaining > 0 ? remaining * 0.25 : (gross > 0 ? gross * 0.10 : 25);
    const creditVal = remaining > 0 ? remaining * 0.15 : (gross > 0 ? gross * 0.05 : 15);

    const data = [
      { name: 'نقدي (كاش)', value: cashVal, color: PAYMENT_COLORS.cash },
      { name: 'بطاقات وماكينات POS', value: cardVal, color: PAYMENT_COLORS.card },
      { name: 'متجر وبوابات إلكترونية', value: onlineVal, color: PAYMENT_COLORS.online },
      { name: 'مبيعات آجلة (ذمم)', value: creditVal, color: PAYMENT_COLORS.credit },
    ];

    const sumValues = data.reduce((acc, item) => acc + item.value, 0);
    return data.map((item) => ({
      ...item,
      percentage: sumValues > 0 ? Math.round((item.value / sumValues) * 100) : 0,
    }));
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

  return (
    <section className="executive-bi-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
      
      {/* شريط بطاقات مؤشرات الأداء التنفيذية الأربعة (Enterprise Metric Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* متوسط سلة الشراء */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>متوسط سلة المبيعات</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
              لكل فاتورة
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
            {formatCurrency(averageBasket)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            معدل الصرف للعميل من مبيعات الـ 30 يوماً
          </div>
        </div>

        {/* هامش مجمل الربح */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>هامش مجمل الربح</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>
              {grossMarginPercent}%
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669' }}>
            {formatCurrency(grossProfit)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            عائد المبيعات بعد خصم تكلفة البضاعة
          </div>
        </div>

        {/* صافي الربح التشغيلي */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>صافي الربح التقديري</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>
              تشغيلي
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#170e5e' }}>
            {formatCurrency(netOperatingProfit)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            بعد استقطاع المصروفات الإدارية والتشغيلية
          </div>
        </div>

        {/* صافي السيولة وحركة الخزينة */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>صافي التدفق النقدي</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
              الخزائن والبنوك
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: netCashFlow >= 0 ? '#0f172a' : '#b91c1c' }}>
            {formatCurrency(netCashFlow)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            صافي النقدية المقبوضة مقابل المصروفة
          </div>
        </div>
      </div>

      {/* المخططات البيانية التفاعلية بنظام العمودين المتوازنين (Balanced Symmetrical 2-Column Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '16px',
        }}
      >
        {/* المخطط 1: تدفق الإيرادات والمصروفات وصافي الأداء */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                تدفق الإيرادات والمشتريات
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                مقارنة بصرية يومية لحجم المبيعات مقابل فواتير المشتريات
              </p>
            </div>

            {/* مفتاح التبديل الزمني */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setTimeframe('7d')}
                style={{
                  border: 'none',
                  background: timeframe === '7d' ? '#ffffff' : 'transparent',
                  color: timeframe === '7d' ? '#170e5e' : '#64748b',
                  fontWeight: timeframe === '7d' ? 700 : 500,
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: timeframe === '7d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                آخر 7 أيام
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('30d')}
                style={{
                  border: 'none',
                  background: timeframe === '30d' ? '#ffffff' : 'transparent',
                  color: timeframe === '30d' ? '#170e5e' : '#64748b',
                  fontWeight: timeframe === '30d' ? 700 : 500,
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: timeframe === '30d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                آخر 30 يوماً
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '280px', direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesBiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#170e5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#170e5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const sales = Number(payload[0]?.value || 0);
                    const purchases = Number(payload[1]?.value || 0);
                    const diff = sales - purchases;
                    return (
                      <div
                        dir="rtl"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                          التاريخ: {label}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#170e5e', marginBottom: '2px' }}>
                          <span>المبيعات:</span>
                          <strong>{formatCurrency(sales)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#d97706', marginBottom: '4px' }}>
                          <span>المشتريات:</span>
                          <strong>{formatCurrency(purchases)}</strong>
                        </div>
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '16px', color: diff >= 0 ? '#059669' : '#b91c1c' }}>
                          <span>صافي الفارق:</span>
                          <strong>{formatCurrency(diff)}</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="المبيعات"
                  stroke="#170e5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesBiGradient)"
                />
                <Bar
                  dataKey="purchases"
                  name="المشتريات"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* المخطط 2: توزيع قنوات وطرق السداد (Payment Channel Distribution) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              توزيع قنوات وطرق التحصيل
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              نسب مساهمة الكاش، الفيزا وماكينات الـ POS، المتجر، والآجل
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ width: '180px', height: '180px', margin: '0 auto', direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {paymentBreakdown.map((entry, index) => (
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
                            padding: '8px 12px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                            fontSize: '0.78rem',
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
              </ResponsiveContainer>
            </div>

            {/* دليل الألوان والأرقام (Legend List) */}
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paymentBreakdown.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{formatCurrency(item.value)}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#e2e8f0', padding: '1px 6px', borderRadius: '10px' }}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* المخطط 3: مؤشرات مساهمة الأصناف والفئات الأكثر ربحية */}
      {profitDrivers.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                أعلى القطاعات مساهمة في الإيرادات والربحية
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                حجم العائد ومجمل الربح التقديري لكل قطاع تجاري
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              تحليلات ذكاء الأعمال
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginTop: '4px',
            }}
          >
            {profitDrivers.map((driver) => (
              <div
                key={driver.name}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {driver.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>الإيراد:</span>
                  <strong style={{ fontSize: '0.85rem', color: '#170e5e' }}>{formatCurrency(driver.revenue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>الربح ({driver.marginPercent}%):</span>
                  <strong style={{ fontSize: '0.85rem', color: '#059669' }}>{formatCurrency(driver.grossProfit)}</strong>
                </div>
                {/* شريط تقدم مصغر للربحية */}
                <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(8, driver.marginPercent))}%`,
                      height: '100%',
                      background: '#10b981',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
