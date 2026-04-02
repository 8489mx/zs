import { useMemo } from 'react';
import { useSettingsPage } from '@/features/settings/hooks/useSettingsPage';

export function useSettingsRouteState() {
  const queries = useSettingsPage();

  const state = useMemo(() => {
    const settings = queries.settingsQuery.data;
    const branches = queries.branchesQuery.data || [];
    const locations = queries.locationsQuery.data || [];

    return {
      settings,
      branches,
      locations,
      hasBranches: branches.length > 0,
      hasLocations: locations.length > 0
    };
  }, [queries.settingsQuery.data, queries.branchesQuery.data, queries.locationsQuery.data]);

  return {
    ...queries,
    ...state
  };
}
