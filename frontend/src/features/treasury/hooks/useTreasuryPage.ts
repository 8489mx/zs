import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { treasuryApi, type ExpensesQueryParams, type TreasuryTransactionsQueryParams } from '@/features/treasury/api/treasury.api';
import { referenceDataApi } from '@/services/reference-data.api';
import { useTreasury } from '@/features/treasury/hooks/useTreasury';

function makeExpenseParamsKey(params: ExpensesQueryParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    search: params.search || '',
  });
}

export function useTreasuryPage(transactionParams: TreasuryTransactionsQueryParams, expenseParams: ExpensesQueryParams) {
  const transactionsQuery = useTreasury(transactionParams);
  const expensesQuery = useQuery({
    queryKey: queryKeys.expensesPage(makeExpenseParamsKey(expenseParams)),
    queryFn: () => treasuryApi.expenses(expenseParams),
    placeholderData: (previous) => previous,
  });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: referenceDataApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });
  return {
    transactionsQuery,
    expensesQuery,
    branchesQuery,
    locationsQuery,
    transactionRows: transactionsQuery.data?.rows || [],
    transactionSummary: transactionsQuery.data?.summary || { cashIn: 0, cashOut: 0, net: 0 },
    transactionPagination: transactionsQuery.data?.pagination,
    expenses: expensesQuery.data?.rows || [],
    expenseSummary: expensesQuery.data?.summary || { totalItems: 0, totalAmount: 0 },
    expensePagination: expensesQuery.data?.pagination,
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || [],
  };
}
