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
 * In desktop mode:
 *   1. Fetches the currently installed version from /api/updates/version
 *      (written by ApplyAndRestart.ps1 to runtime/run/.app_version after each update).
 *   2. Uses that version to call /api/updates/check?version=X.
 *
 * Falls back to the build-time __APP_VERSION__ if the server endpoint is unavailable.
 * Only runs when deploymentMode === 'desktop'.
 */
export function useOfflineUpdateCheck(deploymentMode: string | null | undefined) {
  const isDesktop = deploymentMode === 'desktop';

  // Step 1 — get the actual running version from the backend
  const versionQuery = useQuery<{ version: string }>({
    queryKey: ['offline-app-version'],
    queryFn: () => http<{ version: string }>('/api/updates/version'),
    enabled: isDesktop,
    staleTime: 60 * 60 * 1000,   // re-check after 1 hour
    retry: 1,
  });

  // Resolve version: prefer backend response, fallback to build-time constant
  const buildVersion =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  const currentVersion = versionQuery.data?.version || buildVersion;

  // Step 2 — check if a newer stable release exists
  return useQuery<UpdateCheckResult>({
    queryKey: ['offline-update-check', currentVersion],
    queryFn: () =>
      http<UpdateCheckResult>(`/api/updates/check?version=${encodeURIComponent(currentVersion)}`),
    // Wait until we have the version (or know we can't get it)
    enabled: isDesktop && !versionQuery.isLoading,
    staleTime: 2 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
    retry: 1,
    refetchIntervalInBackground: false,
  });
}
