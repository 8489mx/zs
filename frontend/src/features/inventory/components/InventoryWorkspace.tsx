import { InventoryWorkspaceHeader } from '@/features/inventory/components/InventoryWorkspaceHeader';
import { InventorySectionTabs } from '@/features/inventory/pages/InventorySectionTabs';
import { InventoryMovementCard, InventoryOverviewStats, InventoryStatusCard, StockCountComposerCard, StockCountMonitorCard, StockTransferComposerCard, TransferMonitorCard, DamagedStockCard } from '@/features/inventory/components/InventoryWorkspaceSections';
import { InventoryTransferActionDialog, InventoryPostSessionDialog } from '@/features/inventory/components/InventoryWorkspaceDialogs';
import { InventoryActionsPanel } from '@/features/inventory/components/InventoryActionsPanel';
import { useInventoryWorkspaceController } from '@/features/inventory/hooks/useInventoryWorkspaceController';
import type { InventorySectionKey } from '@/features/inventory/pages/inventory.page-config';

export function InventoryWorkspace({ currentSection }: { currentSection: InventorySectionKey }) {
  const inventory = useInventoryWorkspaceController(currentSection);

  return (
    <div className="page-stack page-shell inventory-workspace">
      <InventoryWorkspaceHeader
        canPrint={inventory.canPrint}
        hasRows={inventory.hasRows}
        description={inventory.sectionDescription}
        currentSection={currentSection}
        onReset={inventory.resetInventoryView}
        onCopySummary={() => void Promise.resolve(inventory.copyInventorySummary())}
        onExportCsv={() => void Promise.resolve(inventory.sectionExportHandler())}
        onPrintList={() => void Promise.resolve(inventory.sectionPrintHandler())}
      />

      <InventorySectionTabs currentSection={currentSection} />

      <div className="inventory-spotlight-grid">
        {inventory.sectionSpotlightCards.map((card: { key: string; label: string; value: string | number }) => (
          <div key={card.key} className="inventory-spotlight-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      {inventory.copyFeedback ? <div className={inventory.copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{inventory.copyFeedback.text}</div> : null}

      {currentSection === 'overview' ? (
        <div className="inventory-overview-stack">
          <InventoryOverviewStats
            total={inventory.inventory.total}
            outOfStock={inventory.inventory.outOfStock.length}
            lowStock={inventory.inventory.lowStock.length}
            inventoryValue={inventory.canViewSensitivePricing ? inventory.inventory.inventoryValue : null}
          />

          <InventoryStatusCard
            statusFilter={inventory.statusFilter}
            onStatusFilterChange={inventory.setStatusFilter}
            search={inventory.search}
            onSearchChange={inventory.setSearch}
            onReset={inventory.resetInventoryView}
            rows={inventory.rows}
            isLoading={inventory.productsQuery.isLoading}
            isError={inventory.productsQuery.isError}
            error={inventory.productsQuery.error}
            includeSensitivePricing={inventory.canViewSensitivePricing}
          />

          <InventoryActionsPanel
            products={inventory.products}
            branches={inventory.branches}
            locations={inventory.locations}
            isCatalogLoading={inventory.actionCatalog.isLoading}
            isCatalogError={inventory.actionCatalog.isError}
            catalogError={inventory.actionCatalog.error}
            canManageInventory={inventory.canAdjustInventory}
          />
        </div>
      ) : null}

      {currentSection === 'transfers' ? (
        <>
          <TransferMonitorCard
            isLoading={inventory.transfersQuery.isLoading}
            isError={inventory.transfersQuery.isError}
            error={inventory.transfersQuery.error}
            visibleTransfers={inventory.visibleTransfers}
            pendingTransfersCount={inventory.pendingTransfers}
            transferTotalItems={inventory.transferSummary.totalItems}
            page={inventory.transfersQuery.data?.pagination.page || inventory.transfersPage}
            pageSize={inventory.transfersQuery.data?.pagination.pageSize || inventory.transfersPageSize}
            totalItems={inventory.transfersQuery.data?.pagination.totalItems || inventory.transferSummary.totalItems}
            onPageChange={inventory.setTransfersPage}
            onPageSizeChange={(value) => { inventory.setTransfersPageSize(value); inventory.setTransfersPage(1); }}
            selectedTransfer={inventory.selectedTransfer}
            selectedTransferTotals={inventory.selectedTransferTotals}
            transferFilter={inventory.transferFilter}
            onTransferFilterChange={inventory.setTransferFilter}
            onSelectTransfer={inventory.setSelectedTransferId}
            onCopyTransferDetails={() => void inventory.copyTransferDetails()}
            onPrintTransfer={inventory.printTransferDocument}
            onExportTransfers={inventory.exportTransfersCsv}
            onReceiveTransfer={inventory.canAdjustInventory ? (transfer) => inventory.setTransferActionConfirm({ transfers: [transfer], action: 'receive' }) : undefined}
            onCancelTransfer={inventory.canAdjustInventory ? (transfer) => inventory.setTransferActionConfirm({ transfers: [transfer], action: 'cancel' }) : undefined}
            selectedTransferIds={inventory.selectedTransferIds}
            onSelectedTransferIdsChange={inventory.setSelectedTransferIds}
            onReceiveSelectedTransfers={inventory.receiveSelectedTransfers}
            onCancelSelectedTransfers={inventory.cancelSelectedTransfers}
          />

          <StockTransferComposerCard
            products={inventory.products}
            locations={inventory.locations}
            form={inventory.transferForm}
            items={inventory.transferItems}
            isPending={inventory.createTransferMutation.isPending}
            isError={inventory.createTransferMutation.isError}
            isSuccess={inventory.createTransferMutation.isSuccess}
            error={inventory.createTransferMutation.error}
            onFormChange={(patch) => inventory.setTransferForm((current) => ({ ...current, ...patch }))}
            onAddItem={inventory.addTransferItem}
            onRemoveItem={(index) => inventory.setTransferItems((current) => current.filter((_, currentIndex: number) => currentIndex !== index))}
            onSubmit={() => inventory.createTransferMutation.mutate()}
          />
        </>
      ) : null}

      {currentSection === 'counts' ? (
        <>
          <StockCountMonitorCard
            isLoading={inventory.stockCountQuery.isLoading || inventory.damagedQuery.isLoading}
            isError={inventory.stockCountQuery.isError || inventory.damagedQuery.isError}
            error={inventory.stockCountQuery.error || inventory.damagedQuery.error}
            stockCountSessions={inventory.stockCountSessions}
            damagedRecords={inventory.damagedRecords}
            sessionTotalItems={inventory.stockCountSummary.totalItems}
            page={inventory.stockCountQuery.data?.pagination.page || inventory.sessionsPage}
            pageSize={inventory.stockCountQuery.data?.pagination.pageSize || inventory.sessionsPageSize}
            totalItems={inventory.stockCountQuery.data?.pagination.totalItems || inventory.stockCountSummary.totalItems}
            onPageChange={inventory.setSessionsPage}
            onPageSizeChange={(value) => { inventory.setSessionsPageSize(value); inventory.setSessionsPage(1); }}
            selectedSession={inventory.selectedSession}
            selectedSessionTotals={inventory.selectedSessionTotals}
            sessionFilter={inventory.sessionFilter}
            postingPin={inventory.postingPin}
            postPending={inventory.postCountMutation.isPending}
            postError={inventory.postCountMutation.error}
            postSuccess={inventory.postCountMutation.isSuccess}
            transferSuccess={inventory.transferActionMutation.isSuccess}
            transferError={inventory.transferActionMutation.error}
            onSessionFilterChange={inventory.setSessionFilter}
            onPostingPinChange={inventory.setPostingPin}
            onSelectSession={inventory.setSelectedSessionId}
            onPostSession={inventory.canAdjustInventory ? (sessionId) => inventory.setPostSessionConfirm({ sessionIds: [sessionId] }) : undefined}
            onCopySessionDetails={() => void inventory.copySessionDetails()}
            onPrintCountSessions={inventory.printCountSessionsHandler}
            onPrintDamagedRecords={inventory.printDamagedRecordsHandler}
            onExportDamagedCsv={inventory.exportDamagedCsvHandler}
            onPrintSession={inventory.printStockCountDocument}
            selectedSessionIds={inventory.selectedSessionIds}
            onSelectedSessionIdsChange={inventory.setSelectedSessionIds}
            onPostSelectedSessions={inventory.postSelectedSessions}
          />

          <StockCountComposerCard
            products={inventory.products}
            branches={inventory.branches}
            locations={inventory.locations}
            form={inventory.countForm}
            items={inventory.countItems}
            isPending={inventory.createCountMutation.isPending}
            isError={inventory.createCountMutation.isError}
            isSuccess={inventory.createCountMutation.isSuccess}
            error={inventory.createCountMutation.error}
            onFormChange={(patch) => inventory.setCountForm((current) => ({ ...current, ...patch }))}
            onAddItem={inventory.addCountItem}
            onRemoveItem={(index) => inventory.setCountItems((current) => current.filter((_, currentIndex: number) => currentIndex !== index))}
            onSubmit={() => inventory.createCountMutation.mutate()}
          />
        </>
      ) : null}

      {currentSection === 'damaged' ? (
        <DamagedStockCard
          damagedRecords={inventory.damagedRecords}
          totalItems={inventory.damagedSummary.totalItems}
          page={inventory.damagedQuery.data?.pagination.page || inventory.damagedPage}
          pageSize={inventory.damagedQuery.data?.pagination.pageSize || inventory.damagedPageSize}
          onPageChange={inventory.setDamagedPage}
          onPageSizeChange={(value) => { inventory.setDamagedPageSize(value); inventory.setDamagedPage(1); }}
          onPrintDamagedRecords={() => void inventory.printDamagedRecordsHandler()}
          onExportDamagedCsv={() => void inventory.exportDamagedCsvHandler()}
        />
      ) : null}

      {currentSection === 'movements' ? <InventoryMovementCard /> : null}

      <InventoryTransferActionDialog
        action={inventory.transferActionConfirm}
        isBusy={inventory.transferActionMutation.isPending}
        onCancel={() => inventory.setTransferActionConfirm(null)}
        onConfirm={() => void inventory.confirmTransferAction()}
      />

      <InventoryPostSessionDialog
        sessions={inventory.postSessionConfirm ? inventory.stockCountSessions.filter((session) => inventory.postSessionConfirm?.sessionIds.includes(String(session.id))) : []}
        postingPin={inventory.postingPin}
        isBusy={inventory.postCountMutation.isPending}
        onCancel={() => inventory.setPostSessionConfirm(null)}
        onConfirm={() => void inventory.confirmPostSessionAction()}
      />
    </div>
  );
}
