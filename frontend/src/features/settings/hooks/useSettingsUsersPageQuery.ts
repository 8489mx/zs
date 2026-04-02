import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { settingsApi, type ManagedUsersQueryParams } from '@/features/settings/api/settings.api';

function makeParamsKey(params: ManagedUsersQueryParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    search: params.search || '',
    filter: params.filter || 'all',
  });
}

export function useSettingsUsersPageQuery(params: ManagedUsersQueryParams) {
  const paramsKey = makeParamsKey(params);
  return useQuery({
    queryKey: queryKeys.settingsUsersPage(paramsKey),
    queryFn: () => settingsApi.usersPage(params),
    placeholderData: (previous) => previous,
  });
}
