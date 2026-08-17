import { useQuery } from '@tanstack/react-query';

export function getOfflineUpdateApiBaseUrl(): string {
  return import.meta.env.VITE_OFFLINE_UPDATE_API_BASE_URL || 'https://api.karimzakaria.com';
}

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

export function useOfflineUpdateCheck(deploymentMode: string | null | undefined) {
  const isDesktop = deploymentMode === 'desktop' || import.meta.env.DEV;
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  const baseUrl = getOfflineUpdateApiBaseUrl();
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
