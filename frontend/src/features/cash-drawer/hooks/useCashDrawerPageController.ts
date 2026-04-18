import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '@/lib/format';
import { useCashierShifts } from '@/features/cash-drawer/hooks/useCashierShifts';
import { useCashDrawerCatalog } from '@/features/cash-drawer/hooks/useCashDrawerCatalog';
import { useCashDrawerMutations } from '@/features/cash-drawer/hooks/useCashDrawerMutations';
import { useCashDrawerPageActions } from '@/features/cash-drawer/hooks/useCashDrawerPageActions';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export interface OpenShiftValues {
  openingCash: number;
  note: string;
  branchId: string;
  locationId: string;
}

export interface MovementValues {
  shiftId: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  note: string;
  managerPin?: string;
}

export interface CloseShiftValues {
  shiftId: string;
  countedCash: number;
  note: string;
  managerPin?: string;
}

export type CashDrawerConfirmAction =
  | { kind: 'movement'; values: MovementValues }
  | { kind: 'close-shift'; values: CloseShiftValues };

export function useCashDrawerPageController() {
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'open' | 'closed' | 'variance' | 'today'>('all');
  const [copyFeedback, setCopyFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftPageSize, setShiftPageSize] = useState(20);
  const [confirmAction, setConfirmAction] = useState<CashDrawerConfirmAction | null>(null);
  const query = useCashierShifts({ page: shiftPage, pageSize: shiftPageSize, search, filter: shiftFilter });
  const openShiftOptionsQuery = useCashierShifts({ page: 1, pageSize: 100, filter: 'open' });
  const { branches, locations } = useCashDrawerCatalog();
  const rows = query.data?.rows || [];
  const pagination = query.data?.pagination;
  const summary = query.data?.summary || { totalItems: 0, openShiftCount: 0, openShiftDocNo: '', totalVariance: 0 };

  const openForm = useForm<OpenShiftValues>({ defaultValues: { openingCash: 0, note: '', branchId: '', locationId: '' } });
  const movementForm = useForm<MovementValues>({ defaultValues: { shiftId: '', type: 'cash_in', amount: 0, note: '' } });
  const closeForm = useForm<CloseShiftValues>({ defaultValues: { shiftId: '', countedCash: 0, note: '' } });

  const { openMutation, movementMutation, closeMutation } = useCashDrawerMutations({
    onOpenSuccess: () => openForm.reset({ openingCash: 0, note: '', branchId: SINGLE_STORE_MODE ? (branches[0]?.id || '') : '', locationId: SINGLE_STORE_MODE ? (locations[0]?.id || '') : '' }),
    onMovementSuccess: () => movementForm.reset({ shiftId: '', type: 'cash_in', amount: 0, note: '' }),
    onCloseSuccess: () => closeForm.reset({ shiftId: '', countedCash: 0, note: '' })
  });

  useEffect(() => {
    if (!SINGLE_STORE_MODE) return;
    const currentBranchId = openForm.getValues('branchId');
    const currentLocationId = openForm.getValues('locationId');
    if (!currentBranchId && branches[0]?.id) openForm.setValue('branchId', branches[0].id);
    if (!currentLocationId && locations[0]?.id) openForm.setValue('locationId', locations[0].id);
  }, [branches, locations, openForm]);

  useEffect(() => {
    setShiftPage(1);
  }, [search, shiftFilter]);

  const openOptions = useMemo(() => openShiftOptionsQuery.data?.rows || [], [openShiftOptionsQuery.data?.rows]);

  useEffect(() => {
    const currentMovementShiftId = movementForm.getValues('shiftId');
    if (!currentMovementShiftId && openOptions[0]?.id) movementForm.setValue('shiftId', String(openOptions[0].id));
    const currentCloseShiftId = closeForm.getValues('shiftId');
    if (!currentCloseShiftId && openOptions[0]?.id) closeForm.setValue('shiftId', String(openOptions[0].id));
  }, [closeForm, movementForm, openOptions]);

  const selectedCloseShift = openOptions.find((shift) => String(shift.id) === String(closeForm.watch('shiftId'))) || null;
  const closeExpectedCash = Number(selectedCloseShift?.expectedCash || 0);
  const closeCountedCash = Number(closeForm.watch('countedCash') || 0);
  const closeVariancePreview = Number((closeCountedCash - closeExpectedCash).toFixed(2));
  const closeNoteValue = String(closeForm.watch('note') || '').trim();
  const openShift = openOptions[0] || (summary.openShiftDocNo ? { docNo: summary.openShiftDocNo } : null);
  const openShiftCount = summary.openShiftCount;
  const totalVariance = Number(summary.totalVariance || 0);
  const { exportShiftRows, printShiftRows } = useCashDrawerPageActions({ search, shiftFilter, totalItems: summary.totalItems, openShiftCount, totalVariance });

  const resetShiftView = () => {
    setSearch('');
    setShiftFilter('all');
    setShiftPage(1);
  };

  const copyShiftSummary = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const lines = [
      'ملخص الورديات والدرج النقدي',
      `عدد الورديات المطابقة: ${summary.totalItems}`,
      `الورديات المفتوحة: ${openShiftCount}`,
      `الوردية النشطة: ${openShift?.openedByName || openShift?.docNo || 'لا يوجد'}`,
      `إجمالي الفروقات: ${formatCurrency(totalVariance)}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyFeedback({ kind: 'success', text: 'تم نسخ ملخص الورديات بنجاح.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر نسخ ملخص الورديات.' });
    }
  };

  const performConfirmedAction = async (managerPin: string) => {
    if (!confirmAction) return;
    try {
      if (confirmAction.kind === 'movement') {
        await movementMutation.mutateAsync({ ...confirmAction.values, managerPin });
        setConfirmAction(null);
        return;
      }
      if (confirmAction.kind === 'close-shift') {
        await closeMutation.mutateAsync({ ...confirmAction.values, managerPin });
        setConfirmAction(null);
      }
    } catch {
      // mutation hooks already expose structured errors in page feedback areas.
    }
  };

  const handleMovementSubmit = movementForm.handleSubmit((values) => {
    if (values.type === 'cash_out') {
      setConfirmAction({ kind: 'movement', values });
      return;
    }
    movementMutation.mutate(values);
  });

  const handleCloseSubmit = closeForm.handleSubmit((values) => {
    setConfirmAction({ kind: 'close-shift', values });
  });

  return {
    search,
    shiftFilter,
    copyFeedback,
    shiftPage,
    shiftPageSize,
    confirmAction,
    query,
    rows,
    pagination,
    summary,
    openForm,
    movementForm,
    closeForm,
    openMutation,
    movementMutation,
    closeMutation,
    branches,
    locations,
    openOptions,
    closeExpectedCash,
    closeVariancePreview,
    closeNoteValue,
    openShift,
    openShiftCount,
    totalVariance,
    setSearch,
    setShiftFilter,
    setShiftPage,
    setShiftPageSize,
    setConfirmAction,
    exportShiftRows,
    printShiftRows,
    resetShiftView,
    copyShiftSummary,
    performConfirmedAction,
    handleMovementSubmit,
    handleCloseSubmit,
  };
}
