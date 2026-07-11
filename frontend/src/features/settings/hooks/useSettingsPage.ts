import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { settingsApi } from '@/features/settings/api/settings.api';
import { referenceDataApi } from '@/services/reference-data.api';

export function useSettingsPage() {
  const settingsQuery = useQuery({ queryKey: queryKeys.settings, queryFn: settingsApi.settings });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: referenceDataApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });
  return { settingsQuery, branchesQuery, locationsQuery };
}
