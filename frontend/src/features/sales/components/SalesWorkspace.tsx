import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { useSalesPage } from '@/features/sales/hooks/useSalesPage';
import { useSaleActions } from '@/features/sales/hooks/useSaleActions';
import { useSalesWorkspaceActions } from '@/features/sales/hooks/useSalesWorkspaceActions';
import { SalesWorkspaceHeader } from '@/features/sales/components/SalesWorkspaceHeader';
import { SalesRegisterCard } from '@/features/sales/components/SalesRegisterCard';
import { SalesSidePanel } from '@/features/sales/components/SalesSidePanel';
import { SaleEditDialog } from '@/features/sales/components/SaleEditDialog';
import {
  getSaleCancelDescription,
  getSalesViewFilterLabel,
  printSaleDocument,
} from '@/features/sales/lib/sales-workspace.helpers';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import type { Sale } from '@/types/domain';

export function SalesWorkspace() {
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'cash' | 'credit' | 'cancelled'>('all');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const { salesQuery, availableProducts, rows, pagination, summary } = useSalesPage({ page, pageSize, search, filter: viewFilter });
  const { saleDetailQuery, cancelMutation, updateMutation } = useSaleActions(selectedSaleId);
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

  useEffect(() => {
    setPage(1);
  }, [search, viewFilter]);

  const cancelDescription = getSaleCancelDescription(saleToCancel);

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
    totalItems,
    summary,
    topCustomers,
    setPage,
    setPageSize,
    setSearch,
    setViewFilter,
    setSelectedSaleId,
    setSaleToCancel,
    setSaleToEdit,
  });

  const handleViewFilterChange = (value: 'all' | 'cash' | 'credit' | 'cancelled') => {
    setViewFilter(value);
    setPage(1);
  };

  return (
    <div className="page-stack page-shell sales-workspace">
      <SalesWorkspaceHeader totalItems={totalItems} onCopySummary={copySalesSummary} />

      {!hasSellableProducts ? (
        <Card title="جاهزية البيع" actions={<span className="nav-pill">التحقق قبل البيع</span>} className="workspace-panel">
          <EmptyState title="لا توجد أصناف متاحة للبيع الآن" hint="أكمل مخزون الأصناف من صفحة المشتريات أو المخزون ثم ارجع إلى نقطة البيع." />
          <div className="actions section-actions-clean">
            <Link to="/purchases"><Button variant="secondary">فتح المشتريات</Button></Link>
            <Link to="/inventory"><Button variant="secondary">فتح المخزون</Button></Link>
          </div>
        </Card>
      ) : null}

      <div className="sales-main-grid">
        <SalesRegisterCard
          search={search}
          viewFilter={viewFilter}
          activeFilterLabel={activeFilterLabel}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalSales={summary?.totalSales || 0}
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
          onReset={resetSalesView}
          onSelectSale={setSelectedSaleId}
          onEditSale={(sale) => { setSelectedSaleId(sale.id); setSaleToEdit(sale); }}
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
          onEditSale={() => selectedSale ? setSaleToEdit(selectedSale) : undefined}
          onCancelSale={() => selectedSale ? setSaleToCancel(selectedSale) : undefined}
        />
      </div>

      <SaleEditDialog
        open={Boolean(saleToEdit)}
        sale={saleToEdit || undefined}
        isBusy={updateMutation.isPending}
        errorMessage={updateMutation.isError ? (updateMutation.error instanceof Error ? updateMutation.error.message : 'تعذر حفظ التعديل') : ''}
        onCancel={() => { setSaleToEdit(null); updateMutation.reset(); }}
        onSave={async (payload) => {
          if (!saleToEdit) return;
          await updateMutation.mutateAsync({ sale: saleToEdit, payload });
          setSelectedSaleId(saleToEdit.id);
          setSaleToEdit(null);
        }}
      />

      <ActionConfirmDialog
        open={Boolean(saleToCancel)}
        title="تأكيد إلغاء فاتورة البيع"
        description={cancelDescription}
        confirmLabel="نعم، إلغاء الفاتورة"
        confirmationKeyword="إلغاء"
        confirmationLabel="اكتب كلمة إلغاء للتأكيد"
        confirmationHint="سيتم عكس أثر الفاتورة على المخزون والحسابات إذا كانت العملية مسموحة."
        managerPinRequired
        managerPinHint="هذه العملية تحتاج اعتماد المدير المسجل في الإعدادات."
        reasonRequired
        reasonLabel="سبب إلغاء الفاتورة"
        reasonHint="اكتب سببًا واضحًا حتى يظهر في السجل ويكون مرجعًا لاحقًا."
        reasonPlaceholder="مثال: تم تسجيل الفاتورة بالخطأ أو أُلغيت قبل التسليم"
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
