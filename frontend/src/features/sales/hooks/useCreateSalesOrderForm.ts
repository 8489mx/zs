import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesOrdersApi, type CreateSalesOrderPayload, type SalesOrderItem } from '../api/sales-orders.api';
import { customersApi } from '@/shared/api/customers.api';
import { toast } from '@/shared/components/system-alert';

export type { CreateSalesOrderPayload, SalesOrderItem };

export interface UseCreateSalesOrderFormOptions {
  onSuccess?: () => void;
}

export function useCreateSalesOrderForm(options: UseCreateSalesOrderFormOptions = {}) {
  const queryClient = useQueryClient();

  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers-list-for-sales-order'],
    queryFn: () => customersApi.list(),
  });

  const customers = Array.isArray(customersData) ? customersData : [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => salesOrdersApi.create(payload),
    onSuccess: () => {
      toast.success('تم اعتماد وحفظ أمر البيع بنجاح');
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      options.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'فشل اعتماد أمر البيع';
      toast.error(msg);
    },
  });

  return {
    customers,
    isCustomersLoading,
    createSalesOrder: createMutation.mutate,
    createSalesOrderAsync: createMutation.mutateAsync,
    isSubmitting: createMutation.isPending,
  };
}
