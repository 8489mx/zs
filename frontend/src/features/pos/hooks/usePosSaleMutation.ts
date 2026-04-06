import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateSalesDomain } from '@/app/query-invalidation';
import { posApi } from '@/features/pos/api/pos.api';
import { buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload, type CreatePosSaleInput } from '@/features/pos/contracts';

export function usePosSaleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePosSaleInput) => {
      const payload = buildPosSalePayload(input);
      const legacyPayload = buildLegacyPosSalePayload(input);
      const minimalPayload = buildMinimalPosSalePayload(input);
      return posApi.createSale(payload, legacyPayload, minimalPayload);
    },
    onSuccess: async () => {
      await invalidateSalesDomain(queryClient);
    }
  });
}
