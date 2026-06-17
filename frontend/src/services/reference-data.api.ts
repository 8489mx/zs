import { http } from '@/lib/http';
import { unwrapArray, unwrapByKey } from '@/lib/api/contracts';
import type { AppSettings, Branch, Location } from '@/types/domain';

export const referenceDataApi = {
  settings: async () => unwrapByKey<AppSettings>(await http<AppSettings | { settings: AppSettings }>('/api/settings'), 'settings', {} as AppSettings),
  branches: async () => unwrapArray<Branch>(await http<Branch[] | { branches: Branch[] }>('/api/branches'), 'branches'),
  locations: async () => unwrapArray<Location>(await http<Location[] | { locations: Location[] }>('/api/locations'), 'locations'),
  costCenters: async () => unwrapArray<any>(await http<any>('/api/accounting/cost-centers'), 'costCenters'),
  projects: async () => unwrapArray<any>(await http<any>('/api/accounting/projects'), 'projects')
};
