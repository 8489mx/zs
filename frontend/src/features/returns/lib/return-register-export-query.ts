import type { ReturnsListParams } from '@/features/returns/api/returns.api';

export type ReturnRegisterExportFilters = {
  search: string;
  filter: 'all' | 'sales' | 'purchase' | 'today';
  employee?: string;
};

/** Print and Excel must use the exact same filters as the onscreen register. */
export function buildReturnRegisterExportQuery(filters: ReturnRegisterExportFilters): ReturnsListParams {
  return { search: filters.search, filter: filters.filter, employee: (filters.employee || '').trim() };
}
