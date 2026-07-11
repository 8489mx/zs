import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateInventoryDomain } from '@/app/query-invalidation';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { buildDamagedStockPayload, buildInventoryAdjustmentPayload } from '@/features/inventory/contracts';
import type { DamagedStockOutput, InventoryAdjustmentOutput } from '@/features/inventory/schemas/inventory.schema';

export function useInventoryAdjustmentMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: InventoryAdjustmentOutput) => inventoryApi.createAdjustment(buildInventoryAdjustmentPayload(values)),
    onSuccess: async (res: any) => {
      if (res?.adjustment?.productId) {
        const { productId, locationId, scopeAfter, globalAfter } = res.adjustment;
        queryClient.setQueryData(['location-stocks'], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((ls: any) => 
            (ls.productId === productId && ls.locationId === locationId) 
              ? { ...ls, qty: scopeAfter } 
              : ls
          );
        });
        
        queryClient.setQueryData(['products'], (old: any) => {
          if (!old?.products) return old;
          return {
            ...old,
            products: old.products.map((p: any) => 
              (p.id === productId)
                ? { ...p, stock: globalAfter }
                : p
            )
          };
        });
      }
      await invalidateInventoryDomain(queryClient, { includeProducts: true });
      onSuccess?.();
    }
  });
}

export function useDamagedStockMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: DamagedStockOutput) => inventoryApi.createDamaged(buildDamagedStockPayload(values)),
    onSuccess: async () => {
      await invalidateInventoryDomain(queryClient, { includeProducts: true });
      onSuccess?.();
    }
  });
}
