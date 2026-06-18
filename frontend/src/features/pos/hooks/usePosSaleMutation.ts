import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateSalesDomain } from '@/app/query-invalidation';
import { posApi } from '@/features/pos/api/pos.api';
import { buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload, type CreatePosSaleInput } from '@/features/pos/contracts';
import { enqueueOfflineSale } from '@/features/pos/lib/pos-offline-sync';

export function usePosSaleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePosSaleInput) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineSale = enqueueOfflineSale(input);
        return { id: offlineSale.id, offline: true, ...input };
      }

      const payload = buildPosSalePayload(input);
      const legacyPayload = buildLegacyPosSalePayload(input);
      const minimalPayload = buildMinimalPosSalePayload(input);
      
      try {
        return await posApi.createSale(payload, legacyPayload, minimalPayload);
      } catch (error: any) {
        if (error?.message?.includes('fetch') || error?.message?.includes('Network Error') || error?.name === 'TypeError') {
          const offlineSale = enqueueOfflineSale(input);
          return { id: offlineSale.id, offline: true, ...input };
        }
        throw error;
      }
    },
    onSuccess: async (result) => {
      const saleId = (result && typeof result === 'object' && 'id' in result)
        ? String((result as { id?: string | number }).id || '')
        : '';

      await invalidateSalesDomain(queryClient, { saleId, includeDashboard: true });
    }
  });
}
