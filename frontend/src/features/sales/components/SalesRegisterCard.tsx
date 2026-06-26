import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatCurrency } from '@/lib/format';
import { SalesTable } from '@/features/sales/components/SalesTable';
import type { SalesListFilter } from '@/features/sales/api/sales.api';
import type { Sale } from '@/types/domain';
import { useTranslation } from "react-i18next";

export type SalesPaymentFilter = SalesListFilter;

type CashierFilterOption = {
  id: string;
  label: string;
};

type Props = {
  search: string;
  viewFilter: SalesPaymentFilter;
  cashierFilter: string;
  cashierOptions: CashierFilterOption[];
  activeFilterLabel: string;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  totalSales: number;
  selectedSale: Sale | null | undefined;
  selectedSaleId: string;
  rows: Sale[];
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canPrint: boolean;
  canEditInvoices: boolean;
  onSearchChange: (value: string) => void;
  onViewFilterChange: (value: SalesPaymentFilter) => void;
  onCashierFilterChange: (value: string) => void;
  onReset: () => void;
  onSelectSale: (saleId: string) => void;
  onEditSale: (sale: Sale) => void;
  onCancelSale: (sale: Sale) => void;
  onExportCsv: () => void | Promise<void>;
  onPrintRegister: () => void | Promise<void>;
  onPrintSale: (sale: Sale) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function SalesRegisterCard(props: Props) {
    const { t } = useTranslation();
  const {
    search,
    viewFilter,
    cashierFilter,
    cashierOptions,
    activeFilterLabel,
    totalItems,
    rangeStart,
    rangeEnd,
    totalSales,
    selectedSale,
    selectedSaleId,
    rows,
    page,
    pageSize,
    totalPages,
    isLoading,
    isError,
    error,
    canPrint,
    canEditInvoices,
    onSearchChange,
    onViewFilterChange,
    onCashierFilterChange,
    onReset,
    onSelectSale,
    onEditSale,
    onCancelSale,
    onExportCsv,
    onPrintRegister,
    onPrintSale,
    onPageChange,
    onPageSizeChange,
  } = props;

  return (
    <Card
      title={t('sales.2a9511')}
      description={t('sales.05777d')}
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void onExportCsv()} disabled={!totalItems}>{t('sales.91cafe')}</Button><Button variant="secondary" onClick={() => void onPrintRegister()} disabled={!totalItems || !canPrint}>{t('sales.c1f6d4')}</Button><span className="nav-pill">{t('sales.ec4337')}</span></div>}
      className="workspace-panel sales-register-card"
    >
      <SearchToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel={t('sales.4560db')}
        searchPlaceholder={SINGLE_STORE_MODE ? t('sales.aba74b') : t('sales.2f0efb')}
        actions={<span className="nav-pill">{activeFilterLabel}</span>}
        meta={(
          <>
            <span className="toolbar-meta-pill">{t('sales.79fb9c')}{totalItems}</span>
            <span className="toolbar-meta-pill">{t('sales.86c80e')}{rangeStart}-{rangeEnd}</span>
            <span className="toolbar-meta-pill">{t('sales.327511')}{formatCurrency(totalSales)}</span>
            <span className="toolbar-meta-pill">{t('sales.1b3184')}{selectedSale ? (selectedSale.docNo || selectedSale.id) : t('sales.9d7155')}</span>
          </>
        )}
        onReset={onReset}
        resetLabel={t('sales.399328')}
      >
        <div className="filter-chip-row toolbar-chip-row sales-register-toolbar-filters">
          <div className="field sales-toolbar-filter-field">
            <span>{t('sales.8f31e7')}</span>
            <select value={viewFilter} onChange={(event) => onViewFilterChange(event.target.value as SalesPaymentFilter)}>
              <option value="all">{t('sales.6d08f1')}</option>
              <option value="cash">{t('sales.47062f')}</option>
              <option value="card">{t('sales.197925')}</option>
              <option value="credit">{t('sales.80106f')}</option>
              <option value="wallet">{t('sales.52d3cb')}</option>
              <option value="instapay">InstaPay</option>
              <option value="mixed">{t('sales.37b2ef')}</option>
            </select>
          </div>
          <div className="field sales-toolbar-filter-field">
            <span>{t('sales.c571ae')}</span>
            <select value={cashierFilter} onChange={(event) => onCashierFilterChange(event.target.value)}>
              <option value="all">{t('sales.554362')}</option>
              {cashierOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </SearchToolbar>

      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!rows.length && !isLoading}
        loadingText={t('sales.6e28d8')}
        emptyTitle={t('sales.981f5a')}
        emptyHint={t('sales.c90033')}
      >
        <SalesTable
          rows={rows}
          selectedId={selectedSaleId}
          onSelect={(sale) => onSelectSale(sale.id)}
          onEdit={canEditInvoices ? onEditSale : undefined}
          onCancel={canEditInvoices ? onCancelSale : undefined}
          onPrint={canPrint ? onPrintSale : undefined}
        />
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[15, 30, 50, 100]}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={t('sales.f95919')}
        />
      </QueryFeedback>
    </Card>
  );
}
