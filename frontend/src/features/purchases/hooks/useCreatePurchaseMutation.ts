import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidatePurchasesDomain } from '@/app/query-invalidation';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { buildPurchasePayload, type PurchaseDraftItem } from '@/features/purchases/contracts';
import type { PurchaseHeaderOutput } from '@/features/purchases/schemas/purchase.schema';

interface CreatePurchaseArgs {
  values: PurchaseHeaderOutput;
  items: PurchaseDraftItem[];
  taxRate: number;
  pricesIncludeTax: boolean;
}

export function useCreatePurchaseMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values, items, taxRate, pricesIncludeTax }: CreatePurchaseArgs) =>
      purchasesApi.create(buildPurchasePayload(values, items, taxRate, pricesIncludeTax)),
    onSuccess: async () => {
      await invalidatePurchasesDomain(queryClient);
      onSuccess?.();
    }
  });
}
