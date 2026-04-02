import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { matchTransactionSearch, sumTransactionTotals } from '@/lib/domain/transactions';

export function usePurchasesOverview(search: string) {
  const purchasesQuery = useQuery({ queryKey: queryKeys.purchases, queryFn: purchasesApi.list });

  const filteredRows = useMemo(() => {
    const rows = purchasesQuery.data || [];
    return rows.filter((purchase) => matchTransactionSearch(purchase, search));
  }, [purchasesQuery.data, search]);

  const totals = useMemo(() => sumTransactionTotals(filteredRows), [filteredRows]);

  return { purchasesQuery, filteredRows, totals };
}
