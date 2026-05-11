import { useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/features/services/api/services.api';

export interface ServiceFormValues {
  name: string;
  amount: number;
  notes: string;
  date: string;
  paymentChannel: 'cash' | 'card';
}

function buildServicePayload(values: ServiceFormValues) {
  return {
    service: {
      name: values.name,
      amount: Number(values.amount || 0),
      notes: values.notes || '',
      date: new Date(values.date).toISOString(),
      paymentChannel: values.paymentChannel === 'card' ? 'card' : 'cash'
    }
  };
}

async function invalidateServiceRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const key = Array.isArray(query.queryKey) ? String(query.queryKey[0] || '') : '';
      return ['services', 'cashier-shifts', 'treasury', 'reports-summary', 'dashboard-overview'].includes(key);
    }
  });
}

export function useSaveServiceMutation(serviceId?: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ServiceFormValues) => {
      const payload = buildServicePayload(values);
      return serviceId ? servicesApi.update(serviceId, payload) : servicesApi.create(payload);
    },
    onSuccess: async () => {
      await invalidateServiceRelatedQueries(queryClient);
      onSuccess?.();
    }
  });
}

export function useDeleteServiceMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: async () => {
      await invalidateServiceRelatedQueries(queryClient);
      onSuccess?.();
    }
  });
}
