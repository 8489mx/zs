import { useMemo } from 'react';
import type { StockCountSession, StockTransfer } from '@/types/domain';
import {
  getSelectedSessionTotals,
  getSelectedTransferTotals,
  selectInventorySession,
  selectInventoryTransfer,
} from '@/features/inventory/lib/inventory-workspace.helpers';

export function useInventoryWorkspaceSelection({ visibleTransfers, stockCountSessions, selectedTransferId, selectedSessionId }: { visibleTransfers: StockTransfer[]; stockCountSessions: StockCountSession[]; selectedTransferId: string; selectedSessionId: string; }) {
  const selectedTransfer = useMemo(() => selectInventoryTransfer(visibleTransfers, selectedTransferId), [visibleTransfers, selectedTransferId]);
  const selectedSession = useMemo(() => selectInventorySession(stockCountSessions, selectedSessionId), [stockCountSessions, selectedSessionId]);
  const selectedTransferTotals = useMemo(() => getSelectedTransferTotals(selectedTransfer), [selectedTransfer]);
  const selectedSessionTotals = useMemo(() => getSelectedSessionTotals(selectedSession), [selectedSession]);

  return {
    selectedTransfer,
    selectedSession,
    selectedTransferTotals,
    selectedSessionTotals,
  };
}
