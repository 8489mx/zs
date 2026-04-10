import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { productsApi } from '@/features/products/api/products.api';
import { salesApi } from '@/features/sales/api/sales.api';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { customersApi } from '@/features/customers/api/customers.api';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import { settingsApi } from '@/features/settings/api/settings.api';

export function useProductsQuery() {
  return useQuery({ queryKey: queryKeys.products, queryFn: productsApi.list });
}

export function useSalesQuery() {
  return useQuery({ queryKey: queryKeys.sales, queryFn: salesApi.list });
}

export function usePurchasesQuery() {
  return useQuery({ queryKey: queryKeys.purchases, queryFn: purchasesApi.list });
}

export function useCustomersQuery() {
  return useQuery({ queryKey: queryKeys.customers, queryFn: customersApi.list });
}

export function useSuppliersQuery() {
  return useQuery({ queryKey: queryKeys.suppliers, queryFn: suppliersApi.list });
}

export function useCategoriesQuery() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: productsApi.categories });
}

export function useSettingsQuery() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: settingsApi.settings });
}

export function useBranchesQuery() {
  return useQuery({ queryKey: queryKeys.branches, queryFn: settingsApi.branches });
}

export function useLocationsQuery() {
  return useQuery({ queryKey: queryKeys.locations, queryFn: settingsApi.locations });
}
