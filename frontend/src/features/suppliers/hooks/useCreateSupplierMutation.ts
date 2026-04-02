import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import type { SupplierFormOutput } from '@/features/suppliers/schemas/supplier.schema';

export type SupplierFormValues = SupplierFormOutput;

export function useCreateSupplierMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SupplierFormValues) => suppliersApi.create({
      name: values.name,
      phone: values.phone || '',
      address: values.address || '',
      balance: Number(values.balance || 0),
      notes: values.notes || ''
    }),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      onSuccess?.();
    }
  });
}
