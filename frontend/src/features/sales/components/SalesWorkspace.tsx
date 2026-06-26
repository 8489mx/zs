import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { useSalesPage } from '@/features/sales/hooks/useSalesPage';
import { useSaleActions } from '@/features/sales/hooks/useSaleActions';
import { useSalesWorkspaceActions } from '@/features/sales/hooks/useSalesWorkspaceActions';
import { SalesWorkspaceHeader } from '@/features/sales/components/SalesWorkspaceHeader';
import { SalesRegisterCard, type SalesPaymentFilter } from '@/features/sales/components/SalesRegisterCard';
import { SalesSidePanel } from '@/features/sales/components/SalesSidePanel';
import { SaleEditDialog } from '@/features/sales/components/SaleEditDialog';
import {
  getSaleCancelDescription,
  getSalesNextStep,
  getSalesViewFilterLabel,
  printSaleDocument,
} from '@/features/sales/lib/sales-workspace.helpers';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { userDirectoryApi } from '@/shared/api/user-directory';
import type { Sale } from '@/types/domain';
import { useTranslation } from "react-i18next";

export function SalesWorkspace() {
    const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<SalesPaymentFilter>('all');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editFeedback, setEditFeedback] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const { salesQuery, availableProducts, rows, pagination, summary } = useSalesPage({ page, pageSize, search, filter: viewFilter, cashier: cashierFilter });
  const { saleDetailQuery, cancelMutation, updateMutation } = useSaleActions(selectedSaleId);
  const usersQuery = useQuery({ queryKey: ['sales-cashier-filter-users'], queryFn: userDirectoryApi.users, staleTime: 60_000 });
  const settingsQuery = useSettingsQuery();

  const hasSellableProducts = availableProducts.length > 0;
  const canPrint = useHasAnyPermission('canPrint');
  const canEditInvoices = useHasAnyPermission('canEditInvoices');
  const selectedSale = saleDetailQuery.data;
  const activeFilterLabel = getSalesViewFilterLabel(viewFilter);
  const totalItems = pagination?.totalItems || 0;
  const topCustomers = summary?.topCustomers || [];
  const rangeStart = pagination?.rangeStart || 0;
  const rangeEnd = pagination?.rangeEnd || 0;
  const printSettings = settingsQuery.data || null;
  const cashierOptions = useMemo(() => {
    const userOptions = (usersQuery.data || [])
      .map((user) => {
        const id = String(user.id || '').trim();
        if (!id) return null;
        const role = String(user.role || '').trim();
        const displayName = String(user.name || user.username || t('sales.f1beeb')).trim();
        return { id, label: role ? `${role} — ${displayName}` : displayName };
      })
      .filter((entry): entry is { id: string; label: string } => Boolean(entry));

    if (userOptions.length) return userOptions;

    return (summary?.cashiers || []).map((cashierName) => ({
      id: String(cashierName),
      label: String(cashierName),
    }));
  }, [summary?.cashiers, usersQuery.data]);

  useEffect(() => {
    setPage(1);
  }, [search, viewFilter, cashierFilter]);

  const cancelDescription = getSaleCancelDescription(saleToCancel);
  const totalSales = summary?.totalSales || 0;
  const salesNextStep = useMemo(() => getSalesNextStep({ selectedSale, canEditInvoices, totalItems }), [selectedSale, canEditInvoices, totalItems]);
  const headerDescription = selectedSale
    ? `الفاتورة ${selectedSale.docNo || selectedSale.id} محددة الآن. ${salesNextStep}`
    : t('sales.5fa1e3');

  const {
    exportSalesCsv,
    exportTopCustomersCsv,
    resetSalesView,
    copySalesSummary,
    printTopCustomers,
    printSalesRegister,
  } = useSalesWorkspaceActions({
    search,
    viewFilter,
    cashierFilter,
    totalItems,
    summary,
    topCustomers,
    setPage,
    setPageSize,
    setSearch,
    setViewFilter,
    setCashierFilter,
    setSelectedSaleId,
    setSaleToCancel,
  });

  const handleViewFilterChange = (value: SalesPaymentFilter) => {
    setViewFilter(value);
    setPage(1);
  };

  return (
    <div className="page-stack page-shell sales-workspace">
      <SalesWorkspaceHeader totalItems={totalItems} description={headerDescription} onCopySummary={copySalesSummary} />
      {editFeedback ? <div className="success-box">{editFeedback}</div> : null}

      {!hasSellableProducts ? (
        <Card title={t('sales.0189e9')} actions={<span className="nav-pill">{t('sales.b7a7f1')}</span>} className="workspace-panel">
          <EmptyState title={t('sales.0e9afb')} hint={t('sales.0aede7')} />
          <div className="actions section-actions-clean">
            <Link to="/purchases"><Button variant="secondary">{t('sales.4a5f34')}</Button></Link>
            <Link to="/inventory"><Button variant="secondary">{t('sales.83c654')}</Button></Link>
          </div>
        </Card>
      ) : null}
      <div className="sales-main-grid">
        <SalesRegisterCard
          search={search}
          viewFilter={viewFilter}
          cashierFilter={cashierFilter}
          cashierOptions={cashierOptions}
          activeFilterLabel={activeFilterLabel}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalSales={totalSales}
          selectedSale={selectedSale}
          selectedSaleId={selectedSaleId}
          rows={rows}
          page={pagination?.page || page}
          pageSize={pagination?.pageSize || pageSize}
          totalPages={pagination?.totalPages || 1}
          isLoading={salesQuery.isLoading}
          isError={salesQuery.isError}
          error={salesQuery.error}
          canPrint={canPrint}
          canEditInvoices={canEditInvoices}
          onSearchChange={setSearch}
          onViewFilterChange={handleViewFilterChange}
          onCashierFilterChange={(value) => { setCashierFilter(value); setPage(1); }}
          onReset={resetSalesView}
          onSelectSale={setSelectedSaleId}
          onEditSale={(sale) => {
            if (sale.status === 'cancelled') return;
            setSelectedSaleId(sale.id);
            setSaleToEdit(sale);
            setEditFeedback('');
          }}
          onCancelSale={setSaleToCancel}
          onExportCsv={exportSalesCsv}
          onPrintRegister={printSalesRegister}
          onPrintSale={(sale) => printSaleDocument(sale, printSettings, 'receipt')}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }}
        />

        <SalesSidePanel
          topCustomers={topCustomers}
          canPrint={canPrint}
          canEditInvoices={canEditInvoices}
          selectedSale={selectedSale}
          isLoading={saleDetailQuery.isLoading}
          onExportTopCustomers={exportTopCustomersCsv}
          onPrintTopCustomers={printTopCustomers}
          onPrintSale={() => selectedSale ? printSaleDocument(selectedSale, printSettings, 'receipt') : undefined}
          onEditSale={() => {
            if (!selectedSale || selectedSale.status === 'cancelled') return;
            setSaleToEdit(selectedSale);
            setEditFeedback('');
          }}
          onCancelSale={() => selectedSale ? setSaleToCancel(selectedSale) : undefined}
        />
      </div>

      <SaleEditDialog
        open={Boolean(saleToEdit)}
        sale={selectedSale && saleToEdit && selectedSale.id === saleToEdit.id ? selectedSale : saleToEdit || undefined}
        isBusy={updateMutation.isPending}
        errorMessage={updateMutation.error instanceof Error ? updateMutation.error.message : ''}
        onCancel={() => setSaleToEdit(null)}
        onSave={async (payload) => {
          const activeSale = selectedSale && saleToEdit && selectedSale.id === saleToEdit.id ? selectedSale : saleToEdit;
          if (!activeSale) return;
          await updateMutation.mutateAsync({ sale: activeSale, payload });
          setSaleToEdit(null);
          setEditFeedback(t('sales.9f6aed'));
          setSelectedSaleId(activeSale.id);
        }}
      />

      <ActionConfirmDialog
        open={Boolean(saleToCancel)}
        title={t('sales.d35686')}
        description={cancelDescription}
        confirmLabel={t('sales.5b8465')}
        confirmationKeyword={t('sales.b9568e')}
        confirmationLabel={t('sales.99274d')}
        confirmationHint={t('sales.30eb1d')}
        managerPinRequired
        managerPinHint={t('sales.3bec5f')}
        reasonRequired
        reasonLabel={t('sales.06667e')}
        reasonHint={t('sales.e3f046')}
        reasonPlaceholder={t('sales.b8c40f')}
        isBusy={cancelMutation.isPending}
        onCancel={() => setSaleToCancel(null)}
        onConfirm={async ({ managerPin, reason }) => {
          if (!saleToCancel) return;
          await cancelMutation.mutateAsync({ saleId: saleToCancel.id, reason, managerPin });
          setSelectedSaleId(saleToCancel.id);
          setSaleToCancel(null);
        }}
      />
    </div>
  );
}
