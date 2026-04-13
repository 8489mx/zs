import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_STORE_NAME, DEFAULT_THEME } from '@/config/app-defaults';
import { ApiError } from '@/lib/http';
import { clearQueryClientData } from '@/lib/query-client-session';
import { authApi } from '@/shared/api/auth';
import { activationApi } from '@/shared/api/activation';
import { useAuthStore } from '@/stores/auth-store';

export function useBootstrapAuth() {
  const hasRun = useRef(false);
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setAppGate = useAuthStore((state) => state.setAppGate);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    activationApi
      .status()
      .then(async (status) => {
        if (status.activationRequired && !status.activated) {
          await clearQueryClientData(queryClient);
          clearSession();
          setAppGate('activation', status);
          return;
        }

        if (status.setupRequired) {
          await clearQueryClientData(queryClient);
          clearSession();
          setAppGate('setup', status);
          return;
        }

        try {
          const response = await authApi.me();
          setSession({
            user: {
              ...response.user,
              mustChangePassword: response.security?.mustChangePassword === true,
              usingDefaultAdminPassword: response.security?.usingDefaultAdminPassword === true,
            },
            storeName: response.settings.storeName || DEFAULT_STORE_NAME,
            theme: response.settings.theme || DEFAULT_THEME,
          });
          setAppGate('ready', status);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            console.error('bootstrap_auth_failed', error);
          }
          await clearQueryClientData(queryClient);
          clearSession();
          setAppGate('login', status);
        }
      })
      .catch(async (error) => {
        console.error('activation_status_failed', error);
        await clearQueryClientData(queryClient);
        clearSession();
        setAppGate('login');
      });
  }, [clearSession, queryClient, setAppGate, setSession]);
}
