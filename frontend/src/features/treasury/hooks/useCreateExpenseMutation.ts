import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateDashboardOverview, invalidateTreasuryDomain } from '@/app/query-invalidation';
import { treasuryApi } from '@/features/treasury/api/treasury.api';

interface ExpensePayload {
  title: string;
  amount: string | number;
  note: string;
  date: string;
  branchId: string;
  locationId: string;
}

export function useCreateExpenseMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExpensePayload) => treasuryApi.createExpense({
      title: payload.title,
      amount: Number(payload.amount || 0),
      note: payload.note,
      date: new Date(payload.date).toISOString(),
      ...(payload.branchId ? { branchId: Number(payload.branchId) } : {}),
      ...(payload.locationId ? { locationId: Number(payload.locationId) } : {}),
    }),
    onSuccess: async () => {
      await Promise.all([
        invalidateTreasuryDomain(queryClient),
        invalidateDashboardOverview(queryClient),
      ]);
      onSuccess?.();
    }
  });
}
