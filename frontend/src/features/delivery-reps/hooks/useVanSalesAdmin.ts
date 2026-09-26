import { useQuery } from '@tanstack/react-query';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { vanSalesApi } from '../api/van-sales.api';

export function useVanSalesAdmin() {
  const repsQuery = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  const pendingReturnsQuery = useQuery({
    queryKey: ['van-admin-pending-returns-badge'],
    queryFn: () => vanSalesApi.listAdminReturns({ status: 'pending_approval' }),
    refetchInterval: 15000,
  });

  const pendingRequisitionsQuery = useQuery({
    queryKey: ['van-admin-pending-requisitions-badge'],
    queryFn: () => vanSalesApi.listAdminRequisitions({ status: 'pending' }),
    refetchInterval: 15000,
  });

  return {
    reps: repsQuery.data || [],
    isRepsLoading: repsQuery.isLoading,
    pendingReturns: pendingReturnsQuery.data || [],
    pendingRequisitions: pendingRequisitionsQuery.data || [],
  };
}

export type { DeliveryRep };
