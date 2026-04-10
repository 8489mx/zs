import { useState } from 'react';
import type { StockCountItem, StockTransfer, StockTransferItem } from '@/types/domain';
import type { InventoryStatusFilter } from '@/features/inventory/utils/inventory-mappers';

export type TransferActionConfirmState = {
  action: 'receive' | 'cancel';
  transfers: StockTransfer[];
};

export type PostSessionConfirmState = {
  sessionIds: string[];
};

export function useInventoryWorkspaceState() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('all');
  const [transferFilter, setTransferFilter] = useState<'all' | 'sent' | 'received' | 'cancelled'>('all');
  const [sessionFilter, setSessionFilter] = useState<'all' | 'draft' | 'posted'>('all');
  const [selectedTransferId, setSelectedTransferId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [transfersPage, setTransfersPage] = useState(1);
  const [transfersPageSize, setTransfersPageSize] = useState(10);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPageSize, setSessionsPageSize] = useState(8);
  const [damagedPage, setDamagedPage] = useState(1);
  const [damagedPageSize, setDamagedPageSize] = useState(10);
  const [transferForm, setTransferForm] = useState({ fromLocationId: '', toLocationId: '', note: '', productId: '', qty: '1' });
  const [transferItems, setTransferItems] = useState<StockTransferItem[]>([]);
  const [countForm, setCountForm] = useState({ branchId: '', locationId: '', note: '', managerPin: '', productId: '', countedQty: '0', reason: 'inventory_count', itemNote: '' });
  const [countItems, setCountItems] = useState<StockCountItem[]>([]);
  const [postingPin, setPostingPin] = useState('');
  const [transferActionConfirm, setTransferActionConfirm] = useState<TransferActionConfirmState | null>(null);
  const [postSessionConfirm, setPostSessionConfirm] = useState<PostSessionConfirmState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [selectedTransferIds, setSelectedTransferIds] = useState<string[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    transferFilter,
    setTransferFilter,
    sessionFilter,
    setSessionFilter,
    selectedTransferId,
    setSelectedTransferId,
    selectedSessionId,
    setSelectedSessionId,
    transfersPage,
    setTransfersPage,
    transfersPageSize,
    setTransfersPageSize,
    sessionsPage,
    setSessionsPage,
    sessionsPageSize,
    setSessionsPageSize,
    damagedPage,
    setDamagedPage,
    damagedPageSize,
    setDamagedPageSize,
    transferForm,
    setTransferForm,
    transferItems,
    setTransferItems,
    countForm,
    setCountForm,
    countItems,
    setCountItems,
    postingPin,
    setPostingPin,
    transferActionConfirm,
    setTransferActionConfirm,
    postSessionConfirm,
    setPostSessionConfirm,
    copyFeedback,
    setCopyFeedback,
    selectedTransferIds,
    setSelectedTransferIds,
    selectedSessionIds,
    setSelectedSessionIds,
  };
}
