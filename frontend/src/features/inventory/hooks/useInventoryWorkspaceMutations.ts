import { useMutation, type QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { invalidateInventoryDomain } from '@/app/query-invalidation';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { withIdempotency } from '@/lib/idempotency';
import { INVENTORY_OPERATION_TYPES } from '@/features/inventory/lib/inventory-operation-types';
import type { StockCountItem, StockTransferItem, StockTransfer } from '@/types/domain';

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
  setCreatedTransfer,
}: {
  queryClient: QueryClient;
  transferForm: { fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string; serials: string; batchAllocations: string };
  transferItems: StockTransferItem[];
  countForm: { branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string };
  countItems: StockCountItem[];
  setTransferItems: Dispatch<SetStateAction<StockTransferItem[]>>;
  setTransferForm: Dispatch<SetStateAction<{ fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string; serials: string; batchAllocations: string }>>;
  setCountItems: Dispatch<SetStateAction<StockCountItem[]>>;
  setCountForm: Dispatch<SetStateAction<{ branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string }>>;
  setPostingPin: Dispatch<SetStateAction<string>>;
  setSelectedTransferIds: Dispatch<SetStateAction<string[]>>;
  setSelectedSessionIds: Dispatch<SetStateAction<string[]>>;
  setCreatedTransfer: Dispatch<SetStateAction<StockTransfer | null>>;
}) {
  const refreshInventoryQueries = async () => {
    await invalidateInventoryDomain(queryClient, { includeProducts: true, includeDashboard: true });
  };

  const createTransferMutation = useMutation({
    mutationFn: () => withIdempotency(
      (headers) => inventoryApi.createStockTransfer({
        fromLocationId: transferForm.fromLocationId,
        toLocationId: transferForm.toLocationId,
        note: transferForm.note,
        recipientName: transferForm.recipientName,
        items: transferItems.map((item) => ({ productId: item.productId, qty: item.qty, serials: item.serials, batchAllocations: item.batchAllocations })), 
      }, headers),
      INVENTORY_OPERATION_TYPES.createTransfer,
      crypto.randomUUID()
    ),
    onSuccess: async (data: unknown) => {
      await refreshInventoryQueries();
      setTransferItems([]);
      setTransferForm({ fromLocationId: '', toLocationId: '', note: '', recipientName: '', productId: '', qty: '1', serials: '', batchAllocations: '' });
      setCreatedTransfer((data as { stockTransfer: StockTransfer }).stockTransfer || null);
    },
  });

  const transferActionMutation = useMutation({
    mutationFn: async ({ transferIds, action, receiptItems }: {
      transferIds: string[]; action: 'receive' | 'cancel';
      receiptItems?: Record<string, Array<{ itemId: number; receivedQty: number; receivedSerials?: string[]; batchReceipts?: Array<{ transitBatchId: number; receivedQty: number }> }>>;
    }) => {
      for (const transferId of transferIds) {
        if (action === 'receive') {
          await withIdempotency((headers) => inventoryApi.receiveStockTransfer(transferId, headers, { items: receiptItems?.[transferId] }), INVENTORY_OPERATION_TYPES.receiveTransfer, crypto.randomUUID());
        } else {
          await withIdempotency((headers) => inventoryApi.cancelStockTransfer(transferId, headers), INVENTORY_OPERATION_TYPES.cancelTransfer, crypto.randomUUID());
        }
      }
    },
    onSuccess: async () => {
      await refreshInventoryQueries();
      setSelectedTransferIds([]);
    },
  });

  const createCountMutation = useMutation({
    mutationFn: ({ noteOverride }: { noteOverride?: string } = {}) => {
      const countedOnly = countItems.filter(
        (item) => item.isCounted !== false && item.countedQty !== '' && item.countedQty !== null && item.countedQty !== undefined
      );

      if (!countedOnly.length) {
        throw new Error('يرجى إدخال كميات معدودة لصنف واحد على الأقل قبل حفظ جلسة الجرد.');
      }

      const payload: Record<string, unknown> = {
        locationId: Number(countForm.locationId),
        items: countedOnly.map((item) => {
          const countItem: Record<string, unknown> = {
            productId: item.productId,
            countedQty: Number(item.countedQty),
          };

          if (item.countedSerials?.length) countItem.countedSerials = item.countedSerials;
          const batchLines = String(item.batchCountsText || '').split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
          if (batchLines.length) countItem.batchCounts = batchLines.map(line => {
            const existing = /^(\d+)\s*:\s*(\d+(?:\.\d+)?)$/.exec(line);
            if (existing) return { batchId: Number(existing[1]), countedQty: Number(existing[2]) };
            const novel = /^NEW:([^:]+):(\d{4}-\d{2}-\d{2}):(\d+(?:\.\d+)?)$/i.exec(line);
            if (novel) return { batchNumber: novel[1].trim(), expiryDate: novel[2], countedQty: Number(novel[3]) };
            throw new Error(`صيغة تشغيلة الجرد غير صحيحة للصنف ${item.productName}`);
          });
          if (String(item.reason || '').trim()) countItem.reason = item.reason;
          if (String(item.note || '').trim()) countItem.note = item.note;
          return countItem;
        }),
      };

      if (String(countForm.branchId || '').trim()) payload.branchId = Number(countForm.branchId);
      const effectiveNote = String(noteOverride || '').trim() || String(countForm.note || '').trim();
      if (effectiveNote) payload.note = effectiveNote;
      if (String(countForm.managerPin || '').trim()) payload.managerPin = countForm.managerPin.trim();

      return inventoryApi.createStockCountSession(payload);
    },
    onSuccess: async () => {
      await refreshInventoryQueries();
      setCountItems([]);
      setCountForm({ branchId: '', locationId: '', note: '', managerPin: '', productId: '', countedQty: '0', reason: '', itemNote: '' });
    },
  });

  const postCountMutation = useMutation({
    mutationFn: async ({ sessionIds, managerPin }: { sessionIds: string[]; managerPin?: string }) => {
      for (const sessionId of sessionIds) {
        await inventoryApi.postStockCountSession(sessionId, { adminPassword: managerPin, managerPin });
      }
    },
    onSuccess: async () => {
      await refreshInventoryQueries();
      setPostingPin('');
      setSelectedSessionIds([]);
    },
  });

  const deleteCountMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return inventoryApi.deleteStockCountSession(sessionId);
    },
    onSuccess: async () => {
      await refreshInventoryQueries();
    },
  });

  return {
    refreshInventoryQueries,
    createTransferMutation,
    transferActionMutation,
    createCountMutation,
    postCountMutation,
    deleteCountMutation,
  };
}
