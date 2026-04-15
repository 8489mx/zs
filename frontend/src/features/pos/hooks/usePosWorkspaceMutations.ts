import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/lib/api/catalog';
import { cashDrawerApi } from '@/lib/api/cash-drawer';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { posApi } from '@/features/pos/api/pos.api';
import type { HeldPosDraft } from '@/features/pos/hooks/usePosWorkspace';

export function usePosWorkspaceMutations({ queryClient, storedHeld }: { queryClient: QueryClient; storedHeld: HeldPosDraft[] }) {
  const heldDraftsQuery = useQuery({
    queryKey: queryKeys.posHeldDrafts,
    queryFn: () => posApi.listHeldDrafts(),
    initialData: storedHeld,
    staleTime: 5_000,
  });
  const openShiftsQuery = useQuery({
    queryKey: queryKeys.cashierShiftsPage('open:pos'),
    queryFn: () => cashDrawerApi.listPage({ page: 1, pageSize: 50, filter: 'open' }),
    staleTime: 15_000,
  });

  const quickCustomerMutation = useMutation({
    mutationFn: (payload: unknown) => catalogApi.createCustomer(payload),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeCustomers: true, includeCustomerBalances: true });
    },
  });
  const saveHeldDraftMutation = useMutation({
    mutationFn: (payload: unknown) => posApi.saveHeldDraft(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.posHeldDrafts });
    },
  });
  const deleteHeldDraftMutation = useMutation({
    mutationFn: (draftId: string) => posApi.deleteHeldDraft(draftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.posHeldDrafts });
    },
  });
  const clearHeldDraftsMutation = useMutation({
    mutationFn: () => posApi.clearHeldDrafts(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.posHeldDrafts });
    },
  });

  return {
    heldDraftsQuery,
    openShiftsQuery,
    quickCustomerMutation,
    saveHeldDraftMutation,
    deleteHeldDraftMutation,
    clearHeldDraftsMutation,
  };
}
