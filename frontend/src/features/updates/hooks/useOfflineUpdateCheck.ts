import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latest?: string;
  changelog?: string;
  patchUrl?: string;
  promotedAt?: string;
}

/**
 * Calls the central SaaS server's /api/updates/check endpoint to detect
 * if a newer stable offline release is available.
 *
 * Only runs when the app is in "desktop" deployment mode.
 */
export function useOfflineUpdateCheck(deploymentMode: string | null | undefined) {
  const isDesktop = deploymentMode === 'desktop';

  // Read version injected at build time by Vite define (see vite.config.ts).
  // Falls back to '0.0.0' so the server always returns hasUpdate if a release exists.
  const currentVersion =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  return useQuery<UpdateCheckResult>({
    queryKey: ['offline-update-check', currentVersion],
    queryFn: () =>
      http<UpdateCheckResult>(`/api/updates/check?version=${encodeURIComponent(currentVersion)}`),
    enabled: isDesktop,
    // Check once on mount, then again every 2 hours
    staleTime: 2 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
    // Don't spam the server on failures — retry only once
    retry: 1,
    // Show stale data while refetching
    refetchIntervalInBackground: false,
  });
}
