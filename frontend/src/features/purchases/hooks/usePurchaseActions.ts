import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidatePurchasesDomain } from '@/app/query-invalidation';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { buildPurchaseUpdatePayload } from '@/features/purchases/contracts';
import type { Purchase } from '@/types/domain';

export function usePurchaseActions() {
  const queryClient = useQueryClient();

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
    cancelMutation,
    updateMutation
  };
}
