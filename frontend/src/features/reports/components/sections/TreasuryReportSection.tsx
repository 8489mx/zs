import { QueryCard } from '@/components/shared/QueryCard';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';
import { relativePercent } from '@/features/reports/lib/reports-format';

export function TreasuryReportSection({ report, reportQuery, operatingSignalRows, formatPercent }: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'operatingSignalRows' | 'formatPercent'>) {
  const values = [report?.treasury.cashIn || 0, report?.treasury.cashOut || 0, report?.treasury.net || 0, report?.commercial.grossMarginPercent || 0];

  return (
    <QueryCard
      title="الخزينة والربحية"
      description="قراءة مركزة لحركة النقد وصافي الربح التشغيلي في تبويب مستقل."
      actions={<span className="nav-pill">الخزينة والربحية</span>}
      isLoading={reportQuery.isLoading}
      isError={reportQuery.isError}
      error={reportQuery.error}
      isEmpty={!report}
      loadingText="جاري تحميل مؤشرات الربحية والخزينة..."
      emptyTitle="لا توجد بيانات كافية لهذا التبويب"
      emptyHint="راجع الفترة أو أضف حركات نقدية وبيع وشراء."
    >
      <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
        <ReportMetricCard label="داخل الخزينة" value={report?.treasury.cashIn || 0} helper="حركات موجبة" tone="success" formatter={formatCurrency} progress={relativePercent(report?.treasury.cashIn || 0, values)} />
        <ReportMetricCard label="خارج الخزينة" value={report?.treasury.cashOut || 0} helper="حركات سالبة" tone="danger" formatter={formatCurrency} progress={relativePercent(report?.treasury.cashOut || 0, values)} />
        <ReportMetricCard label="صافي الخزينة" value={report?.treasury.net || 0} helper="المحصلة النهائية" tone={(report?.treasury.net || 0) >= 0 ? 'success' : 'danger'} formatter={formatCurrency} progress={relativePercent(report?.treasury.net || 0, values)} />
        <ReportMetricCard label="هامش الربح" value={report?.commercial.grossMarginPercent || 0} helper="نسبة مباشرة" tone="warning" formatter={(value) => formatPercent(value)} decimals={2} progress={Math.max(10, Math.min(100, Math.round(report?.commercial.grossMarginPercent || 0)))} />
      </div>
      <div className="metric-list reports-metric-list">
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
