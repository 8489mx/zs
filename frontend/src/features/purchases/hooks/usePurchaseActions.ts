import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidatePurchasesDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { buildPurchaseUpdatePayload } from '@/features/purchases/contracts';
import type { Purchase } from '@/types/domain';

export function usePurchaseActions(activePurchaseId: string) {
  const queryClient = useQueryClient();

  const purchaseDetailQuery = useQuery({
    queryKey: queryKeys.purchaseDetail(activePurchaseId),
    queryFn: () => purchasesApi.getById(activePurchaseId),
    enabled: Boolean(activePurchaseId)
  });

  const cancelMutation = useMutation({
    mutationFn: ({ purchaseId, reason, managerPin }: { purchaseId: string; reason: string; managerPin: string }) => purchasesApi.cancel(purchaseId, reason, managerPin),
    onSuccess: async (_, variables) => {
      await invalidatePurchasesDomain(queryClient, { purchaseId: variables.purchaseId });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ purchase, payload }: { purchase: Purchase; payload: Parameters<typeof buildPurchaseUpdatePayload>[1] }) => purchasesApi.update(purchase.id, buildPurchaseUpdatePayload(purchase, payload)),
    onSuccess: async (_, variables) => {
      await invalidatePurchasesDomain(queryClient, { purchaseId: variables.purchase.id });
    }
  });

  return {
    purchaseDetailQuery,
    cancelMutation,
    updateMutation
  };
}
