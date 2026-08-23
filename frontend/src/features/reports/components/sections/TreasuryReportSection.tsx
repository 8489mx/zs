import { QueryCard } from '@/shared/components/query-card';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';
import { relativePercent } from '@/features/reports/lib/reports-format';

export function TreasuryReportSection({
  report,
  reportQuery,
  accountingFinancialSummary,
  accountingCashMovement,
  operatingSignalRows,
  formatPercent
}: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'accountingFinancialSummary' | 'accountingCashMovement' | 'operatingSignalRows' | 'formatPercent'>) {
  const financial = accountingFinancialSummary?.cards;
  const cash = accountingCashMovement?.totals;
  const cashIn = report?.treasury.cashIn ?? cash?.totalIn ?? 0;
  const cashOut = report?.treasury.cashOut ?? cash?.totalOut ?? 0;
  const netCash = report?.treasury.net ?? cash?.netMovement ?? financial?.netCashMovement ?? 0;
  const grossProfit = report?.commercial.grossProfit ?? financial?.grossProfit ?? 0;
  const expenses = report?.expenses.total ?? financial?.operatingExpenses ?? 0;
  const netProfit = report?.commercial.netOperatingProfit ?? financial?.netProfit ?? 0;
  const grossMarginPercent = report?.commercial.grossMarginPercent ?? (financial?.netSales ? (grossProfit / Math.max(1, financial.netSales)) * 100 : 0);
  const values = [cashIn, cashOut, netCash, grossProfit, expenses, netProfit];

  return (
    <QueryCard
      title="الخزنة والربحية"
      description="قراءة مركزة لحركة النقدية والبنك وصافي الربح في تبويب مستقل."
      actions={<span className="nav-pill">الخزنة والربحية</span>}
      isLoading={reportQuery.isLoading}
      isError={reportQuery.isError}
      error={reportQuery.error}
      isEmpty={!report}
      loadingText="جاري تحميل مؤشرات الربحية والخزنة..."
      emptyTitle="لا توجد بيانات كافية لهذا التبويب"
      emptyHint="راجع الفترة أو أضف حركات نقدية وبيع وشراء."
    >
      <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
        <ReportMetricCard label="إجمالي الداخل" value={cashIn} helper="داخل النقدية والبنك" tone="success" formatter={formatCurrency} progress={relativePercent(cashIn, values)} />
        <ReportMetricCard label="إجمالي الخارج" value={cashOut} helper="خارج النقدية والبنك" tone="danger" formatter={formatCurrency} progress={relativePercent(cashOut, values)} />
        <ReportMetricCard label="صافي حركة النقدية" value={netCash} helper="خلال الفترة وليس رصيدًا نهائيًا" tone={netCash >= 0 ? 'success' : 'danger'} formatter={formatCurrency} progress={relativePercent(netCash, values)} />
        <ReportMetricCard label="مجمل الربح" value={grossProfit} helper="بعد تكلفة البضاعة" tone="success" formatter={formatCurrency} progress={relativePercent(grossProfit, values)} />
        <ReportMetricCard label="المصروفات" value={expenses} helper="مصروفات تشغيلية" tone="warning" formatter={formatCurrency} progress={relativePercent(expenses, values)} />
        <ReportMetricCard label="صافي الربح" value={netProfit} helper={`هامش الربح: ${formatPercent(grossMarginPercent)}`} tone={netProfit >= 0 ? 'success' : 'danger'} formatter={formatCurrency} progress={relativePercent(netProfit, values)} />
      </div>
      <div className="metric-list reports-metric-list">
        {report?.delivery ? (
          <div className="metric-row" key="delivery-fees">
            <span>رسوم التوصيل ({report.delivery.mode === 'store_fleet' ? 'أسطول المتجر - إيراد' : 'مناديب حرة - مستحق للمندوب'})</span>
            <strong>{formatCurrency(report.delivery.total)} ({report.delivery.count} طلب)</strong>
          </div>
        ) : null}
        {operatingSignalRows.map((row) => (
          <div className="metric-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </QueryCard>
  );
}
