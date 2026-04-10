import { useEffect, useMemo, useState } from 'react';
import { usePurchasesPage } from '@/features/purchases/hooks/usePurchasesPage';
import { usePurchaseComposerCatalog } from '@/features/purchases/hooks/usePurchaseComposerCatalog';
import { usePurchaseActions } from '@/features/purchases/hooks/usePurchaseActions';
import { usePurchasesWorkspaceActions } from '@/features/purchases/hooks/usePurchasesWorkspaceActions';
import {
  buildPurchasesGuidanceCards,
  buildPurchasesScopeRows,
  getPurchaseCancelDescription,
  getPurchasesNextStep,
  getPurchasesViewFilterLabel,
} from '@/features/purchases/lib/purchases-workspace.helpers';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { Purchase } from '@/types/domain';

export function usePurchasesWorkspaceController() {
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'cash' | 'credit' | 'cancelled'>('all');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [purchaseToCancel, setPurchaseToCancel] = useState<Purchase | null>(null);
  const [purchaseToEdit, setPurchaseToEdit] = useState<Purchase | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const purchasesQuery = usePurchasesPage({ page, pageSize, search, filter: viewFilter });
  const purchaseCatalog = usePurchaseComposerCatalog();
  const { purchaseDetailQuery, cancelMutation, updateMutation } = usePurchaseActions(selectedPurchaseId);
  const canPrint = useHasAnyPermission('canPrint');
  const canEditInvoices = useHasAnyPermission('canEditInvoices');
  const canManageSuppliers = useHasAnyPermission('suppliers');

  useEffect(() => {
    setPage(1);
  }, [search, viewFilter]);

  const pagination = purchasesQuery.pagination;
  const summary = purchasesQuery.summary;
  const rows = purchasesQuery.rows;
  const selectedPurchase = purchaseDetailQuery.data;
  const totalItems = pagination?.totalItems || 0;
  const topSuppliers = useMemo(() => summary?.topSuppliers || [], [summary?.topSuppliers]);
  const rangeStart = pagination?.rangeStart || 0;
  const rangeEnd = pagination?.rangeEnd || 0;
  const activeFilterLabel = getPurchasesViewFilterLabel(viewFilter);

  const scopeRows = useMemo(() => buildPurchasesScopeRows({
    activeFilterLabel,
    totalItems,
    rangeStart,
    rangeEnd,
    search,
    selectedPurchase,
    totalAmount: summary?.totalAmount || 0,
  }), [activeFilterLabel, rangeEnd, rangeStart, search, selectedPurchase, summary?.totalAmount, totalItems]);

  const purchasesNextStep = getPurchasesNextStep({ selectedPurchase, canEditInvoices, totalItems });
  const purchaseGuidanceCards = useMemo(() => buildPurchasesGuidanceCards({
    activeFilterLabel,
    purchasesNextStep,
    selectedPurchase,
    search,
    topSuppliers,
  }), [activeFilterLabel, purchasesNextStep, search, selectedPurchase, topSuppliers]);
  const cancelDescription = useMemo(() => getPurchaseCancelDescription(purchaseToCancel), [purchaseToCancel]);

  const actions = usePurchasesWorkspaceActions({
    search,
    viewFilter,
    totalItems,
    summary,
    topSuppliers,
    setPage,
    setPageSize,
    setSearch,
    setViewFilter,
    setSelectedPurchaseId,
    setPurchaseToCancel,
    setPurchaseToEdit,
  });

  return {
    search,
    setSearch,
    viewFilter,
    setViewFilter,
    selectedPurchaseId,
    setSelectedPurchaseId,
    purchaseToCancel,
    setPurchaseToCancel,
    purchaseToEdit,
    setPurchaseToEdit,
    page,
    setPage,
    pageSize,
    setPageSize,
    purchasesQuery,
    rows,
    pagination,
    summary,
    purchaseCatalog,
    purchaseDetailQuery,
    cancelMutation,
    updateMutation,
    selectedPurchase,
    activeFilterLabel,
    totalItems,
    topSuppliers,
    rangeStart,
    rangeEnd,
    scopeRows,
    purchaseGuidanceCards,
    cancelDescription,
    canPrint,
    canEditInvoices,
    canManageSuppliers,
    ...actions,
  };
}
