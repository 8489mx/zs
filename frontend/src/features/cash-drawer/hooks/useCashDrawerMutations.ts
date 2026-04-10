import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateTreasuryDomain } from '@/app/query-invalidation';
import { cashDrawerApi } from '@/features/cash-drawer/api/cash-drawer.api';

interface OpenShiftValues {
  openingCash: number;
  note: string;
  branchId: string;
  locationId: string;
}

interface MovementValues {
  shiftId: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  note: string;
  managerPin?: string;
}

interface CloseShiftValues {
  shiftId: string;
  countedCash: number;
  note: string;
  managerPin?: string;
}

export function useCashDrawerMutations(actions?: {
  onOpenSuccess?: () => void;
  onMovementSuccess?: () => void;
  onCloseSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const refreshAll = async () => {
    await invalidateTreasuryDomain(queryClient);
  };

  const openMutation = useMutation({
    mutationFn: (values: OpenShiftValues) =>
      cashDrawerApi.open({
        openingCash: Number(values.openingCash || 0),
        note: values.note || '',
        branchId: values.branchId || '',
        locationId: values.locationId || ''
      }),
    onSuccess: async () => {
      await refreshAll();
      actions?.onOpenSuccess?.();
    }
  });

  const movementMutation = useMutation({
    mutationFn: (values: MovementValues) =>
      cashDrawerApi.movement(values.shiftId, {
        type: values.type,
        amount: Number(values.amount || 0),
        note: values.note || '',
        managerPin: values.managerPin || ''
      }),
    onSuccess: async () => {
      await refreshAll();
      actions?.onMovementSuccess?.();
    }
  });

  const closeMutation = useMutation({
    mutationFn: (values: CloseShiftValues) =>
      cashDrawerApi.close(values.shiftId, {
        countedCash: Number(values.countedCash || 0),
        note: values.note || '',
        managerPin: values.managerPin || ''
      }),
    onSuccess: async () => {
      await refreshAll();
      actions?.onCloseSuccess?.();
    }
  });

  return { openMutation, movementMutation, closeMutation };
}
