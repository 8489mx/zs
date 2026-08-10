import { PropsWithChildren, useEffect } from 'react';
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/http';
import { LocaleProvider } from '@/shared/locale/LocaleProvider';
import { SystemAlertProvider } from '@/shared/components/system-alert';

import { useAuthStore } from '@/stores/auth-store';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useAuthStore((state) => state.theme);
  const { data: settings } = useSettingsQuery();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings?.accentColor) {
      root.style.setProperty('--primary', settings.accentColor);
      root.style.setProperty('--primary-color', settings.accentColor);
      // Fallback for primary2 if not separately defined
      root.style.setProperty('--primary2', settings.accentColor);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-color');
      root.style.removeProperty('--primary2');
    }
  }, [settings?.accentColor]);

  return <>{children}</>;
}

function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return false;
    }
  }

  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnReconnect: true,
      retry: shouldRetry,
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      placeholderData: keepPreviousData,
      networkMode: 'always'
    },
    mutations: {
      retry: false,
      networkMode: 'always'
    }
  }
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SystemAlertProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </SystemAlertProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
