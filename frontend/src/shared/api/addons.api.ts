import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';

export interface Addon {
  id?: number | string;
  name: string;
  price: number;
  costPrice?: number;
  isActive?: boolean;
}

export const addonsApi = {
  list: async () => unwrapArray<Addon>(await http<Addon[] | { addons: Addon[] }>('/api/addons'), 'addons'),
  create: (payload: Omit<Addon, 'id'>) => http<Addon>('/api/addons', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string | number, payload: Partial<Addon>) => http<Addon>(`/api/addons/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string | number) => http<{ ok: boolean }>(`/api/addons/${id}`, { method: 'DELETE' }),
};
