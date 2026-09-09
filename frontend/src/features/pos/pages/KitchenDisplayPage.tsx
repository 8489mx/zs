import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  kdsApi,
  KdsStation,
  KdsItemStatus,
} from '@/features/pos/api/kds.api';
import { ClockIcon } from '@/shared/components/icons/AppIcons';
import { KdsHeader } from '../components/kds/KdsHeader';
import { KdsKpiStrip } from '../components/kds/KdsKpiStrip';
import { KdsFilterBar } from '../components/kds/KdsFilterBar';
import { KdsStandbyState } from '../components/kds/KdsStandbyState';
import { KdsTicketCard } from '../components/kds/KdsTicketCard';

export function KitchenDisplayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<KdsStation>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  const handleBack = () => {
    navigate('/displays');
  };

  // Keyboard navigation & Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        (e.altKey && e.key === 'Backspace') ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      ) {
        if (!document.fullscreenElement) {
          handleBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
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
        setLastRecallMessage('تم استرجاع آخر طلب بنجاح إلى شاشة التجهيز');
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
      <KdsHeader
        currentTime={currentTime}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          if (next) playNewOrderChime();
        }}
        onRecallLastServed={() => recallMutation.mutate()}
        isRecalling={recallMutation.isPending}
        onToggleFullscreen={handleToggleFullscreen}
        onBack={handleBack}
      />

      {/* 2. Executive Kitchen KPI Strip */}
      <KdsKpiStrip stats={stats} />

      {/* 3. Filter Bar */}
      <KdsFilterBar
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        selectedOrderType={selectedOrderType}
        onSelectOrderType={setSelectedOrderType}
      />

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
          <KdsStandbyState />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {tickets.map((ticket) => (
              <KdsTicketCard
                key={ticket.id}
                ticket={ticket}
                onAdvanceStatus={(id) => advanceMutation.mutate(id)}
                isAdvancing={advanceMutation.isPending}
                onItemStatusChange={(tId, iId, status) =>
                  itemStatusMutation.mutate({ ticketId: tId, itemId: iId, status })
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default KitchenDisplayPage;
