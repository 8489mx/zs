import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { settingsApi } from '@/features/settings/api/settings.api';

export function useSettingsPage() {
  const settingsQuery = useQuery({ queryKey: queryKeys.settings, queryFn: settingsApi.settings });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: settingsApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.settingsLocations, queryFn: settingsApi.locations });
  return { settingsQuery, branchesQuery, locationsQuery };
}
