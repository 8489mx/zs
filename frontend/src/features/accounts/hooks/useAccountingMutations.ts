import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateAccountsDomain } from '@/app/query-invalidation';
import { accountsApi } from '@/features/accounts/api/accounts.api';
import { buildCustomerPaymentPayload, buildSupplierPaymentPayload } from '@/features/accounts/contracts';
import type { CustomerPaymentOutput, SupplierPaymentOutput } from '@/features/accounts/schemas/payment.schema';

export type CustomerPaymentFormValues = CustomerPaymentOutput;
export type SupplierPaymentFormValues = SupplierPaymentOutput;

export function useCustomerPaymentMutation(activeCustomerId: string, onSuccess?: (data: any) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CustomerPaymentFormValues) => accountsApi.customerPaymentCreate(buildCustomerPaymentPayload(values)),
    onSuccess: async (data) => {
      await invalidateAccountsDomain(queryClient, activeCustomerId);
      onSuccess?.(data);
    }
  });
}

export function useSupplierPaymentMutation(activeSupplierId: string, onSuccess?: (data: any) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SupplierPaymentFormValues) => accountsApi.supplierPaymentCreate(buildSupplierPaymentPayload(values)),
    onSuccess: async (data) => {
      await invalidateAccountsDomain(queryClient, undefined, activeSupplierId);
      onSuccess?.(data);
    }
  });
}
