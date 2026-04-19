import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';

export const userDirectoryApi = {
  users: async () => unwrapArray<ManagedUserRecord>(await http<ManagedUserRecord[] | { users: ManagedUserRecord[] }>('/api/users'), 'users'),
};
