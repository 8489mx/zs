import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_STORE_NAME, DEFAULT_THEME } from '@/config/app-defaults';
import { ApiError } from '@/lib/http';
import { clearQueryClientData } from '@/lib/query-client-session';
import { authApi } from '@/shared/api/auth';
import { useAuthStore } from '@/stores/auth-store';

export function useBootstrapAuth() {
  const hasRun = useRef(false);
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const markInitialized = useAuthStore((state) => state.markInitialized);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    authApi
      .me()
      .then((response) => {
        setSession({
          user: {
            ...response.user,
            mustChangePassword: response.security?.mustChangePassword === true,
            usingDefaultAdminPassword: response.security?.usingDefaultAdminPassword === true,
          },
          storeName: response.settings.storeName || DEFAULT_STORE_NAME,
          theme: response.settings.theme || DEFAULT_THEME
        });
      })
      .catch(async (error) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('bootstrap_auth_failed', error);
        }
        await clearQueryClientData(queryClient);
        clearSession();
      })
      .finally(() => {
        markInitialized();
      });
  }, [clearSession, markInitialized, queryClient, setSession]);
}
