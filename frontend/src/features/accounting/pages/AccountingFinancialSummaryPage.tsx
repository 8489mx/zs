import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { formatCurrency } from '@/lib/format';

import { accountingApi, type FinancialSummaryBreakdownRow } from '@/features/accounting/api/accounting.api';

export function AccountingFinancialSummaryPage() {
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
        <PageHeader title="الملخص المالي" description="نظرة مبسطة على المبيعات والتكلفة والمصروفات والربح خلال الفترة." />

        <FormSection title="فلاتر التقرير">
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>من تاريخ</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="field stack gap-8">
            <span>إلى تاريخ</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="button" onClick={applyFilters}>تطبيق</button>
          <button type="button" className="button button-secondary" onClick={resetFilters}>إعادة ضبط</button>
          {periodLabel ? <span className="muted">الفترة: {periodLabel}</span> : null}
        </div>
        </FormSection>

        <FormSection title="المؤشرات الرئيسية">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!cards}
          loadingText="جاري تحميل الملخص المالي..."
          errorTitle="تعذر تحميل الملخص المالي"
          emptyTitle="لا توجد بيانات مالية للفترة المحددة"
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

        <FormSection title="تفاصيل الإيرادات">
        <DataTable<FinancialSummaryBreakdownRow>
          data={breakdowns?.revenueAccounts || []}
          getRowKey={(row) => row.accountCode}
          emptyMessage="لا توجد حركات إيرادات في الفترة المحددة"
          columns={[
            { id: 'code', header: 'كود الحساب', sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: 'اسم الحساب', sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'amount', header: 'المبلغ', align: 'end', sortable: true, sortValue: (row) => row.amount, render: (row) => formatCurrency(Number(row.amount || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>

        <FormSection title="تفاصيل المصروفات">
        <DataTable<FinancialSummaryBreakdownRow>
          data={breakdowns?.expenseAccounts || []}
          getRowKey={(row) => row.accountCode}
          emptyMessage="لا توجد مصروفات في الفترة المحددة"
          columns={[
            { id: 'code', header: 'كود الحساب', sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: 'اسم الحساب', sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'amount', header: 'المبلغ', align: 'end', sortable: true, sortValue: (row) => row.amount, render: (row) => formatCurrency(Number(row.amount || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>

        <FormSection title="حركة النقدية المختصرة">
        <div className="muted" style={{ marginBottom: 8 }}>صافي حركة النقدية خلال الفترة (وليس رصيدًا نهائيًا).</div>
        <DataTable<FinancialSummaryBreakdownRow>
          data={breakdowns?.cashMovements || []}
          getRowKey={(row) => row.accountCode}
          emptyMessage="لا توجد حركات نقدية في الفترة المحددة"
          columns={[
            { id: 'code', header: 'كود الحساب', sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: 'اسم الحساب', sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'amount', header: 'صافي الحركة', align: 'end', sortable: true, sortValue: (row) => row.amount, render: (row) => formatCurrency(Number(row.amount || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>
      </main>
    </div>
  );
}
