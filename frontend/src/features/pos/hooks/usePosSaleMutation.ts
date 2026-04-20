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
    onSuccess: async (_result, variables) => {
      const tasks = [
        queryClient.invalidateQueries({ queryKey: ['products', 'pos'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sales, refetchType: 'none' }),
      ];

      const shouldRefreshCustomerData = variables.paymentType === 'credit' && Boolean(String(variables.customerId || '').trim());
      if (shouldRefreshCustomerData) {
        tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.posCustomers }));
        tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.customerBalances }));
      }

      await Promise.all(tasks);
    }
  });
}
