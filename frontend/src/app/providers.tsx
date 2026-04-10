import { PropsWithChildren } from 'react';
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/http';

function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return false;
    }
  }

  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: shouldRetry,
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      placeholderData: keepPreviousData
    },
    mutations: {
      retry: false
    }
  }
});

export function AppProviders({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
