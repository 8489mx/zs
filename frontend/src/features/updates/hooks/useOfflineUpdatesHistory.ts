import { useQuery } from '@tanstack/react-query';

export interface UpdateHistoryRecord {
  version: string;
  changelog: string;
  patchUrl: string;
  promotedAt: string;
}

export function useOfflineUpdatesHistory(deploymentMode: string | null | undefined) {
  const isDesktop = deploymentMode === 'desktop' || import.meta.env.DEV;

  return useQuery<UpdateHistoryRecord[]>({
    queryKey: ['offline-updates-history'],
    queryFn: async () => {
      try {
        const baseUrl = import.meta.env.VITE_OFFLINE_UPDATE_API_BASE_URL || 'https://api.karimzakaria.com';
        const response = await fetch(`${baseUrl}/api/updates/history`);
        if (!response.ok) {
          throw new Error('Failed to fetch update history');
        }
        const data = await response.json();
        return data as UpdateHistoryRecord[];
      } catch (err) {
        console.error('Failed to fetch updates history:', err);
        return [];
      }
    },
    enabled: isDesktop,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
