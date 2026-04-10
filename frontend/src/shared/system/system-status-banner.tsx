import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NETWORK_STATE_EVENT, APP_UNAUTHORIZED_EVENT } from '@/lib/http';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { useAuthStore } from '@/stores/auth-store';

function normalizeReason(search: string) {
  const params = new URLSearchParams(search);
  const reason = params.get('reason');
  if (reason === 'expired') return 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.';
  if (reason === 'signed-out') return 'تم تسجيل الخروج من النظام.';
  return '';
}

export function SystemStatusBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [reconnected, setReconnected] = useState(false);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearReconnectTimer() {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function handleOffline() {
      clearReconnectTimer();
      setReconnected(false);
      setIsOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
      setReconnected(true);
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        setReconnected(false);
        reconnectTimerRef.current = null;
      }, 3500);
    }

    function handleUnauthorized() {
      void resetAuthenticatedClient(queryClient, clearSession);
      if (location.pathname !== '/login') {
        navigate('/login?reason=expired', { replace: true });
      }
    }

    function handleNetworkState(event: Event) {
      const detail = (event as CustomEvent<{ online?: boolean }>).detail;
      if (typeof detail?.online === 'boolean') {
        setIsOffline(!detail.online);
      }
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener(APP_UNAUTHORIZED_EVENT, handleUnauthorized);
    window.addEventListener(APP_NETWORK_STATE_EVENT, handleNetworkState as EventListener);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(APP_UNAUTHORIZED_EVENT, handleUnauthorized);
      window.removeEventListener(APP_NETWORK_STATE_EVENT, handleNetworkState as EventListener);
      clearReconnectTimer();
    };
  }, [clearSession, location.pathname, navigate, queryClient]);

  const loginReason = useMemo(() => (location.pathname === '/login' ? normalizeReason(location.search) : ''), [location.pathname, location.search]);

  if (!isOffline && !reconnected && !loginReason) {
    return null;
  }

  if (isOffline) {
    return <div className="system-banner system-banner-warning">لا يوجد اتصال بالشبكة حاليًا. بعض العمليات قد لا تعمل حتى يعود الاتصال.</div>;
  }

  if (loginReason) {
    return <div className="system-banner system-banner-warning">{loginReason}</div>;
  }

  return <div className="system-banner system-banner-success">تم استعادة الاتصال. يمكنك متابعة العمل بشكل طبيعي.</div>;
}
