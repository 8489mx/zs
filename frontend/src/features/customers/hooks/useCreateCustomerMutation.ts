import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { customersApi } from '@/features/customers/api/customers.api';
import type { CustomerFormOutput } from '@/features/customers/schemas/customer.schema';

export type CustomerFormValues = CustomerFormOutput;

export function useCreateCustomerMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CustomerFormValues) => customersApi.create({
      name: values.name,
      phone: values.phone || '',
      address: values.address || '',
      balance: Number(values.balance || 0),
      type: values.type,
      creditLimit: Number(values.creditLimit || 0),
      storeCreditBalance: 0
    }),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeCustomers: true, includeCustomerBalances: true });
      onSuccess?.();
    }
  });
}
