import { useSuppliersPageQuery } from '@/features/suppliers/hooks/useSuppliersPageQuery';
import type { SuppliersListParams } from '@/features/suppliers/api/suppliers.api';

export function useSuppliersPage(params: SuppliersListParams = {}) {
  return useSuppliersPageQuery({ page: 1, pageSize: 20, filter: 'all', ...params });
}
