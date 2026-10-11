import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStatusBoard } from '@/features/pos/hooks/useOrderStatusBoard';
import { ClockIcon, CheckCircleIcon, RefreshCwIcon, ArrowRightIcon } from '@/shared/components/icons/AppIcons';

export function OrderStatusBoardPage() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const previousReadyIdsRef = useRef<Set<number>>(new Set());
  const [newlyReadyId, setNewlyReadyId] = useState<number | null>(null);

  // Digital clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio acoustic chime for order ready
  const playReadyChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Double melodic tone: C5 -> G5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.25); // G5
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.7);
    } catch {
      // Audio playback silently guarded
    }
  };

  // Poll KDS tickets via feature hook
  const { preparingTickets, readyTickets, refetch, isFetching } = useOrderStatusBoard();

  // Detect newly ready tickets to trigger acoustic chime
  useEffect(() => {
    const currentReadyIds = new Set(readyTickets.map((t) => t.id));
    if (previousReadyIdsRef.current.size > 0) {
      for (const id of currentReadyIds) {
        if (!previousReadyIdsRef.current.has(id)) {
          if (soundEnabled) playReadyChime();
          setNewlyReadyId(id);
          const t = setTimeout(() => setNewlyReadyId(null), 8000);
          return () => clearTimeout(t);
        }
      }
    }
    previousReadyIdsRef.current = currentReadyIds;
  }, [readyTickets, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0f1d',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          background: '#0f172a',
          borderBottom: '2px solid #1e293b',
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/displays')}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <ArrowRightIcon size={14} color="#94a3b8" />
            <span>بوابة الشاشات</span>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              شاشة إعلان جاهزية الطلبات (Pickup & Order Status Board)
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              صالة الانتظار والاستلام • تحديث لحظي مباشر
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Live Clock Ticker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 16px',
            }}
          >
            <ClockIcon size={16} color="#38bdf8" />
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
              {currentTime}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? '#14532d' : '#1e293b',
              border: soundEnabled ? '1px solid #22c55e' : '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 14px',
              color: soundEnabled ? '#86efac' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? 'التنبيه الصوتي: مفعل' : 'التنبيه الصوتي: صامت'}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: '#170e5e',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '6px 16px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ملء الشاشة (TV Mode)
          </button>
        </div>
      </header>

      {/* Main Dual Columns Content */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '20px 24px',
          overflow: 'hidden',
        }}
      >
        {/* COLUMN 1: PREPARING (قيد التجهيز) */}
        <section
          style={{
            background: '#0d1527',
            border: '2px solid #1e293b',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
              borderBottom: '2px solid #334155',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#fef3c7' }}>
                قيد التجهيز (Preparing)
              </h2>
            </div>
            <span
              style={{
                background: '#78350f',
                color: '#fef3c7',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.88rem',
                fontWeight: 800,
              }}
            >
              {preparingTickets.length} طلب
            </span>
          </div>

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '14px',
              alignContent: 'start',
            }}
          >
            {preparingTickets.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#475569',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                لا توجد طلبات قيد التحضير حالياً.
              </div>
            ) : (
              preparingTickets.map((t) => {
                const orderNum = t.orderNumber || t.docNo || `#${t.id}`;
                return (
                  <div
                    key={t.id}
                    style={{
                      background: '#131e36',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '14px 12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em' }}>
                      {orderNum}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {t.tableNumber && (
                        <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          طاولة {t.tableNumber}
                        </span>
                      )}
                      {t.aggregatorChannel ? (
                        <span style={{ background: '#78350f', color: '#fef3c7', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          {t.aggregatorChannel}
                        </span>
                      ) : (
                        <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {t.orderType === 'dine_in' ? 'صالة' : t.orderType === 'takeaway' ? 'سفري' : 'توصيل'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* COLUMN 2: READY FOR PICKUP (جاهز للاستلام) */}
        <section
          style={{
            background: '#09211c',
            border: '2px solid #166534',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(90deg, #14532d 0%, #064e3b 100%)',
              borderBottom: '2px solid #22c55e',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#dcfce7' }}>
                جاهز للاستلام (Ready for Pickup)
              </h2>
            </div>
            <span
              style={{
                background: '#15803d',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.88rem',
                fontWeight: 800,
              }}
            >
              {readyTickets.length} جاهز
            </span>
          </div>

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '14px',
              alignContent: 'start',
            }}
          >
            {readyTickets.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#166534',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                بانتظار تجهيز الطلبات من المطبخ...
              </div>
            ) : (
              readyTickets.map((t) => {
                const isPulse = newlyReadyId === t.id;
                const orderNum = t.orderNumber || t.docNo || `#${t.id}`;
                return (
                  <div
                    key={t.id}
                    style={{
                      background: isPulse ? '#14532d' : '#063f2e',
                      border: isPulse ? '2px solid #4ade80' : '1px solid #16a34a',
                      borderRadius: '12px',
                      padding: '14px 12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isPulse ? '0 0 20px rgba(74, 222, 128, 0.4)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4ade80', letterSpacing: '0.04em' }}>
                      {orderNum}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {t.tableNumber && (
                        <span style={{ background: '#14532d', color: '#bbf7d0', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          طاولة {t.tableNumber}
                        </span>
                      )}
                      {t.aggregatorChannel ? (
                        <span style={{ background: '#166534', color: '#ffffff', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          {t.aggregatorChannel}
                        </span>
                      ) : (
                        <span style={{ background: '#14532d', color: '#bbf7d0', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {t.orderType === 'dine_in' ? 'صالة' : t.orderType === 'takeaway' ? 'سفري' : 'توصيل'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Bottom Footer Info */}
      <footer
        style={{
          background: '#090d16',
          borderTop: '1px solid #1e293b',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: '#64748b',
        }}
      >
        <span>يرجى التوجه إلى كاونتر الاستلام فور ظهور رقم طلبك في قائمة «جاهز للاستلام».</span>
        <span>منظومة Z-Systems ERP • شاشة عرض العملاء والتوصيل</span>
      </footer>
    </div>
  );
}
export default OrderStatusBoardPage;
