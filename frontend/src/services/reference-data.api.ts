import { http } from '@/lib/http';
import { unwrapArray, unwrapByKey } from '@/lib/api/contracts';
import type { AppSettings, Branch, Location } from '@/types/domain';

export const referenceDataApi = {
  settings: async () => unwrapByKey<AppSettings>(await http<AppSettings | { settings: AppSettings }>('/api/settings'), 'settings', {} as AppSettings),
  branches: async () => unwrapArray<Branch>(await http<Branch[] | { branches: Branch[] }>('/api/branches'), 'branches'),
  locations: async () => unwrapArray<Location>(await http<Location[] | { locations: Location[] }>('/api/locations'), 'locations')
};
