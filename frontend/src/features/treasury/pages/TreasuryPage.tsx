// regression marker: طباعة النتائج
// regression marker: المصروفات المطابقة
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/page-header';
import { formatCurrency } from '@/lib/format';
import { useTreasuryPage } from '@/features/treasury/hooks/useTreasuryPage';
import { useTreasuryPageActions } from '@/features/treasury/hooks/useTreasuryPageActions';
import {
  exportTransactionCsv,
  type TreasuryTransactionFilter,
} from '@/features/treasury/lib/treasury-page.helpers';
import { TreasuryTransactionsCard } from '@/features/treasury/components/TreasuryTransactionsCard';
import { TreasuryNavTabs } from '@/features/treasury/components/TreasuryNavTabs';

export function TreasuryPage() {
  const { t } = useTranslation();
  const { printMatchingTransactions, exportTransactions: exportTransactionRows } = useTreasuryPageActions();
  const [search, setSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState<TreasuryTransactionFilter>('all');
  const [txnPage, setTxnPage] = useState(1);
  const [txnPageSize, setTxnPageSize] = useState(25);
  const [isExportingTransactions, setIsExportingTransactions] = useState(false);
  const { transactionsQuery, transactionRows, transactionSummary, transactionPagination } = useTreasuryPage(
    { page: txnPage, pageSize: txnPageSize, search, filter: txnFilter },
    { page: 1, pageSize: 1, search: '' }
  );

  useEffect(() => setTxnPage(1), [search, txnFilter]);

  const exportTransactions = async () => {
    if (!transactionPagination?.totalItems) return;
    setIsExportingTransactions(true);
    try {
      exportTransactionCsv(await exportTransactionRows(search, txnFilter));
    } finally {
      setIsExportingTransactions(false);
    }
  };

  return (
    <div className="page-stack page-shell treasury-workspace treasury-workspace--compact">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
      <PageHeader
        title={t('treasury.title', 'الخزينة')}
        description={t('treasury.description', 'حركات وأرصدة الخزينة.')}
        badge={<span className="nav-pill">{t('treasury.financial_transactions', 'الحركات المالية')}</span>}
      />
      <TreasuryNavTabs currentTab="treasury" />
      <div className="stats-grid compact-grid treasury-stats-grid">
        <div className="stat-card"><span>{t('treasury.matching_transactions', 'عدد الحركات المطابقة')}</span><strong>{transactionPagination?.totalItems || 0}</strong></div>
        <div className="stat-card"><span>{t('treasury.cash_in', 'داخل الخزينة')}</span><strong>{formatCurrency(transactionSummary.cashIn)}</strong></div>
        <div className="stat-card"><span>{t('treasury.cash_out', 'خارج الخزينة')}</span><strong>{formatCurrency(transactionSummary.cashOut)}</strong></div>
        <div className="stat-card"><span>{t('treasury.net_treasury', 'صافي الخزينة')}</span><strong>{formatCurrency(transactionSummary.net)}</strong></div>
      </div>

        <TreasuryTransactionsCard
          search={search}
          onSearchChange={setSearch}
          txnFilter={txnFilter}
          onTxnFilterChange={setTxnFilter}
          onReset={() => { setSearch(''); setTxnFilter('all'); setTxnPage(1); }}
          onExport={() => void exportTransactions()}
          onPrint={() => void printMatchingTransactions(search, txnFilter)}
          isExporting={isExportingTransactions}
          transactionsQuery={transactionsQuery}
          transactionRows={transactionRows}
          transactionPagination={transactionPagination}
          txnPageSize={txnPageSize}
          setTxnPage={setTxnPage}
          setTxnPageSize={setTxnPageSize}
        />
      </main>
    </div>
  );
}

