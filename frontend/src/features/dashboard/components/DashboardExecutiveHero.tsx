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

const THEME_STORAGE_KEY = 'dashboard_hero_card_theme';

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
  }
  return 'dark';
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
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(getInitialTheme);

  const user = useAuthStore((state) => state.user);

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {}
      }
      return next;
    });
  };
  
  // Format username gracefully: replace system placeholders like Bootstrap Administrator with Arabic title
  const formattedUserName = useMemo(() => {
    const raw = user?.displayName?.trim() || user?.username?.trim() || '';
    if (!raw) return 'مدير النظام';
    const lower = raw.toLowerCase();
    if (lower.includes('bootstrap') || lower === 'admin' || lower === 'administrator' || lower === 'root') {
      return 'مدير النظام';
    }
    return raw;
  }, [user]);

  const userGreetingPart = formattedUserName ? ` يا ${formattedUserName}` : '';

  // Compute time-based greeting (طابع البركة والرزق للتجار)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        text: `صباح الرزق والبركة${userGreetingPart}`,
        sub: 'يا فتاح يا عليم.. يوم موفق وتجارة رابحة بإذن الله',
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        text: `طاب يومك ورزقك${userGreetingPart}`,
        sub: 'متابعة حية ومباشرة لحركة البيع والشغل على مدار اليوم',
      };
    }
    return {
      text: `مساء الخير والخيرات${userGreetingPart}`,
      sub: 'ملخص حسابات وأرباح اليوم والنتائج المحققة',
    };
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

  // Prepare chart data (7 points or 30 points)
  const chartData = useMemo(() => {
    const pointsCount = Math.max(salesTrend.length, purchasesTrend.length);
    if (!pointsCount) {
      const dummyCount = timeframe === '7d' ? 7 : 30;
      const dummy = [];
      const weekdays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      for (let i = 0; i < dummyCount; i++) {
        dummy.push({
          label: timeframe === '7d' ? weekdays[i % 7] : `${i + 1}`,
          fullDate: `يوم ${i + 1}`,
          sales: i === dummyCount - 1 ? (todaySalesAmount || 0) : 0,
          purchases: 0,
        });
      }
      return dummy;
    }

    const result = [];
    for (let i = 0; i < pointsCount; i++) {
      const s = salesTrend[i];
      const p = purchasesTrend[i];
      const rawKey = s?.key || p?.key || `يوم ${i + 1}`;
      
      let label = rawKey;
      let fullDate = rawKey;
      try {
        if (rawKey.includes('-')) {
          const d = new Date(rawKey);
          if (timeframe === '7d') {
            label = new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
          } else {
            label = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(d);
          }
          fullDate = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
        }
      } catch {
        label = rawKey;
        fullDate = rawKey;
      }

      result.push({
        label,
        fullDate,
        sales: Number(s?.value || 0),
        purchases: Number(p?.value || 0),
      });
    }

    return timeframe === '7d' ? result.slice(-7) : result.slice(-30);
  }, [salesTrend, purchasesTrend, todaySalesAmount, timeframe]);

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)'
            : 'radial-gradient(rgba(15, 23, 42, 0.045) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.42rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: isDark ? '#ffffff' : '#0f172a' }}>
              {greeting.text}
            </h1>

            {/* Theme Toggle Button - Sleek Icon Only */}
            <button
              type="button"
              onClick={handleToggleTheme}
              title={isDark ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الليلي'}
              aria-label={isDark ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الليلي'}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
                color: isDark ? '#f59e0b' : '#475569',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
            >
              {isDark ? (
                // Sun Icon for Dark Mode (switch to light)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" fill="#fbbf24" fillOpacity="0.25" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                  <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                  <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                </svg>
              ) : (
                // Moon Icon for Light Mode (switch to dark)
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#475569" fillOpacity="0.15" />
                </svg>
              )}
            </button>
          </div>
          
          <p style={{ margin: 0, fontSize: '0.86rem', color: isDark ? '#94a3b8' : '#64748b' }}>
            {greeting.sub} · <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{todayFormatted}</strong>
          </p>
        </div>

        {/* 4 Unified, Calming, Glassmorphic KPI Cards */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Card 1: Sales */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '110px',
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 2px 6px -1px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.73rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: '3px' }}>
              مبيعات اليوم
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', justifyContent: 'center' }}>
              <strong style={{ fontSize: '1.05rem', color: isDark ? '#ffffff' : '#0f172a', fontWeight: 800 }}>
                {formatCurrency(todaySalesAmount)}
              </strong>
              <span style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>ج.م</span>
            </div>
          </div>

          {/* Card 2: Invoices */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '95px',
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 2px 6px -1px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.73rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: '3px' }}>
              فواتير اليوم
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', justifyContent: 'center' }}>
              <strong style={{ fontSize: '1.05rem', color: isDark ? '#ffffff' : '#0f172a', fontWeight: 800 }}>
                {todaySalesCount}
              </strong>
              <span style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>فاتورة</span>
            </div>
          </div>

          {/* Card 3: Treasury */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '115px',
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 2px 6px -1px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.73rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: '3px' }}>
              صافي الخزينة
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px', justifyContent: 'center', direction: 'rtl' }}>
              {treasuryNet < 0 && (
                <span
                  style={{
                    fontSize: '1.05rem',
                    color: isDark ? '#f87171' : '#dc2626',
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  -
                </span>
              )}
              <strong
                style={{
                  fontSize: '1.05rem',
                  color: isDark
                    ? (treasuryNet < 0 ? '#f87171' : '#ffffff')
                    : (treasuryNet < 0 ? '#dc2626' : '#0f172a'),
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {formatCurrency(Math.abs(treasuryNet))}
              </strong>
              <span style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>ج.م</span>
            </div>
          </div>

          {/* Card 4: Inventory Alerts */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
              backdropFilter: 'blur(12px)',
              padding: '8px 14px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '105px',
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 2px 6px -1px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.73rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: '3px' }}>
              تنبيهات المخزون
            </div>
            {totalStockAlerts > 0 ? (
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', justifyContent: 'center' }}>
                <strong style={{ fontSize: '1.05rem', color: isDark ? '#fb7185' : '#e11d48', fontWeight: 800 }}>
                  {totalStockAlerts}
                </strong>
                <span style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>صنف</span>
              </div>
            ) : (
              <strong style={{ fontSize: '0.92rem', color: isDark ? '#4ade80' : '#16a34a', fontWeight: 700 }}>
                مستقر ✓
              </strong>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section Header: Title + Timeframe Switcher & Mode Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
          paddingTop: '16px',
          marginBottom: '10px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Title + Timeframe Pill Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>
            حركة المبيعات وتدفق النشاط
          </span>

          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              display: 'inline-flex',
              gap: '3px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              style={{
                background: timeframe === '7d'
                  ? (isDark ? '#0284c7' : '#ffffff')
                  : 'transparent',
                color: timeframe === '7d'
                  ? (isDark ? '#ffffff' : '#0f172a')
                  : (isDark ? '#94a3b8' : '#64748b'),
                boxShadow: timeframe === '7d'
                  ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)')
                  : 'none',
                border: timeframe === '7d' && !isDark ? '1px solid #cbd5e1' : 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                lineHeight: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              آخر ٧ أيام
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              style={{
                background: timeframe === '30d'
                  ? (isDark ? '#0284c7' : '#ffffff')
                  : 'transparent',
                color: timeframe === '30d'
                  ? (isDark ? '#ffffff' : '#0f172a')
                  : (isDark ? '#94a3b8' : '#64748b'),
                boxShadow: timeframe === '30d'
                  ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)')
                  : 'none',
                border: timeframe === '30d' && !isDark ? '1px solid #cbd5e1' : 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                lineHeight: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              آخر ٣٠ يوماً
            </button>
          </div>
        </div>

        {/* Metric Mode Filter */}
        <div
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            display: 'inline-flex',
            gap: '3px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveMetric('sales')}
            style={{
              background: activeMetric === 'sales'
                ? (isDark ? '#0284c7' : '#ffffff')
                : 'transparent',
              color: activeMetric === 'sales'
                ? (isDark ? '#ffffff' : '#0f172a')
                : (isDark ? '#94a3b8' : '#64748b'),
              boxShadow: activeMetric === 'sales'
                ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)')
                : 'none',
              border: activeMetric === 'sales' && !isDark ? '1px solid #cbd5e1' : 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: 1.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            المبيعات
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('both')}
            style={{
              background: activeMetric === 'both'
                ? (isDark ? '#0284c7' : '#ffffff')
                : 'transparent',
              color: activeMetric === 'both'
                ? (isDark ? '#ffffff' : '#0f172a')
                : (isDark ? '#94a3b8' : '#64748b'),
              boxShadow: activeMetric === 'both'
                ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)')
                : 'none',
              border: activeMetric === 'both' && !isDark ? '1px solid #cbd5e1' : 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: 1.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            مقارنة الشراء والبيع
          </button>
        </div>
      </div>

      {/* Large Glowing Animated Wave Area Chart with Highlighted Peak Point */}
      <div style={{ width: '100%', height: 225, position: 'relative', zIndex: 1, paddingBottom: '6px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 14, right: 12, left: 12, bottom: 12 }}>
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
              stroke={isDark ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              dy={8}
              minTickGap={timeframe === '30d' ? 22 : 8}
              interval={timeframe === '30d' ? 'preserveStartEnd' : 0}
              axisLine={{ stroke: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0' }}
            />
            <YAxis hide domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.2), 100)]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const fullDate = payload[0]?.payload?.fullDate || label;
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
                        minWidth: '150px',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '6px', fontWeight: 600 }}>{fullDate}</div>
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
                          <span dir="ltr">{formatCurrency(Number(entry.value || 0))} ج.م</span>
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
                const { cx, cy, index, value } = props;
                // Highlight the last / current day point
                if (index === chartData.length - 1 && cx != null && cy != null) {
                  return (
                    <g key="active-peak-dot">
                      <circle cx={cx} cy={cy} r={8} fill={isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.25)'} />
                      <circle cx={cx} cy={cy} r={4.5} fill={isDark ? '#38bdf8' : '#2563eb'} stroke="#ffffff" strokeWidth={2} />
                    </g>
                  );
                }
                if (value > 0 && cx != null && cy != null) {
                  return <circle key={`dot-${index ?? 0}`} cx={cx} cy={cy} r={3} fill={isDark ? '#38bdf8' : '#2563eb'} opacity={0.6} />;
                }
                return <g key={`dot-empty-${index ?? 0}`} />;
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
                dot={(props: any) => {
                  const { cx, cy, index, value } = props;
                  if (value > 0 && cx != null && cy != null) {
                    return <circle key={`purch-dot-${index ?? 0}`} cx={cx} cy={cy} r={3} fill={isDark ? '#c084fc' : '#7c3aed'} opacity={0.6} />;
                  }
                  return <g key={`purch-dot-empty-${index ?? 0}`} />;
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

