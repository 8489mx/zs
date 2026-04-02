import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateSalesDomain } from '@/app/query-invalidation';
import { posApi } from '@/features/pos/api/pos.api';
import { buildPosSalePayload, type CreatePosSaleInput } from '@/features/pos/contracts';

export function usePosSaleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePosSaleInput) => {
      return posApi.createSale(buildPosSalePayload(input));
    },
    onSuccess: async () => {
      await invalidateSalesDomain(queryClient);
    }
  });
}
