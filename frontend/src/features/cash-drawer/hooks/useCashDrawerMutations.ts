import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
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
  cardDeclaredTotal?: number;
  cardOperationCount?: number;
  walletDeclaredTotal?: number;
  walletOperationCount?: number;
  instapayDeclaredTotal?: number;
  instapayOperationCount?: number;
  cardDetails?: Array<{ amount?: number; reference?: string }>;
  walletDetails?: Array<{ amount?: number; reference?: string }>;
  instapayDetails?: Array<{ amount?: number; reference?: string }>;
  note: string;
  managerPin?: string;
}

interface ReviewShiftValues {
  shiftId: string;
  note?: string;
}

export function useCashDrawerMutations(actions?: {
  onOpenSuccess?: () => void;
  onMovementSuccess?: () => void;
  onCloseSuccess?: () => void;
  onReviewSuccess?: () => void;
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
        cardDeclaredTotal: Number(values.cardDeclaredTotal || 0),
        cardOperationCount: Number(values.cardOperationCount || 0),
        walletDeclaredTotal: Number(values.walletDeclaredTotal || 0),
        walletOperationCount: Number(values.walletOperationCount || 0),
        instapayDeclaredTotal: Number(values.instapayDeclaredTotal || 0),
        instapayOperationCount: Number(values.instapayOperationCount || 0),
        cardDetails: Array.isArray(values.cardDetails)
          ? values.cardDetails.map((d) => ({ amount: Number(d.amount || 0), reference: d.reference }))
          : [],
        walletDetails: Array.isArray(values.walletDetails)
          ? values.walletDetails.map((d) => ({ amount: Number(d.amount || 0), reference: d.reference }))
          : [],
        instapayDetails: Array.isArray(values.instapayDetails)
          ? values.instapayDetails.map((d) => ({ amount: Number(d.amount || 0), reference: d.reference }))
          : [],
        note: values.note || '',
        managerPin: values.managerPin || ''
      }),
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData(queryKeys.cashierShiftsPage('open:pos'), (old: any) => {
        if (!old?.rows) return { rows: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 1 } };
        return {
          ...old,
          rows: old.rows.filter((s: any) => String(s.id) !== String(variables.shiftId)),
        };
      });
      await refreshAll();
      actions?.onCloseSuccess?.();
    }
  });

  const reviewMutation = useMutation({
    mutationFn: (values: ReviewShiftValues) =>
      cashDrawerApi.reviewClose(values.shiftId, {
        note: String(values.note || '').trim(),
      }),
    onSuccess: async () => {
      await refreshAll();
      actions?.onReviewSuccess?.();
    }
  });

  return { openMutation, movementMutation, closeMutation, reviewMutation };
}
