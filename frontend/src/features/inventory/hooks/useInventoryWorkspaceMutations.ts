import { useMutation, type QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { invalidateInventoryDomain } from '@/app/query-invalidation';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import type { StockCountItem, StockTransferItem } from '@/types/domain';

export function useInventoryWorkspaceMutations({
  queryClient,
  transferForm,
  transferItems,
  countForm,
  countItems,
  setTransferItems,
  setTransferForm,
  setCountItems,
  setCountForm,
  setPostingPin,
  setSelectedTransferIds,
  setSelectedSessionIds,
}: {
  queryClient: QueryClient;
  transferForm: { fromLocationId: string; toLocationId: string; note: string; productId: string; qty: string };
  transferItems: StockTransferItem[];
  countForm: { branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string };
  countItems: StockCountItem[];
  setTransferItems: Dispatch<SetStateAction<StockTransferItem[]>>;
  setTransferForm: Dispatch<SetStateAction<{ fromLocationId: string; toLocationId: string; note: string; productId: string; qty: string }>>;
  setCountItems: Dispatch<SetStateAction<StockCountItem[]>>;
  setCountForm: Dispatch<SetStateAction<{ branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string }>>;
  setPostingPin: Dispatch<SetStateAction<string>>;
  setSelectedTransferIds: Dispatch<SetStateAction<string[]>>;
  setSelectedSessionIds: Dispatch<SetStateAction<string[]>>;
}) {
  const refreshInventoryQueries = async () => {
    await invalidateInventoryDomain(queryClient, { includeProducts: true, includeDashboard: true });
  };

  const createTransferMutation = useMutation({
    mutationFn: () => inventoryApi.createStockTransfer({
      fromLocationId: transferForm.fromLocationId,
      toLocationId: transferForm.toLocationId,
      note: transferForm.note,
      items: transferItems.map((item) => ({ productId: item.productId, qty: item.qty })),
    }),
    onSuccess: async () => {
      await refreshInventoryQueries();
      setTransferItems([]);
      setTransferForm({ fromLocationId: '', toLocationId: '', note: '', productId: '', qty: '1' });
    },
  });

  const transferActionMutation = useMutation({
    mutationFn: async ({ transferIds, action }: { transferIds: string[]; action: 'receive' | 'cancel' }) => {
      for (const transferId of transferIds) {
        if (action === 'receive') await inventoryApi.receiveStockTransfer(transferId);
        else await inventoryApi.cancelStockTransfer(transferId);
      }
    },
    onSuccess: async () => {
      await refreshInventoryQueries();
      setSelectedTransferIds([]);
    },
  });

  const createCountMutation = useMutation({
    mutationFn: () => inventoryApi.createStockCountSession({
      branchId: countForm.branchId,
      locationId: countForm.locationId,
      note: countForm.note,
      managerPin: countForm.managerPin,
      items: countItems.map((item) => ({ productId: item.productId, countedQty: item.countedQty, reason: item.reason, note: item.note })),
    }),
    onSuccess: async () => {
      await refreshInventoryQueries();
      setCountItems([]);
      setCountForm({ branchId: '', locationId: '', note: '', managerPin: '', productId: '', countedQty: '0', reason: 'inventory_count', itemNote: '' });
    },
  });

  const postCountMutation = useMutation({
    mutationFn: async ({ sessionIds, managerPin }: { sessionIds: string[]; managerPin: string }) => {
      for (const sessionId of sessionIds) {
        await inventoryApi.postStockCountSession(sessionId, { managerPin });
      }
    },
    onSuccess: async () => {
      await refreshInventoryQueries();
      setPostingPin('');
      setSelectedSessionIds([]);
    },
  });

  return {
    refreshInventoryQueries,
    createTransferMutation,
    transferActionMutation,
    createCountMutation,
    postCountMutation,
  };
}
