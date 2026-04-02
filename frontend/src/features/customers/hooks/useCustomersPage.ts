import { useCustomersPageQuery } from '@/features/customers/hooks/useCustomersPageQuery';
import type { CustomersListParams } from '@/features/customers/api/customers.api';

export function useCustomersPage(params: CustomersListParams = {}) {
  return useCustomersPageQuery({ page: 1, pageSize: 20, filter: 'all', ...params });
}
