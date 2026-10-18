import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/shared/components/report-metric-card';
import { formatCurrency } from '@/lib/format';

import { accountingApi, type FinancialSummaryBreakdownRow } from '@/features/accounting/api/accounting.api';

export function AccountingFinancialSummaryPage() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');

  const query = useQuery({
    queryKey: ['accounting', 'financial-summary', appliedDateFrom, appliedDateTo],
    queryFn: () => accountingApi.financialSummary({ date_from: appliedDateFrom || undefined, date_to: appliedDateTo || undefined }),
  });

  const cards = query.data?.cards;
  const breakdowns = query.data?.breakdowns;

  const summaryItems = useMemo(() => {
    if (!cards) return [];
    return [
      { key: 'grossSales', label: 'إجمالي المبيعات', value: formatCurrency(cards.grossSales) },
      { key: 'returnsDiscounts', label: 'مردودات وخصومات', value: formatCurrency((cards.salesReturns || 0) + (cards.salesDiscounts || 0)) },
      { key: 'netSales', label: 'صافي المبيعات', value: formatCurrency(cards.netSales) },
      { key: 'cogs', label: 'تكلفة البضاعة', value: formatCurrency(cards.cogs) },
      { key: 'grossProfit', label: 'مجمل الربح', value: formatCurrency(cards.grossProfit) },
      { key: 'expenses', label: 'المصروفات', value: formatCurrency(cards.operatingExpenses) },
      { key: 'netProfit', label: 'صافي الربح', value: formatCurrency(cards.netProfit) },
      { key: 'cashMovement', label: 'صافي حركة النقدية', value: formatCurrency(cards.netCashMovement) },
    ];
  }, [cards]);

  function applyFilters() {
    setAppliedDateFrom(dateFrom.trim());
    setAppliedDateTo(dateTo.trim());
  }

  function resetFilters() {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  }

  const periodLabel = query.data?.period
    ? `${query.data.period.from || 'بداية البيانات'} - ${query.data.period.to || 'حتى الآن'}`
    : '';

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader title={t('accounting.accounting_financial_summary_page.s0', "الملخص المالي")} description={t('accounting.accounting_financial_summary_page.s1', "نظرة مبسطة على المبيعات والتكلفة والمصروفات والربح خلال الفترة.")} />

        <FormSection title={t('accounting.accounting_financial_summary_page.s2', "فلاتر التقرير")}>
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>{t('accounting.accounting_financial_summary_page.s3', "من تاريخ")}</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="field stack gap-8">
            <span>{t('accounting.accounting_financial_summary_page.s4', "إلى تاريخ")}</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="button" onClick={applyFilters}>{t('accounting.accounting_financial_summary_page.s5', "تطبيق")}</button>
          <button type="button" className="button button-secondary" onClick={resetFilters}>{t('accounting.accounting_financial_summary_page.s6', "إعادة ضبط")}</button>
          {periodLabel ? <span className="muted">{t('accounting.accounting_financial_summary_page.s7', "الفترة:")} {periodLabel}</span> : null}
        </div>
        </FormSection>

        <FormSection title={t('accounting.accounting_financial_summary_page.s8', "المؤشرات الرئيسية")}>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!cards}
          loadingText={t('accounting.accounting_financial_summary_page.s9', "جاري تحميل الملخص المالي...")}
          errorTitle={t('accounting.accounting_financial_summary_page.s10', "تعذر تحميل الملخص المالي")}
          emptyTitle={t('accounting.accounting_financial_summary_page.s11', "لا توجد بيانات مالية للفترة المحددة")}
        >
          {summaryItems.length ? (
            <div className="reports-workspace">
              <div className="reports-spotlight-grid compact-spotlight-grid">
                {summaryItems.map((stat) => (
                  <ReportMetricCard key={stat.key} label={stat.label as string} value={Number(stat.value) || 0} tone={['netProfit', 'cashMovement'].includes(stat.key) ? 'success' : 'primary'} />
                ))}
              </div>
            </div>
          ) : null}
        </QueryFeedback>
        </FormSection>

        <FormSection title={t('accounting.accounting_financial_summary_page.s12', "تفاصيل الإيرادات")}>
        <DataTable<FinancialSummaryBreakdownRow>
          data={breakdowns?.revenueAccounts || []}
          getRowKey={(row) => row.accountCode}
          emptyMessage={t('accounting.accounting_financial_summary_page.s13', "لا توجد حركات إيرادات في الفترة المحددة")}
          columns={[
            { id: 'code', header: t('accounting.accounting_financial_summary_page.s14', "كود الحساب"), sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: t('accounting.accounting_financial_summary_page.s15', "اسم الحساب"), sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'amount', header: t('accounting.accounting_financial_summary_page.s16', "المبلغ"), align: 'end', sortable: true, sortValue: (row) => row.amount, render: (row) => formatCurrency(Number(row.amount || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>

        <FormSection title={t('accounting.accounting_financial_summary_page.s17', "تفاصيل المصروفات")}>
        <DataTable<FinancialSummaryBreakdownRow>
          data={breakdowns?.expenseAccounts || []}
          getRowKey={(row) => row.accountCode}
          emptyMessage={t('accounting.accounting_financial_summary_page.s18', "لا توجد مصروفات في الفترة المحددة")}
          columns={[
            { id: 'code', header: t('accounting.accounting_financial_summary_page.s19', "كود الحساب"), sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: t('accounting.accounting_financial_summary_page.s20', "اسم الحساب"), sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'amount', header: t('accounting.accounting_financial_summary_page.s21', "المبلغ"), align: 'end', sortable: true, sortValue: (row) => row.amount, render: (row) => formatCurrency(Number(row.amount || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>

        <FormSection title={t('accounting.accounting_financial_summary_page.s22', "حركة النقدية المختصرة")}>
        <div className="muted" style={{ marginBottom: 8 }}>{t('accounting.accounting_financial_summary_page.s23', "صافي حركة النقدية خلال الفترة (وليس رصيدًا نهائيًا).")}</div>
        <DataTable<FinancialSummaryBreakdownRow>
          data={breakdowns?.cashMovements || []}
          getRowKey={(row) => row.accountCode}
          emptyMessage={t('accounting.accounting_financial_summary_page.s24', "لا توجد حركات نقدية في الفترة المحددة")}
          columns={[
            { id: 'code', header: t('accounting.accounting_financial_summary_page.s25', "كود الحساب"), sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: t('accounting.accounting_financial_summary_page.s26', "اسم الحساب"), sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'amount', header: t('accounting.accounting_financial_summary_page.s27', "صافي الحركة"), align: 'end', sortable: true, sortValue: (row) => row.amount, render: (row) => formatCurrency(Number(row.amount || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>
      </main>
    </div>
  );
}
