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

import { vanOfflineDb } from '../offline/van-sales-offline.db';

export function useDriverLoadRequisition(selectedWarehouseFilter: string, options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const session = useMemo(() => driverPortalApi.getStoredSession(), []);

  const driverName = session?.rep?.fullName || session?.rep?.name || 'مندوب التوزيع الميداني';
  const vehiclePlate = session?.rep?.vehiclePlate || '';

  // 1. Fetch available warehouses (with full offline fallback)
  const warehousesQuery = useQuery<DriverWarehouse[]>({
    queryKey: ['driver-warehouses'],
    queryFn: async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await vanOfflineDb.getRequisitionCatalog();
        if (cached?.warehouses?.length) return cached.warehouses;
      }
      try {
        const live = await vanSalesApi.getWarehouses();
        if (Array.isArray(live) && live.length > 0) {
          const cached = await vanOfflineDb.getRequisitionCatalog();
          void vanOfflineDb.saveRequisitionCatalog(live, cached?.products || []);
        }
        return live;
      } catch (err: any) {
        if (err?.status === 401) {
          driverPortalApi.logout();
          toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
          window.location.href = '/van-sales';
        }
        const cached = await vanOfflineDb.getRequisitionCatalog();
        if (cached?.warehouses?.length) return cached.warehouses;
        throw err;
      }
    },
    enabled: isEnabled,
    networkMode: 'always',
    staleTime: 60_000,
  });

  // 2. Fetch available products & stocks (with full offline catalog fallback)
  const availableProductsQuery = useQuery<DriverAvailableProduct[]>({
    queryKey: ['driver-available-products', selectedWarehouseFilter],
    queryFn: async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await vanOfflineDb.getRequisitionCatalog();
        if (cached?.products?.length) {
          if (!selectedWarehouseFilter || selectedWarehouseFilter === 'all') {
            return cached.products;
          }
          return cached.products.filter((p) =>
            p.warehouseStocks?.some((w) => String(w.warehouseId) === String(selectedWarehouseFilter) && w.qty > 0)
          );
        }
      }
      try {
        const live = await vanSalesApi.getAvailableProducts(selectedWarehouseFilter);
        if (Array.isArray(live) && live.length > 0) {
          const cached = await vanOfflineDb.getRequisitionCatalog();
          void vanOfflineDb.saveRequisitionCatalog(cached?.warehouses || [], live);
        }
        return live;
      } catch (err: any) {
        if (err?.status === 401) {
          driverPortalApi.logout();
          toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
          window.location.href = '/van-sales';
        }
        const cached = await vanOfflineDb.getRequisitionCatalog();
        if (cached?.products?.length) {
          return cached.products;
        }
        throw err;
      }
    },
    enabled: isEnabled,
    networkMode: 'always',
    staleTime: 30_000,
  });

  // 3. Submit Requisition Mutation (with offline outbox auto-sync)
  const submitMutation = useMutation({
    mutationFn: async (payload: {
      sourceWarehouseId?: number;
      items: { productId: number; qty: number; sourceWarehouseId?: number; sourceWarehouseName?: string }[];
      notes?: string;
    }) => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        return await vanOfflineDb.recordOfflineRequisition({
          repId: session?.rep?.id,
          repName: driverName,
          vehiclePlate: session?.rep?.vehiclePlate ?? undefined,
          ...payload,
        });
      }
      try {
        return await vanSalesApi.submitLoadRequisition(payload);
      } catch (err: any) {
        if (!navigator.onLine || err?.status === 0 || err?.message?.includes('fetch') || err?.message?.includes('network')) {
          return await vanOfflineDb.recordOfflineRequisition({
            repId: session?.rep?.id,
            repName: driverName,
            vehiclePlate: session?.rep?.vehiclePlate ?? undefined,
            ...payload,
          });
        }
        throw err;
      }
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['driver-my-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
      if (res?.isOffline) {
        toast.success(`تم حفظ طلب إذن التحميل #${res.docNo} محلياً (سيتم إرساله للمشرف تلقائياً فور عودة الاتصال)`);
      } else {
        toast.success(`تم إرسال طلب إذن التحميل #${res.docNo} للمشرف بنجاح!`);
      }
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
