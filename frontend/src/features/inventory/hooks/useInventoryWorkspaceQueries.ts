import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { inventoryApi } from '@/features/inventory/api/inventory.api';

export function useInventoryWorkspaceQueries(state: {
  transfersPage: number;
  transfersPageSize: number;
  transferFilter: string;
  sessionsPage: number;
  sessionsPageSize: number;
  sessionFilter: string;
  damagedPage: number;
  damagedPageSize: number;
}) {
  const transferParamsKey = JSON.stringify({ page: state.transfersPage, pageSize: state.transfersPageSize, filter: state.transferFilter });
  const sessionParamsKey = JSON.stringify({ page: state.sessionsPage, pageSize: state.sessionsPageSize, filter: state.sessionFilter });
  const damagedParamsKey = JSON.stringify({ page: state.damagedPage, pageSize: state.damagedPageSize });

  const transfersQuery = useQuery({
    queryKey: queryKeys.stockTransfersPage(transferParamsKey),
    queryFn: () => inventoryApi.stockTransfersPage({ page: state.transfersPage, pageSize: state.transfersPageSize, filter: state.transferFilter }),
    placeholderData: (previous) => previous,
  });

  const stockCountQuery = useQuery({
    queryKey: queryKeys.stockCountSessionsPage(sessionParamsKey),
    queryFn: () => inventoryApi.stockCountSessionsPage({ page: state.sessionsPage, pageSize: state.sessionsPageSize, filter: state.sessionFilter }),
    placeholderData: (previous) => previous,
  });

  const damagedQuery = useQuery({
    queryKey: queryKeys.damagedStockPage(damagedParamsKey),
    queryFn: () => inventoryApi.damagedStockPage({ page: state.damagedPage, pageSize: state.damagedPageSize }),
    placeholderData: (previous) => previous,
  });

  const stockMovementsQuery = useQuery({ queryKey: queryKeys.stockMovements, queryFn: inventoryApi.stockMovements });

  return {
    transfersQuery,
    stockCountQuery,
    damagedQuery,
    stockMovementsQuery,
  };
}
