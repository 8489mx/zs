import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NETWORK_STATE_EVENT, APP_UNAUTHORIZED_EVENT, resetUnauthorizedRecoverySignal } from '@/lib/http';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { useAuthStore } from '@/stores/auth-store';

function normalizeReason(search: string) {
  const params = new URLSearchParams(search);
  const reason = params.get('reason');
  if (reason === 'session-updated') return '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062C\u0644\u0633\u0629. \u0645\u0646 \u0641\u0636\u0644\u0643 \u0633\u062C\u0651\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.';
  if (reason === 'expired') return '\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0644\u0633\u0629. \u0633\u062C\u0651\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.';
  if (reason === 'signed-out') return '\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645.';
  return '';
}

export function SystemStatusBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  // isOffline removed
  const [reconnected, setReconnected] = useState(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const recoveryInProgressRef = useRef(false);

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
      // setIsOffline(true);
    }

    function handleOnline() {
      // setIsOffline(false);
      setReconnected(true);
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        setReconnected(false);
        reconnectTimerRef.current = null;
      }, 3500);
    }

    function handleUnauthorized() {
      if (recoveryInProgressRef.current) return;
      recoveryInProgressRef.current = true;
      void resetAuthenticatedClient(queryClient, clearSession);
      navigate('/login?reason=session-updated', { replace: true });
    }

    function handleNetworkState(event: Event) {
      const detail = (event as CustomEvent<{ online?: boolean }>).detail;
      if (typeof detail?.online === 'boolean') {
        // setIsOffline(!detail.online);
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


  useEffect(() => {
    if (location.pathname === '/login') {
      recoveryInProgressRef.current = false;
      resetUnauthorizedRecoverySignal();
    }
  }, [location.pathname]);

  const loginReason = useMemo(() => (location.pathname === '/login' ? normalizeReason(location.search) : ''), [location.pathname, location.search]);

  if (!reconnected && !loginReason) {
    return null;
  }

  if (loginReason) {
    return <div className="system-banner system-banner-warning">{loginReason}</div>;
  }

  return <div className="system-banner system-banner-success">تم استعادة الاتصال. يمكنك متابعة العمل بشكل طبيعي.</div>;
}
