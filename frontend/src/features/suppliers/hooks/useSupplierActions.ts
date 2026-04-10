import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import type { SupplierFormOutput } from '@/features/suppliers/schemas/supplier.schema';

function buildSupplierPayload(values: SupplierFormOutput) {
  return {
    name: values.name,
    phone: values.phone || '',
    address: values.address || '',
    balance: Number(values.balance || 0),
    notes: values.notes || ''
  };
}

export function useUpdateSupplierMutation(supplierId?: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SupplierFormOutput) => {
      if (!supplierId) throw new Error('اختر موردًا أولًا');
      return suppliersApi.update(supplierId, buildSupplierPayload(values));
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      onSuccess?.();
    }
  });
}

export function useDeleteSupplierMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) => suppliersApi.remove(supplierId),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      onSuccess?.();
    }
  });
}
