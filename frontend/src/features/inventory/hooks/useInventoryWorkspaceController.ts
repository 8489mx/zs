import { useEffect } from 'react';
import type { StockCountItem, StockTransferItem } from '@/types/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { useInventoryPage } from '@/features/inventory/hooks/useInventoryPage';
import { useInventoryWorkspaceMutations } from '@/features/inventory/hooks/useInventoryWorkspaceMutations';
import { useInventoryWorkspaceQueries } from '@/features/inventory/hooks/useInventoryWorkspaceQueries';
import { createInventoryWorkspaceSectionActions } from '@/features/inventory/hooks/useInventoryWorkspaceSectionActions';
import { useInventoryWorkspaceSelection } from '@/features/inventory/hooks/useInventoryWorkspaceSelection';
import { useInventoryWorkspaceState } from '@/features/inventory/hooks/useInventoryWorkspaceState';
import { findProduct, printStockCountDocument, printTransferDocument } from '@/features/inventory/lib/inventory-documents';
import {
  buildInventorySectionSpotlightCards,
  getInventorySectionDescription,
} from '@/features/inventory/lib/inventory-workspace.helpers';
import type { InventorySectionKey } from '@/features/inventory/pages/inventory.page-config';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';

export function useInventoryWorkspaceController(currentSection: InventorySectionKey) {
  const queryClient = useQueryClient();
  const state = useInventoryWorkspaceState();
  const { productsQuery, rows, inventory } = useInventoryPage(state.search, state.statusFilter);
  const { transferFilter, sessionFilter, setTransfersPage, setSelectedTransferIds, setSelectedTransferId, setSessionsPage, setSelectedSessionIds, setSelectedSessionId } = state;
  const actionCatalog = useInventoryActionCatalog();
  const products = actionCatalog.productsQuery.data || [];
  const branches = actionCatalog.branchesQuery.data || [];
  const locations = actionCatalog.locationsQuery.data || [];
  const { transfersQuery, stockCountQuery, damagedQuery, stockMovementsQuery } = useInventoryWorkspaceQueries(state);

  useEffect(() => {
    setTransfersPage(1);
    setSelectedTransferIds([]);
    setSelectedTransferId('');
  }, [transferFilter, setSelectedTransferId, setSelectedTransferIds, setTransfersPage]);

  useEffect(() => {
    setSessionsPage(1);
    setSelectedSessionIds([]);
    setSelectedSessionId('');
  }, [sessionFilter, setSelectedSessionId, setSelectedSessionIds, setSessionsPage]);

  const mutations = useInventoryWorkspaceMutations({
    queryClient,
    transferForm: state.transferForm,
    transferItems: state.transferItems,
    countForm: state.countForm,
    countItems: state.countItems,
    setTransferItems: state.setTransferItems,
    setTransferForm: state.setTransferForm,
    setCountItems: state.setCountItems,
    setCountForm: state.setCountForm,
    setPostingPin: state.setPostingPin,
    setSelectedTransferIds: state.setSelectedTransferIds,
    setSelectedSessionIds: state.setSelectedSessionIds,
  });

  const addTransferItem = () => {
    const product = findProduct(products, state.transferForm.productId);
    const qty = Number(state.transferForm.qty || 0);
    if (!product || !(qty > 0)) return;
    state.setTransferItems((current: StockTransferItem[]) => [...current, { id: `${product.id}-${Date.now()}`, productId: product.id, productName: product.name, qty }]);
    state.setTransferForm((current) => ({ ...current, productId: '', qty: '1' }));
  };

  const addCountItem = () => {
    const product = findProduct(products, state.countForm.productId);
    const countedQty = Number(state.countForm.countedQty || 0);
    if (!product || !Number.isFinite(countedQty) || countedQty < 0) return;
    const expectedQty = Number(product.stock || 0);
    state.setCountItems((current: StockCountItem[]) => [...current, {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      expectedQty,
      countedQty,
      varianceQty: Number((countedQty - expectedQty).toFixed(3)),
      reason: state.countForm.reason,
      note: state.countForm.itemNote,
    }]);
    state.setCountForm((current) => ({ ...current, productId: '', countedQty: '0', itemNote: '' }));
  };

  const visibleTransfers = transfersQuery.data?.rows || [];
  const stockCountSessions = stockCountQuery.data?.rows || [];
  const transferSummary = transfersQuery.data?.summary || { totalItems: 0, sent: 0, received: 0, cancelled: 0, totalQty: 0 };
  const stockCountSummary = stockCountQuery.data?.summary || { totalItems: 0, draft: 0, posted: 0, totalVariance: 0 };
  const damagedRecords = damagedQuery.data?.rows || [];
  const damagedSummary = damagedQuery.data?.summary || { totalItems: 0, totalQty: 0 };
  const stockMovements = stockMovementsQuery.data || [];
  const pendingTransfers = transferSummary.sent || 0;

  const { selectedTransfer, selectedSession, selectedTransferTotals, selectedSessionTotals } = useInventoryWorkspaceSelection({
    visibleTransfers,
    stockCountSessions,
    selectedTransferId: state.selectedTransferId,
    selectedSessionId: state.selectedSessionId,
  });

  const resetInventoryView = () => {
    state.setSearch('');
    state.setStatusFilter('all');
    state.setTransferFilter('all');
    state.setSessionFilter('all');
    state.setSelectedTransferId('');
    state.setSelectedSessionId('');
    state.setSelectedTransferIds([]);
    state.setSelectedSessionIds([]);
  };

  const canAdjustInventory = useHasAnyPermission('canAdjustInventory');
  const canPrint = useHasAnyPermission('canPrint');
  const canViewSensitivePricing = useHasAnyPermission(['canViewProfit', 'accounts', 'reports', 'purchases', 'settings', 'canManageSettings']);

  const sectionActions = createInventoryWorkspaceSectionActions({
    currentSection,
    rows,
    inventory,
    transferSummary,
    stockCountSummary,
    damagedSummary,
    stockMovements,
    selectedTransfer,
    selectedTransferTotals,
    selectedSession,
    selectedSessionTotals,
    transferFilter: state.transferFilter,
    sessionFilter: state.sessionFilter,
    setCopyFeedback: state.setCopyFeedback,
    canViewSensitivePricing,
  });

  const sectionDescription = getInventorySectionDescription(currentSection);
  const sectionSpotlightCards = buildInventorySectionSpotlightCards({
    currentSection,
    inventory,
    pendingTransfers,
    transferSummary,
    selectedTransfer,
    stockCountSummary,
    damagedSummary,
    damagedRecordsLength: damagedRecords.length,
    stockMovementsLength: stockMovements.length,
  });

  const hasRows = currentSection === 'overview'
    ? Boolean(rows.length)
    : currentSection === 'transfers'
      ? Boolean(transferSummary.totalItems)
      : currentSection === 'counts'
        ? Boolean(stockCountSummary.totalItems)
        : currentSection === 'damaged'
          ? Boolean(damagedSummary.totalItems)
          : Boolean(stockMovements.length);

  async function confirmTransferAction() {
    if (!state.transferActionConfirm) return;
    try {
      await mutations.transferActionMutation.mutateAsync({ transferIds: state.transferActionConfirm.transfers.map((entry) => String(entry.id)), action: state.transferActionConfirm.action });
      state.setTransferActionConfirm(null);
    } catch {}
  }

  async function confirmPostSessionAction() {
    if (!state.postSessionConfirm) return;
    try {
      await mutations.postCountMutation.mutateAsync({ sessionIds: state.postSessionConfirm.sessionIds, managerPin: state.postingPin });
      state.setPostSessionConfirm(null);
    } catch {}
  }

  const receiveSelectedTransfers = canAdjustInventory && state.selectedTransferIds.length
    ? () => {
      const selected = visibleTransfers.filter((transfer) => state.selectedTransferIds.includes(String(transfer.id)) && transfer.status === 'sent');
      if (selected.length) state.setTransferActionConfirm({ transfers: selected, action: 'receive' });
    }
    : undefined;
  const cancelSelectedTransfers = canAdjustInventory && state.selectedTransferIds.length
    ? () => {
      const selected = visibleTransfers.filter((transfer) => state.selectedTransferIds.includes(String(transfer.id)) && transfer.status === 'sent');
      if (selected.length) state.setTransferActionConfirm({ transfers: selected, action: 'cancel' });
    }
    : undefined;
  const postSelectedSessions = canAdjustInventory && state.selectedSessionIds.length
    ? () => {
      const selected = stockCountSessions.filter((session) => state.selectedSessionIds.includes(String(session.id)) && session.status === 'draft');
      if (selected.length) state.setPostSessionConfirm({ sessionIds: selected.map((session) => String(session.id)) });
    }
    : undefined;

  return {
    search: state.search,
    setSearch: state.setSearch,
    statusFilter: state.statusFilter,
    setStatusFilter: state.setStatusFilter,
    transferFilter: state.transferFilter,
    setTransferFilter: state.setTransferFilter,
    sessionFilter: state.sessionFilter,
    setSessionFilter: state.setSessionFilter,
    productsQuery,
    rows,
    inventory,
    actionCatalog,
    products,
    branches,
    locations,
    transferForm: state.transferForm,
    setTransferForm: state.setTransferForm,
    transferItems: state.transferItems,
    setTransferItems: state.setTransferItems,
    countForm: state.countForm,
    setCountForm: state.setCountForm,
    countItems: state.countItems,
    setCountItems: state.setCountItems,
    postingPin: state.postingPin,
    setPostingPin: state.setPostingPin,
    transferActionConfirm: state.transferActionConfirm,
    setTransferActionConfirm: state.setTransferActionConfirm,
    postSessionConfirm: state.postSessionConfirm,
    setPostSessionConfirm: state.setPostSessionConfirm,
    copyFeedback: state.copyFeedback,
    selectedTransferIds: state.selectedTransferIds,
    setSelectedTransferIds: state.setSelectedTransferIds,
    selectedSessionIds: state.selectedSessionIds,
    setSelectedSessionIds: state.setSelectedSessionIds,
    createTransferMutation: mutations.createTransferMutation,
    transferActionMutation: mutations.transferActionMutation,
    createCountMutation: mutations.createCountMutation,
    postCountMutation: mutations.postCountMutation,
    addTransferItem,
    addCountItem,
    visibleTransfers,
    transferSummary,
    pendingTransfers,
    stockCountSessions,
    stockCountSummary,
    damagedRecords,
    damagedSummary,
    stockMovements,
    selectedTransfer,
    selectedSession,
    selectedTransferTotals,
    selectedSessionTotals,
    resetInventoryView,
    canAdjustInventory,
    canPrint,
    canViewSensitivePricing,
    sectionDescription,
    sectionSpotlightCards,
    hasRows,
    confirmTransferAction,
    confirmPostSessionAction,
    transfersQuery,
    transfersPage: state.transfersPage,
    setTransfersPage: state.setTransfersPage,
    transfersPageSize: state.transfersPageSize,
    setTransfersPageSize: state.setTransfersPageSize,
    setSelectedTransferId: state.setSelectedTransferId,
    printTransferDocument,
    receiveSelectedTransfers,
    cancelSelectedTransfers,
    stockCountQuery,
    damagedQuery,
    sessionsPage: state.sessionsPage,
    setSessionsPage: state.setSessionsPage,
    sessionsPageSize: state.sessionsPageSize,
    setSessionsPageSize: state.setSessionsPageSize,
    setSelectedSessionId: state.setSelectedSessionId,
    printStockCountDocument,
    postSelectedSessions,
    damagedPage: state.damagedPage,
    setDamagedPage: state.setDamagedPage,
    damagedPageSize: state.damagedPageSize,
    setDamagedPageSize: state.setDamagedPageSize,
    ...sectionActions,
  };
}
