import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { invalidateSalesDomain } from '@/app/query-invalidation';
import { posApi } from '@/features/pos/api/pos.api';
import { buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload, type CreatePosSaleInput } from '@/features/pos/contracts';
import { enqueueOfflineSale } from '@/features/pos/lib/pos-offline-sync';

export function usePosSaleMutation() {
  const queryClient = useQueryClient();
  const isInFlightRef = useRef(false);

  return useMutation({
    mutationFn: async (input: CreatePosSaleInput) => {
      if (isInFlightRef.current) throw new Error('Sale already in progress');
      isInFlightRef.current = true;
      try {
        const payload = buildPosSalePayload(input);
        const legacyPayload = buildLegacyPosSalePayload(input);
        const minimalPayload = buildMinimalPosSalePayload(input);
        const idempotencyKey = crypto.randomUUID();

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const offlineSale = enqueueOfflineSale(input, idempotencyKey);
          return { id: offlineSale.id, docNo: (offlineSale.payload as any)?.docNo || offlineSale.id, offline: true, ...input };
        }
        
        try {
          return await posApi.createSale(payload, legacyPayload, minimalPayload, { 'x-idempotency-key': idempotencyKey });
        } catch (error: any) {
          if (
            error?.message?.includes('fetch') ||
            error?.message?.includes('Network') ||
            error?.message?.includes('Failed to fetch') ||
            error?.name === 'TypeError' ||
            (typeof navigator !== 'undefined' && !navigator.onLine)
          ) {
            const offlineSale = enqueueOfflineSale(input, idempotencyKey);
            return { id: offlineSale.id, docNo: (offlineSale.payload as any)?.docNo || offlineSale.id, offline: true, ...input };
          }
          throw error;
        }
      } finally {
        isInFlightRef.current = false;
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
