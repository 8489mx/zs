import { queryClient } from '@/app/providers';
import { queryKeys } from '@/app/query-keys';
import { salesApi } from '@/features/sales/api/sales.api';
import { productsApi } from '@/features/products/api/products.api';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { reportsApi } from '@/features/reports/api/reports.api';
import { accountsApi } from '@/features/accounts/api/accounts.api';

const prefetchedPaths = new Set<string>();

export function prefetchRouteData(to: string) {
  if (typeof window === 'undefined') return;
  const path = to.split('?')[0].replace(/^\//, '').split('/')[0] || '';
  if (prefetchedPaths.has(path)) return;
  prefetchedPaths.add(path);

  try {
    switch (path) {
      case 'sales':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.sales,
          queryFn: () => salesApi.listPage({ page: 1, pageSize: 30 }),
          staleTime: 60_000,
        });
        break;
      case 'products':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.products,
          queryFn: () => productsApi.listPage({ page: 1, pageSize: 20 }),
          staleTime: 60_000,
        });
        break;
      case 'purchases':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.purchases,
          queryFn: () => purchasesApi.listPage({ page: 1, pageSize: 25 }),
          staleTime: 60_000,
        });
        break;
      case 'inventory':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.inventoryReport,
          queryFn: () => reportsApi.inventory(),
          staleTime: 60_000,
        });
        break;
      case 'accounts':
      case 'customers':
      case 'suppliers':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.customerBalances,
          queryFn: () => accountsApi.listCustomersWithDebt(),
          staleTime: 60_000,
        });
        break;
      case 'reports': {
        const today = new Date().toISOString().slice(0, 10);
        void queryClient.prefetchQuery({
          queryKey: ['reports-summary', today, today],
          queryFn: () => reportsApi.summary(today, today),
          staleTime: 60_000,
        });
        break;
      }
    }
  } catch {}
}
