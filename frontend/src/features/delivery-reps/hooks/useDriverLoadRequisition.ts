import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vanSalesApi,
  type DriverWarehouse,
  type DriverAvailableProduct,
  type DriverProductStock,
} from '../api/van-sales.api';
import { driverPortalApi } from '@/shared/api/delivery-reps.api';
import { toast } from '@/shared/components/system-alert';

export function useDriverLoadRequisition(selectedWarehouseFilter: string) {
  const queryClient = useQueryClient();
  const session = useMemo(() => driverPortalApi.getStoredSession(), []);

  const driverName = session?.rep?.fullName || session?.rep?.name || 'مندوب التوزيع الميداني';
  const vehiclePlate = session?.rep?.vehiclePlate ? `سيارة رقم [${session.rep.vehiclePlate}]` : 'سيارة التوزيع الميدانية';

  // 1. Fetch available warehouses
  const warehousesQuery = useQuery<DriverWarehouse[]>({
    queryKey: ['driver-warehouses'],
    queryFn: async () => {
      try {
        return await vanSalesApi.getWarehouses();
      } catch (err: any) {
        if (err?.status === 401) {
          driverPortalApi.logout();
          toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
          window.location.href = '/van-sales';
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });

  // 2. Fetch available products & stocks
  const availableProductsQuery = useQuery<DriverAvailableProduct[]>({
    queryKey: ['driver-available-products', selectedWarehouseFilter],
    queryFn: async () => {
      try {
        return await vanSalesApi.getAvailableProducts(selectedWarehouseFilter);
      } catch (err: any) {
        if (err?.status === 401) {
          driverPortalApi.logout();
          toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
          window.location.href = '/van-sales';
        }
        throw err;
      }
    },
    staleTime: 30_000,
  });

  // 3. Submit Requisition Mutation
  const submitMutation = useMutation({
    mutationFn: vanSalesApi.submitLoadRequisition,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['driver-my-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
      toast.success(`تم إرسال طلب إذن التحميل #${res.docNo} للمشرف بنجاح!`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل إرسال طلب إذن التحميل');
    },
  });

  return {
    session,
    driverName,
    vehiclePlate,
    warehouses: warehousesQuery.data || [],
    isLoadingWarehouses: warehousesQuery.isLoading,
    availableProducts: availableProductsQuery.data || [],
    isLoadingProducts: availableProductsQuery.isLoading,
    submitRequisition: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}

export type { DriverWarehouse, DriverAvailableProduct, DriverProductStock };
