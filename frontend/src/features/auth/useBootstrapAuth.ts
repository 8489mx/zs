import { useEffect, useRef } from 'react';
import { authApi } from '@/shared/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/http';

export function useBootstrapAuth() {
  const hasRun = useRef(false);
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
          storeName: response.settings.storeName || 'Z Systems',
          theme: response.settings.theme || 'light'
        });
      })
      .catch((error) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('bootstrap_auth_failed', error);
        }
        clearSession();
      })
      .finally(() => {
        markInitialized();
      });
  }, [clearSession, markInitialized, setSession]);
}
