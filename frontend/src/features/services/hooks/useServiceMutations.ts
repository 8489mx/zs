import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { servicesApi } from '@/features/services/api/services.api';

export interface ServiceFormValues {
  name: string;
  amount: number;
  notes: string;
  date: string;
}

function buildServicePayload(values: ServiceFormValues) {
  return {
    service: {
      name: values.name,
      amount: Number(values.amount || 0),
      notes: values.notes || '',
      date: new Date(values.date).toISOString()
    }
  };
}

export function useSaveServiceMutation(serviceId?: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ServiceFormValues) => {
      const payload = buildServicePayload(values);
      return serviceId ? servicesApi.update(serviceId, payload) : servicesApi.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services });
      onSuccess?.();
    }
  });
}

export function useDeleteServiceMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services });
      onSuccess?.();
    }
  });
}
