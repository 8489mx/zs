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
import type { DashboardTrendPoint } from '@/features/dashboard/api/dashboard.types';

interface DashboardExecutiveHeroProps {
  salesTrend?: DashboardTrendPoint[];
  purchasesTrend?: DashboardTrendPoint[];
  todaySalesAmount: number;
  todaySalesCount: number;
  treasuryNet: number;
}

export function DashboardExecutiveHero({
  salesTrend = [],
  purchasesTrend = [],
  todaySalesAmount,
  todaySalesCount,
  treasuryNet,
}: DashboardExecutiveHeroProps) {
  const [activeMetric, setActiveMetric] = useState<'sales' | 'both'>('sales');

  // Compute time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'صباح الخير والبركة ☕', sub: 'نتمنى لك يوماً تجارياً مباركاً وموفقاً' };
    if (hour >= 12 && hour < 17) return { text: 'طاب يومك بكل خير ☀️', sub: 'متابعة حية ومستمرة لعمليات متجرك اليوم' };
    return { text: 'مساء الخير والازدهار ✨', sub: 'إليك ملخص أداء النظام والنتائج المحققة اليوم' };
  }, []);

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
      // Fallback sample trend if brand new database
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
      
      // Format key nicely (e.g. 2026-08-20 -> short date)
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

  return (
    <section
      className="dashboard-executive-hero"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 8px 10px -6px rgba(15, 23, 42, 0.2)',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      aria-label="الموجز التنفيذي التفاعلي"
    >
      {/* Background Decorative Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          left: '-40px',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-40px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {/* Top Bar: Greeting & Live Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
              {greeting.text}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#4ade80',
                fontSize: '0.72rem',
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
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8' }}>
            {greeting.sub} · <span style={{ color: '#cbd5e1' }}>{todayFormatted}</span>
          </p>
        </div>

        {/* Quick Spotlight Metric Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '110px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>مبيعات اليوم</div>
            <strong style={{ fontSize: '0.95rem', color: '#60a5fa', fontWeight: 800 }}>
              {formatCurrency(todaySalesAmount)}
            </strong>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '95px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>فواتير اليوم</div>
            <strong style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: 800 }}>
              {todaySalesCount} فاتورة
            </strong>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '110px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>صافي الخزينة</div>
            <strong style={{ fontSize: '0.95rem', color: treasuryNet >= 0 ? '#38bdf8' : '#f87171', fontWeight: 800 }}>
              {formatCurrency(treasuryNet)}
            </strong>
          </div>
        </div>
      </div>

      {/* Middle Chart Header & Mode Switch */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '16px',
          marginBottom: '10px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f1f5f9' }}>
            📈 حركة المبيعات وتدفق النشاط (آخر ٧ أيام)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveMetric('sales')}
            style={{
              background: activeMetric === 'sales' ? '#3b82f6' : 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
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
              background: activeMetric === 'both' ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            مقارنة الشراء والبيع
          </button>
        </div>
      </div>

      {/* Interactive Smooth Animated Area Chart */}
      <div style={{ width: '100%', height: 180, position: 'relative', zIndex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="purchasesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={['dataMin - 100', 'dataMax + 200']} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        color: '#fff',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.35)',
                        direction: 'rtl',
                        minWidth: '140px',
                      }}
                    >
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '6px' }}>{label}</div>
                      {payload.map((entry) => (
                        <div
                          key={entry.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '12px',
                            fontSize: '0.82rem',
                            color: entry.name === 'sales' ? '#60a5fa' : '#c084fc',
                            fontWeight: 700,
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
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#salesGrad)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            {activeMetric === 'both' && (
              <Area
                type="monotone"
                dataKey="purchases"
                name="purchases"
                stroke="#a855f7"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#purchasesGrad)"
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
