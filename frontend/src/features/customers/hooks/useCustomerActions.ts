import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { customersApi } from '@/features/customers/api/customers.api';
import type { CustomerFormOutput } from '@/features/customers/schemas/customer.schema';

function buildCustomerPayload(values: CustomerFormOutput) {
  return {
    name: values.name,
    phone: values.phone || '',
    address: values.address || '',
    balance: Number(values.balance || 0),
    type: values.type,
    creditLimit: Number(values.creditLimit || 0),
    storeCreditBalance: 0
  };
}

export function useUpdateCustomerMutation(customerId?: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CustomerFormOutput) => {
      if (!customerId) throw new Error('اختر عميلًا أولًا');
      return customersApi.update(customerId, buildCustomerPayload(values));
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeCustomers: true, includeCustomerBalances: true });
      onSuccess?.();
    }
  });
}

export function useDeleteCustomerMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => customersApi.remove(customerId),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeCustomers: true, includeCustomerBalances: true });
      onSuccess?.();
    }
  });
}
