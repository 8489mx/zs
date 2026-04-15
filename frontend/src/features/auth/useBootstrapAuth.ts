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

    const resetTo = async (gate: 'activation' | 'setup' | 'login', status?: Awaited<ReturnType<typeof activationApi.status>>) => {
      await clearQueryClientData(queryClient);
      clearSession();
      setAppGate(gate, status);
    };

    Promise.allSettled([activationApi.status(), authApi.me()])
      .then(async ([statusResult, meResult]) => {
        if (statusResult.status === 'rejected') {
          console.error('activation_status_failed', statusResult.reason);
          await resetTo('login');
          return;
        }

        const status = statusResult.value;

        if (status.activationRequired && !status.activated) {
          await resetTo('activation', status);
          return;
        }

        if (status.setupRequired) {
          await resetTo('setup', status);
          return;
        }

        if (meResult.status === 'fulfilled') {
          const response = meResult.value;
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
          return;
        }

        const error = meResult.reason;
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('bootstrap_auth_failed', error);
        }
        await resetTo('login', status);
      })
      .catch(async (error) => {
        console.error('bootstrap_auth_failed', error);
        await resetTo('login');
      });
  }, [clearSession, queryClient, setAppGate, setSession]);
}
