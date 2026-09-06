import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  kdsApi,
  KdsStation,
  KdsItemStatus,
} from '@/features/pos/api/kds.api';
import {
  UtensilsIcon,
  ClockIcon,
  BellIcon,
  BellOffIcon,
  Maximize2Icon,
  CheckIcon,
  AlertTriangleIcon,
  FlameIcon,
  SparklesIcon,
} from '@/shared/components/icons/AppIcons';

export function KitchenDisplayPage() {
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<KdsStation>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [lastRecallMessage, setLastRecallMessage] = useState<string | null>(null);
  const previousTicketIdsRef = useRef<Set<number>>(new Set());

  // Web Audio API acoustic chime synthesizer
  const playNewOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      // 2-tone melodic chime: D5 (587.33Hz) -> A5 (880Hz)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);

      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Clock ticker every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Query tickets every 5 seconds
  const { data, isLoading } = useQuery({
    queryKey: ['kds-tickets', selectedStation, selectedOrderType],
    queryFn: () =>
      kdsApi.getTickets({
        station: selectedStation,
        orderType: selectedOrderType,
      }),
    refetchInterval: 5000,
  });

  const tickets = data?.tickets || [];
  const stats = data?.stats || {
    pendingCount: 0,
    cookingCount: 0,
    readyCount: 0,
    criticalCount: 0,
    avgPrepMinutes: 0,
  };

  // Chime on new incoming ticket
  useEffect(() => {
    if (!tickets.length) return;
    const currentIds = new Set(tickets.map((t) => t.id));

    if (previousTicketIdsRef.current.size > 0) {
      let hasNewTicket = false;
      for (const id of currentIds) {
        if (!previousTicketIdsRef.current.has(id)) {
          hasNewTicket = true;
          break;
        }
      }
      if (hasNewTicket && soundEnabled) {
        playNewOrderChime();
      }
    }
    previousTicketIdsRef.current = currentIds;
  }, [tickets, soundEnabled]);

  // Mutations
  const advanceMutation = useMutation({
    mutationFn: (ticketId: number) => kdsApi.advanceStatus(ticketId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
    },
  });

  const itemStatusMutation = useMutation({
    mutationFn: (vars: { ticketId: number; itemId: number; status: KdsItemStatus }) =>
      kdsApi.setItemStatus(vars.ticketId, vars.itemId, vars.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
    },
  });

  const recallMutation = useMutation({
    mutationFn: () => kdsApi.recallLastServed(),
    onSuccess: (res) => {
      if (res?.recalled) {
        setLastRecallMessage(`تم استرجاع آخر طلب بنجاح إلى شاشة التجهيز`);
        void queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
        setTimeout(() => setLastRecallMessage(null), 4000);
      } else {
        setLastRecallMessage('لا يوجد طلب مكتمل متاح للاسترجاع حالياً');
        setTimeout(() => setLastRecallMessage(null), 3000);
      }
    },
  });

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getUrgencyBadge = (level: 'normal' | 'warning' | 'critical', elapsedMins: number) => {
    if (level === 'critical') {
      return {
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#991b1b',
        topColor: '#ef4444',
        indicator: 'متأخر',
        label: `${elapsedMins} دقيقة`,
      };
    }
    if (level === 'warning') {
      return {
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#92400e',
        topColor: '#f59e0b',
        indicator: 'اقترب الحد',
        label: `${elapsedMins} دقيقة`,
      };
    }
    return {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
      topColor: '#170e5e',
      indicator: 'في الموعد',
      label: `${elapsedMins} دقيقة`,
    };
  };

  const getOrderTypeBadge = (type: string, tableNumber?: string) => {
    if (type === 'dine_in') {
      return {
        label: tableNumber ? `طاولة ${tableNumber}` : 'صالة',
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1e40af',
      };
    }
    if (type === 'takeaway') {
      return {
        label: 'سفري',
        bg: '#fefce8',
        border: '#fef08a',
        text: '#854d0e',
      };
    }
    return {
      label: 'دليفري',
      bg: '#fff7ed',
      border: '#fed7aa',
      text: '#9a3412',
    };
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Header Bar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* Brand & Live Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}
          >
            <UtensilsIcon size={20} color="#ffffff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                شاشة المطبخ التفاعلية (KDS)
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.5px',
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
              نظام إدارة وتوجيه طلبات المطبخ الذكي • Z-Kitchen Operations
            </div>
          </div>
        </div>

        {/* Live Clock & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'left', direction: 'ltr' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: '#170e5e',
                letterSpacing: '0.5px',
              }}
            >
              {currentTime}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playNewOrderChime();
              }}
              style={{
                backgroundColor: soundEnabled ? '#eff6ff' : '#f8fafc',
                color: soundEnabled ? '#170e5e' : '#64748b',
                border: `1px solid ${soundEnabled ? '#bfdbfe' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="تفعيل/كتم صوت جرس التنبيه"
            >
              {soundEnabled ? <BellIcon size={14} color="#170e5e" /> : <BellOffIcon size={14} color="#64748b" />}
              <span>{soundEnabled ? 'التنبيه مفعّل' : 'مكتوم'}</span>
            </button>

            {/* Recall Last Served */}
            <button
              type="button"
              onClick={() => recallMutation.mutate()}
              disabled={recallMutation.isPending}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.15s ease',
              }}
              title="استرجاع آخر طلب مكتمل"
            >
              <span>استرجاع آخر طلب</span>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
              title="ملء الشاشة"
            >
              <Maximize2Icon size={16} color="#334155" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Executive Kitchen KPI Strip */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>ورد للتو (جديد):</span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e' }}>{stats.pendingCount}</span>
        </div>

        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>قيد التحضير والطهي:</span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#b45309' }}>{stats.cookingCount}</span>
        </div>

        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>جاهز للاستلام والتسليم:</span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#15803d' }}>{stats.readyCount}</span>
        </div>

        <div
          style={{
            backgroundColor: stats.criticalCount > 0 ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${stats.criticalCount > 0 ? '#fecaca' : '#e2e8f0'}`,
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: stats.criticalCount > 0 ? '#991b1b' : '#64748b',
            }}
          >
            متأخر (&gt;15د):
          </span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 900,
              color: stats.criticalCount > 0 ? '#dc2626' : '#64748b',
            }}
          >
            {stats.criticalCount}
          </span>
        </div>
      </div>

      {/* 3. Filter Bar (Stations & Order Types) */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Station Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>المحطة:</span>
          {(
            [
              { key: 'all', label: 'الكل' },
              { key: 'kitchen', label: 'المطبخ الساخن' },
              { key: 'grill', label: 'المشويات' },
              { key: 'beverages', label: 'المشروبات والبار' },
              { key: 'bakery', label: 'المخبوزات والحلويات' },
            ] as const
          ).map((s) => {
            const isActive = selectedStation === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedStation(s.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? '#170e5e' : '#cbd5e1'}`,
                  backgroundColor: isActive ? '#170e5e' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  boxShadow: isActive ? '0 2px 6px rgba(23, 14, 94, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Order Type Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>النوع:</span>
          {(
            [
              { key: 'all', label: 'الكل' },
              { key: 'dine_in', label: 'صالة' },
              { key: 'takeaway', label: 'سفري' },
              { key: 'delivery', label: 'دليفري' },
            ] as const
          ).map((ot) => {
            const isActive = selectedOrderType === ot.key;
            return (
              <button
                key={ot.key}
                type="button"
                onClick={() => setSelectedOrderType(ot.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? '#170e5e' : '#cbd5e1'}`,
                  backgroundColor: isActive ? '#170e5e' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  boxShadow: isActive ? '0 2px 6px rgba(23, 14, 94, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {ot.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert toast for recall or info */}
      {lastRecallMessage && (
        <div
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 20px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 800,
            boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
          }}
        >
          {lastRecallMessage}
        </div>
      )}

      {/* 4. Main Tickets Grid or Executive Standby State */}
      <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {isLoading && !tickets.length ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50vh',
              gap: '12px',
            }}
          >
            <ClockIcon size={36} color="#64748b" />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#64748b' }}>
              جاري مزامنة تذاكر المطبخ النشطة...
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div
            style={{
              maxWidth: '850px',
              margin: '20px auto 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Standby Command Center Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '36px',
                textAlign: 'center',
                boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckIcon size={28} color="#16a34a" strokeWidth={2.5} />
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    display: 'inline-block',
                  }}
                />
                <span>جميع المحطات متصلة وبوضع الجاهزية التامة</span>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                لا توجد طلبات معلقة بالمطبخ في الوقت الراهن
              </h2>
              <p
                style={{
                  margin: '0 auto',
                  fontSize: '13px',
                  color: '#64748b',
                  maxWidth: '520px',
                  lineHeight: 1.6,
                }}
              >
                بمجرد تأكيد فواتير البيع من الكاشير أو إرسال الزبائن لطلبات الطاولات عبر رمز الـ QR، ستظهر تذاكر الوجبات هنا فورياً بالصوت والصورة لتوزيعها على المحطات.
              </p>
            </div>

            {/* Live Stations Monitor Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { name: 'المطبخ الساخن', status: 'جاهز ونشط', icon: <FlameIcon size={16} color="#16a34a" /> },
                { name: 'المشويات والشواية', status: 'جاهز ونشط', icon: <UtensilsIcon size={16} color="#16a34a" /> },
                { name: 'المشروبات والبار', status: 'جاهز ونشط', icon: <SparklesIcon size={16} color="#16a34a" /> },
                { name: 'المخبوزات والحلويات', status: 'جاهز ونشط', icon: <CheckIcon size={16} color="#16a34a" strokeWidth={2.5} /> },
              ].map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{st.name}</div>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                      {st.status}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {st.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {tickets.map((ticket) => {
              const urgency = getUrgencyBadge(ticket.urgencyLevel, ticket.elapsedMinutes);
              const orderType = getOrderTypeBadge(ticket.orderType, ticket.tableNumber);

              return (
                <div
                  key={ticket.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: `1px solid ${
                      ticket.urgencyLevel === 'critical'
                        ? '#ef4444'
                        : ticket.urgencyLevel === 'warning'
                        ? '#f59e0b'
                        : '#e2e8f0'
                    }`,
                    borderTop: `4px solid ${urgency.topColor}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow:
                      ticket.urgencyLevel === 'critical'
                        ? '0 6px 20px rgba(239, 68, 68, 0.15)'
                        : '0 4px 16px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '12px 14px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: '#0f172a',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {ticket.orderNumber}
                        </span>
                        <span
                          style={{
                            backgroundColor: orderType.bg,
                            border: `1px solid ${orderType.border}`,
                            color: orderType.text,
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {orderType.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginTop: '2px',
                          fontWeight: 600,
                        }}
                      >
                        {ticket.customerName ? `العميل: ${ticket.customerName}` : ''}
                        {ticket.cashierName ? ` • الكاشير: ${ticket.cashierName}` : ''}
                      </div>
                    </div>

                    {/* Elapsed Timer Tag */}
                    <div
                      style={{
                        backgroundColor: urgency.bg,
                        color: urgency.text,
                        border: `1px solid ${urgency.border}`,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace' }}>
                        {formatElapsed(ticket.elapsedSeconds)}
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 800 }}>{urgency.indicator}</div>
                    </div>
                  </div>

                  {/* Ticket Items List */}
                  <div style={{ padding: '12px 14px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {ticket.items.map((item) => {
                        const isDone = item.status === 'ready';

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              const nextStatus: KdsItemStatus = isDone ? 'cooking' : 'ready';
                              itemStatusMutation.mutate({
                                ticketId: ticket.id,
                                itemId: item.id,
                                status: nextStatus,
                              });
                            }}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: isDone ? '#f8fafc' : '#ffffff',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: `1px solid ${isDone ? '#e2e8f0' : '#cbd5e1'}`,
                              transition: 'all 0.15s ease',
                              opacity: isDone ? 0.65 : 1,
                            }}
                            title="انقر لتأكيد تجهيز الصنف والشطب عليه"
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 900,
                                    color: isDone ? '#94a3b8' : '#170e5e',
                                    backgroundColor: isDone ? '#e2e8f0' : 'rgba(23, 14, 94, 0.08)',
                                    padding: '2px 6px',
                                    borderRadius: '5px',
                                  }}
                                >
                                  {item.qty}×
                                </span>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: isDone ? '#94a3b8' : '#0f172a',
                                    textDecoration: isDone ? 'line-through' : 'none',
                                  }}
                                >
                                  {item.name}
                                </span>
                              </div>

                              <span
                                style={{
                                  fontSize: '11px',
                                  color: isDone ? '#16a34a' : '#94a3b8',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {isDone ? (
                                  <>
                                    <CheckIcon size={12} color="#16a34a" strokeWidth={2.5} />
                                    <span style={{ fontWeight: 800 }}>تم</span>
                                  </>
                                ) : (
                                  <ClockIcon size={12} color="#94a3b8" />
                                )}
                              </span>
                            </div>

                            {/* Modifiers & Extra notes */}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div
                                style={{
                                  marginTop: '3px',
                                  paddingRight: '24px',
                                  fontSize: '11px',
                                  color: '#b45309',
                                  fontWeight: 600,
                                }}
                              >
                                {item.modifiers.map((m, idx) => (
                                  <div key={idx}>+ {m.name}</div>
                                ))}
                              </div>
                            )}

                            {item.notes && (
                              <div
                                style={{
                                  marginTop: '3px',
                                  paddingRight: '24px',
                                  fontSize: '11px',
                                  color: '#dc2626',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <AlertTriangleIcon size={11} color="#dc2626" strokeWidth={2} />
                                <span>{item.notes}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Level Special Note */}
                    {ticket.notes && (
                      <div
                        style={{
                          marginTop: '8px',
                          backgroundColor: '#fffbeb',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertTriangleIcon size={12} color="#92400e" strokeWidth={2} />
                        <span>ملاحظة عامة: {ticket.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer Button */}
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    {ticket.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => advanceMutation.mutate(ticket.id)}
                        disabled={advanceMutation.isPending}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#170e5e',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>بدء التحضير</span>
                      </button>
                    )}

                    {ticket.status === 'cooking' && (
                      <button
                        type="button"
                        onClick={() => advanceMutation.mutate(ticket.id)}
                        disabled={advanceMutation.isPending}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>جاهز للاستلام</span>
                      </button>
                    )}

                    {ticket.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => advanceMutation.mutate(ticket.id)}
                        disabled={advanceMutation.isPending}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>تم التسليم للعميل</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
export default KitchenDisplayPage;
