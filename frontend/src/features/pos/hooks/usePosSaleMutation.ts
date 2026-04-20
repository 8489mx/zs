import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
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
    onSuccess: async (result) => {
      const saleId = (result && typeof result === 'object' && 'id' in result)
        ? String((result as { id?: string | number }).id || '')
        : '';

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sales }),
        ...(saleId ? [queryClient.invalidateQueries({ queryKey: queryKeys.saleDetail(saleId) })] : []),
        queryClient.invalidateQueries({ queryKey: ['products', 'pos'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posCustomers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customerBalances }),
      ]);
    }
  });
}
