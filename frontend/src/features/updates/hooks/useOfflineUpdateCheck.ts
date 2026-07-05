import { useQuery } from '@tanstack/react-query';

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

  // We now rely purely on the frontend build-time constant as the single source of truth
  // to ensure consistency between UI version and update check version.

  // Resolve version: prefer frontend build-time constant as the single source of truth
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  // Step 2 — check if a newer stable release exists
  const checkUpdatesUrl = `https://app.karimzakaria.com/api/updates/check?version=${encodeURIComponent(currentVersion)}`;

  return useQuery<UpdateCheckResult>({
    queryKey: ['offline-update-check', currentVersion],
    queryFn: async () => {
      console.log('--- [DEBUG: UPDATE CHECKER] ---');
      console.log('1. currentAppVersion (source: build-time __APP_VERSION__):', currentVersion);
      console.log('2. updateCheckUrl:', checkUpdatesUrl);
      console.log('3. APP_MODE (Electron):', window.process?.env?.APP_MODE || 'UNKNOWN (Renderer)');
      console.log('4. Online status:', navigator.onLine ? 'ONLINE' : 'OFFLINE');

      if (!navigator.onLine) {
        console.log('   -> Device is offline. Update check aborted.');
        return { hasUpdate: false };
      }

      try {
        const res = await fetch(checkUpdatesUrl, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
          console.log(`   -> Failed to fetch updates. Status: ${res.status}`);
          return { hasUpdate: false };
        }

        const data = await res.json();
        console.log('5. latestRelease response:', data);

        const latestVersion = data.latest;
        console.log(`6. Comparing: latestVersion (${latestVersion}) vs currentAppVersion (${currentVersion})`);
        console.log('7. patchUrl:', data.patchUrl);
        console.log('8. changelog:', data.changelog);

        if (data.hasUpdate) {
          console.log('   -> RESULT: isUpdateAvailable = TRUE (latestVersion > currentAppVersion). Displaying alert.');
        } else {
          console.log('   -> RESULT: isUpdateAvailable = FALSE (latestVersion <= currentAppVersion). No alert shown.');
        }
        console.log('---------------------------------');
        
        return data as UpdateCheckResult;
      } catch (err) {
        console.error('   -> Error checking for updates:', err);
        return { hasUpdate: false };
      }
    },
    enabled: isDesktop,
    staleTime: 2 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
    retry: 1,
    refetchIntervalInBackground: false,
  });
}
