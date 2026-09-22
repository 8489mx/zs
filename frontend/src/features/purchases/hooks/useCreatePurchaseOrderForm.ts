import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, type CreatePurchaseOrderPayload, type PurchaseOrderItem } from '../api/purchase-orders.api';
import { suppliersApi } from '@/shared/api/suppliers.api';
import { sharedProductsApi } from '@/shared/api/products';
import { toast } from '@/shared/components/system-alert';

export type { CreatePurchaseOrderPayload, PurchaseOrderItem };

export interface UseCreatePurchaseOrderFormOptions {
  onSuccess?: (res: { message?: string; [key: string]: unknown }) => void;
}

export function useCreatePurchaseOrderForm(options: UseCreatePurchaseOrderFormOptions = {}) {
  const queryClient = useQueryClient();

  const { data: suppliersData, isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['suppliers-list-for-po-page'],
    queryFn: () => suppliersApi.list(),
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-list-for-po-page'],
    queryFn: () => sharedProductsApi.list(),
  });

  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
  const products = Array.isArray(productsData) ? productsData : [];

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => purchaseOrdersApi.create(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'تم اعتماد أمر الشراء بنجاح');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      options.onSuccess?.(res);
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'فشل اعتماد أمر الشراء';
      toast.error(msg);
    },
  });

  return {
    suppliers,
    products,
    isSuppliersLoading,
    isProductsLoading,
    createPurchaseOrder: createMutation.mutate,
    createPurchaseOrderAsync: createMutation.mutateAsync,
    isSubmitting: createMutation.isPending,
  };
}
