import { useMemo } from 'react';
import { useAccountsPage } from '@/features/accounts/hooks/useAccountsPage';

export function useAccountsRouteState(
  selectedCustomerId: string,
  selectedSupplierId: string,
  customerLedgerParams: { page: number; pageSize: number; search: string },
  supplierLedgerParams: { page: number; pageSize: number; search: string }
) {
  const queries = useAccountsPage(selectedCustomerId, selectedSupplierId, customerLedgerParams, supplierLedgerParams);

  const state = useMemo(() => {
    const customers = queries.customersQuery.data || [];
    const suppliers = queries.suppliersQuery.data || [];
    const customerBalanceOptions = queries.customerBalancesQuery.data || [];
    const supplierBalanceOptions = queries.supplierBalancesQuery.data || [];
    const customerEntries = queries.customerLedgerQuery.data?.entries || [];
    const supplierEntries = queries.supplierLedgerQuery.data?.entries || [];

    return {
      customers,
      suppliers,
      customerBalanceOptions,
      supplierBalanceOptions,
      customerEntries,
      supplierEntries,
      customerLedgerSummary: queries.customerLedgerQuery.data?.summary || null,
      supplierLedgerSummary: queries.supplierLedgerQuery.data?.summary || null,
      customerLedgerPagination: queries.customerLedgerQuery.data?.pagination || null,
      supplierLedgerPagination: queries.supplierLedgerQuery.data?.pagination || null
    };
  }, [
    queries.customersQuery.data,
    queries.suppliersQuery.data,
    queries.customerBalancesQuery.data,
    queries.supplierBalancesQuery.data,
    queries.customerLedgerQuery.data,
    queries.supplierLedgerQuery.data
  ]);

  return {
    ...queries,
    ...state
  };
}
