import { useQuery } from '@tanstack/react-query';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  patchUrl: string | null;
  changelog: string | null;
  releases: Array<{
    version: string;
    changelog: string;
    patchUrl: string;
    promotedAt: string;
  }>;
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
  const isDesktop = deploymentMode === 'desktop' || import.meta.env.DEV;

  // We now rely purely on the frontend build-time constant as the single source of truth
  // to ensure consistency between UI version and update check version.

  // Resolve version: prefer frontend build-time constant as the single source of truth
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  // Step 2 — check if a newer stable release exists
  const baseUrl = import.meta.env.VITE_OFFLINE_UPDATE_API_BASE_URL || 'https://api.karimzakaria.com';
  const checkUpdatesUrl = `${baseUrl}/api/updates/check?version=${encodeURIComponent(currentVersion)}`;

  return useQuery<UpdateCheckResult>({
    queryKey: ['offline-update-check', currentVersion],
    queryFn: async () => {
      const fallback: UpdateCheckResult = {
        updateAvailable: false,
        currentVersion,
        latestVersion: null,
        patchUrl: null,
        changelog: null,
        releases: []
      };

      if (!navigator.onLine) {
        return fallback;
      }

      try {
        const res = await fetch(checkUpdatesUrl, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
          return fallback;
        }

        const data = await res.json();
        return data as UpdateCheckResult;
      } catch (err) {
        console.error('   -> Error checking for updates:', err);
        return fallback;
      }
    },
    enabled: isDesktop,
    staleTime: 2 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
    retry: 1,
    refetchIntervalInBackground: false,
  });
}
