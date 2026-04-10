import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { accountsApi } from '@/features/accounts/api/accounts.api';

export function useAccountsPage(
  selectedCustomerId: string,
  selectedSupplierId: string,
  customerLedgerParams: { page: number; pageSize: number; search: string },
  supplierLedgerParams: { page: number; pageSize: number; search: string }
) {
  const customersQuery = useQuery({ queryKey: queryKeys.customers, queryFn: accountsApi.customers });
  const suppliersQuery = useQuery({ queryKey: queryKeys.suppliers, queryFn: accountsApi.suppliers });
  const customerBalancesQuery = useQuery({ queryKey: queryKeys.customerBalances, queryFn: accountsApi.customerBalances });
  const supplierBalancesQuery = useQuery({ queryKey: ['supplier-balances'], queryFn: accountsApi.supplierBalances });

  const customerLedgerParamsKey = JSON.stringify(customerLedgerParams);
  const supplierLedgerParamsKey = JSON.stringify(supplierLedgerParams);

  const customerLedgerQuery = useQuery({
    queryKey: queryKeys.customerLedgerPage(selectedCustomerId, customerLedgerParamsKey),
    queryFn: () => accountsApi.customerLedger(selectedCustomerId, customerLedgerParams),
    enabled: !!selectedCustomerId
  });

  const supplierLedgerQuery = useQuery({
    queryKey: queryKeys.supplierLedgerPage(selectedSupplierId, supplierLedgerParamsKey),
    queryFn: () => accountsApi.supplierLedger(selectedSupplierId, supplierLedgerParams),
    enabled: !!selectedSupplierId
  });

  return {
    customersQuery,
    suppliersQuery,
    customerBalancesQuery,
    supplierBalancesQuery,
    customerLedgerQuery,
    supplierLedgerQuery
  };
}
