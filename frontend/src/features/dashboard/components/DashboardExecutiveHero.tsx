import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import type { DashboardTrendPoint } from '@/features/dashboard/api/dashboard.types';

interface DashboardExecutiveHeroProps {
  salesTrend?: DashboardTrendPoint[];
  purchasesTrend?: DashboardTrendPoint[];
  todaySalesAmount: number;
  todaySalesCount: number;
  treasuryNet: number;
  totalStockAlerts: number;
}

export function DashboardExecutiveHero({
  salesTrend = [],
  purchasesTrend = [],
  todaySalesAmount,
  todaySalesCount,
  treasuryNet,
  totalStockAlerts,
}: DashboardExecutiveHeroProps) {
  const [activeMetric, setActiveMetric] = useState<'sales' | 'both'>('sales');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const user = useAuthStore((state) => state.user);
  const userName = user?.displayName?.trim() || user?.username?.trim() || '';
  const userGreetingPart = userName ? ` يا ${userName}` : '';

  // Compute time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: `صباح الخير${userGreetingPart}`, sub: 'نتمنى لك يوماً تجارياً مباركاً وموفقاً' };
    if (hour >= 12 && hour < 17) return { text: `طاب يومك بكل خير${userGreetingPart}`, sub: 'متابعة حية ومستمرة لعمليات متجرك اليوم' };
    return { text: `مساء الخير والازدهار${userGreetingPart}`, sub: 'إليك ملخص أداء النظام والنتائج المحققة اليوم' };
  }, [userGreetingPart]);

  // Formatted date
  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString('ar-EG');
    }
  }, []);

  // Prepare chart data (last 7 points)
  const chartData = useMemo(() => {
    if (!salesTrend.length && !purchasesTrend.length) {
      return [
        { label: 'السبت', sales: 0, purchases: 0 },
        { label: 'الأحد', sales: 0, purchases: 0 },
        { label: 'الإثنين', sales: 0, purchases: 0 },
        { label: 'الثلاثاء', sales: 0, purchases: 0 },
        { label: 'الأربعاء', sales: 0, purchases: 0 },
        { label: 'الخميس', sales: 0, purchases: 0 },
        { label: 'اليوم', sales: todaySalesAmount || 0, purchases: 0 },
      ];
    }

    const pointsCount = Math.max(salesTrend.length, purchasesTrend.length);
    const result = [];

    for (let i = 0; i < pointsCount; i++) {
      const s = salesTrend[i];
      const p = purchasesTrend[i];
      const rawKey = s?.key || p?.key || `يوم ${i + 1}`;
      
      let label = rawKey;
      try {
        if (rawKey.includes('-')) {
          const d = new Date(rawKey);
          label = new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
        }
      } catch {
        label = rawKey;
      }

      result.push({
        label,
        sales: Number(s?.value || 0),
        purchases: Number(p?.value || 0),
      });
    }

    return result.slice(-7);
  }, [salesTrend, purchasesTrend, todaySalesAmount]);

  const isDark = themeMode === 'dark';

  return (
    <section
      className={`dashboard-executive-hero ${isDark ? 'theme-dark' : 'theme-light'}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0b1120 0%, #0f172a 50%, #1e293b 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #eff6ff 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: isDark ? '#ffffff' : '#0f172a',
        boxShadow: isDark
          ? '0 15px 35px -5px rgba(15, 23, 42, 0.45), 0 10px 15px -5px rgba(15, 23, 42, 0.3)'
          : '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      aria-label="الموجز التنفيذي التفاعلي"
    >
      {/* High-Tech Subtle Dot Grid for Depth */}
      {isDark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Ambient background glows */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          left: '-40px',
          width: '340px',
          height: '340px',
          background: isDark
            ? 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-40px',
          width: '300px',
          height: '300px',
          background: isDark
            ? 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0) 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, rgba(99, 102, 241, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header: Greeting, Live Status, Theme Switcher & KPI Badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: isDark ? '#ffffff' : '#0f172a' }}>
              {greeting.text}
            </h1>
            
            {/* Live Synchronized Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isDark ? 'rgba(34, 197, 94, 0.18)' : '#f0fdf4',
                border: isDark ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid #bbf7d0',
                color: isDark ? '#4ade80' : '#15803d',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  boxShadow: '0 0 8px #22c55e',
                  display: 'inline-block',
                }}
              />
              مباشر ومتزامن
            </span>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              title={isDark ? 'تحويل للمظهر الفاتح' : 'تحويل للمظهر الليلي'}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid #cbd5e1',
                color: isDark ? '#f8fafc' : '#334155',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
              }}
            >
              {isDark ? '☀️ المظهر الفاتح' : '🌙 المظهر الليلي'}
            </button>
          </div>
          
          <p style={{ margin: 0, fontSize: '0.86rem', color: isDark ? '#cbd5e1' : '#475569' }}>
            {greeting.sub} · <strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{todayFormatted}</strong>
          </p>
        </div>

        {/* 4 Frosted Glass Top-Shine KPI Badges */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Card 1: Sales */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #e2e8f0',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '110px',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0,0,0,0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: isDark ? '#e2e8f0' : '#64748b', fontWeight: 600, marginBottom: '2px' }}>مبيعات اليوم</div>
            <strong style={{ fontSize: '1.05rem', color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 800 }}>
              {formatCurrency(todaySalesAmount)}
            </strong>
          </div>

          {/* Card 2: Invoices */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #e2e8f0',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '95px',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0,0,0,0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: isDark ? '#e2e8f0' : '#64748b', fontWeight: 600, marginBottom: '2px' }}>فواتير اليوم</div>
            <strong style={{ fontSize: '1.05rem', color: isDark ? '#4ade80' : '#16a34a', fontWeight: 800 }}>
              {todaySalesCount} فاتورة
            </strong>
          </div>

          {/* Card 3: Treasury */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #e2e8f0',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '110px',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0,0,0,0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: isDark ? '#e2e8f0' : '#64748b', fontWeight: 600, marginBottom: '2px' }}>صافي الخزينة</div>
            <strong
              style={{
                fontSize: '1.05rem',
                color: isDark
                  ? (treasuryNet >= 0 ? '#38bdf8' : '#f87171')
                  : (treasuryNet >= 0 ? '#0284c7' : '#dc2626'),
                fontWeight: 800,
              }}
            >
              {formatCurrency(treasuryNet)}
            </strong>
          </div>

          {/* Card 4: Inventory Alerts */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #e2e8f0',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '105px',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0,0,0,0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: isDark ? '#e2e8f0' : '#64748b', fontWeight: 600, marginBottom: '2px' }}>تنبيهات المخزون</div>
            <strong
              style={{
                fontSize: '1.05rem',
                color: isDark
                  ? (totalStockAlerts > 0 ? '#fb7185' : '#4ade80')
                  : (totalStockAlerts > 0 ? '#dc2626' : '#16a34a'),
                fontWeight: 800,
              }}
            >
              {totalStockAlerts > 0 ? `${totalStockAlerts} صنف` : 'مكتمل'}
            </strong>
          </div>
        </div>
      </div>

      {/* Chart Section Header & Mode Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
          paddingTop: '16px',
          marginBottom: '10px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>
          حركة المبيعات وتدفق النشاط (آخر ٧ أيام)
        </span>

        <div
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            display: 'flex',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveMetric('sales')}
            style={{
              background: activeMetric === 'sales'
                ? (isDark ? '#3b82f6' : '#ffffff')
                : 'transparent',
              color: activeMetric === 'sales'
                ? (isDark ? '#ffffff' : '#0f172a')
                : (isDark ? '#cbd5e1' : '#64748b'),
              boxShadow: activeMetric === 'sales' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            المبيعات
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('both')}
            style={{
              background: activeMetric === 'both'
                ? (isDark ? '#8b5cf6' : '#ffffff')
                : 'transparent',
              color: activeMetric === 'both'
                ? (isDark ? '#ffffff' : '#0f172a')
                : (isDark ? '#cbd5e1' : '#64748b'),
              boxShadow: activeMetric === 'both' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            مقارنة الشراء والبيع
          </button>
        </div>
      </div>

      {/* Large Glowing Animated Wave Area Chart with Highlighted Peak Point */}
      <div style={{ width: '100%', height: 210, position: 'relative', zIndex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="chartSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#38bdf8' : '#2563eb'} stopOpacity={isDark ? 0.45 : 0.25} />
                <stop offset="95%" stopColor={isDark ? '#38bdf8' : '#2563eb'} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="chartPurchasesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#c084fc' : '#7c3aed'} stopOpacity={isDark ? 0.4 : 0.2} />
                <stop offset="95%" stopColor={isDark ? '#c084fc' : '#7c3aed'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#e2e8f0' : '#334155', fontSize: 12, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0' }}
            />
            <YAxis hide domain={['dataMin - 100', 'dataMax + 200']} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      style={{
                        background: isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
                        backdropFilter: isDark ? 'blur(12px)' : 'none',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #e2e8f0',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        color: isDark ? '#fff' : '#0f172a',
                        boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 6px 16px rgba(0,0,0,0.08)',
                        direction: 'rtl',
                        minWidth: '140px',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
                      {payload.map((entry) => (
                        <div
                          key={entry.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '12px',
                            fontSize: '0.84rem',
                            color: entry.name === 'sales'
                              ? (isDark ? '#38bdf8' : '#2563eb')
                              : (isDark ? '#c084fc' : '#7c3aed'),
                            fontWeight: 800,
                            marginBottom: '2px',
                          }}
                        >
                          <span>{entry.name === 'sales' ? 'المبيعات:' : 'المشتريات:'}</span>
                          <span>{formatCurrency(Number(entry.value || 0))}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              name="sales"
              stroke={isDark ? '#38bdf8' : '#2563eb'}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#chartSalesGrad)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              dot={(props: any) => {
                const { cx, cy, index } = props;
                // Highlight the last / current day point
                if (index === chartData.length - 1 && cx != null && cy != null) {
                  return (
                    <g key="active-peak-dot">
                      <circle cx={cx} cy={cy} r={8} fill={isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.25)'} />
                      <circle cx={cx} cy={cy} r={4.5} fill={isDark ? '#38bdf8' : '#2563eb'} stroke="#ffffff" strokeWidth={2} />
                    </g>
                  );
                }
                return <circle key={`dot-${index ?? 0}`} cx={cx ?? 0} cy={cy ?? 0} r={0} />;
              }}
            />
            {activeMetric === 'both' && (
              <Area
                type="monotone"
                dataKey="purchases"
                name="purchases"
                stroke={isDark ? '#c084fc' : '#7c3aed'}
                strokeWidth={2.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#chartPurchasesGrad)"
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
