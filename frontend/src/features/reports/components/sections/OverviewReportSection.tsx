import { QueryCard } from '@/components/shared/QueryCard';
import { Card } from '@/components/ui/Card';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function OverviewReportSection({ report, reportQuery, executiveRows, operatingSignalRows, formatPercent }: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'executiveRows' | 'operatingSignalRows' | 'formatPercent'>) {
  const overviewValues = [
    report?.sales.total || 0,
    report?.sales.netSales || 0,
    report?.purchases.total || 0,
    report?.purchases.netPurchases || 0,
    report?.commercial.grossProfit || 0,
    report?.commercial.netOperatingProfit || 0,
  ];

  return (
    <div className="page-stack">
      <QueryCard
        title="الملخص التنفيذي"
        description="أهم أرقام الإدارة في Card واحدة: ما دخل من بيع، ما خرج في الشراء والمصروفات، وتأثير ذلك على الخزينة والربحية."
        actions={<span className="nav-pill">الملخص التنفيذي</span>}
        className="reports-executive-card"
        isLoading={reportQuery.isLoading}
        isError={reportQuery.isError}
        error={reportQuery.error}
        isEmpty={!report}
        loadingText="جاري تحميل التقرير..."
        emptyTitle="لا توجد بيانات للفترة الحالية"
        emptyHint="جرّب تغيير الفترة أو إضافة عمليات جديدة."
      >
        <div className="reports-executive-layout enhanced-executive-layout">
          <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
            <ReportMetricCard label="إجمالي البيع" value={report?.sales.total || 0} helper="كل البيع المسجل" tone="primary" formatter={formatCurrency} progress={relativePercent(report?.sales.total || 0, overviewValues)} />
            <ReportMetricCard label="صافي البيع" value={report?.sales.netSales || 0} helper="بعد الخصومات" tone="success" formatter={formatCurrency} progress={relativePercent(report?.sales.netSales || 0, overviewValues)} />
            <ReportMetricCard label="إجمالي الشراء" value={report?.purchases.total || 0} helper="كل المشتريات" tone="warning" formatter={formatCurrency} progress={relativePercent(report?.purchases.total || 0, overviewValues)} />
            <ReportMetricCard label="صافي الشراء" value={report?.purchases.netPurchases || 0} helper="بعد التسويات" tone="warning" formatter={formatCurrency} progress={relativePercent(report?.purchases.netPurchases || 0, overviewValues)} />
            <ReportMetricCard label="الربح الإجمالي" value={report?.commercial.grossProfit || 0} helper="قبل المصروفات" tone="success" formatter={formatCurrency} progress={relativePercent(report?.commercial.grossProfit || 0, overviewValues)} />
            <ReportMetricCard label="الربح التشغيلي" value={report?.commercial.netOperatingProfit || 0} helper="بعد المصروفات" tone="danger" formatter={formatCurrency} progress={relativePercent(report?.commercial.netOperatingProfit || 0, overviewValues)} />
          </div>
          <div className="metric-list reports-metric-list">
            {executiveRows.map(([metric, value]) => (
              <div className="metric-row" key={metric}>
                <span>{metric}</span>
                <strong>{metric === 'هامش الربح %' ? formatPercent(Number(value || 0)) : formatCurrency(Number(value || 0))}</strong>
              </div>
            ))}
          </div>
        </div>
      </QueryCard>

      <div className="three-column-grid reports-unified-grid">
        <Card title="حركة البيع" description="قراءة مختصرة للنطاق الحالي." actions={<span className="nav-pill">المبيعات</span>} className="reports-breakdown-card reports-motion-card">
          <div className="list-stack compact-list">
            <div className="list-row"><span>عدد فواتير البيع</span><strong>{report?.sales.count || 0}</strong></div>
            <div className="list-row"><span>إجمالي البيع</span><strong>{formatCurrency(report?.sales.total || 0)}</strong></div>
            <div className="list-row"><span>صافي البيع</span><strong>{formatCurrency(report?.sales.netSales || 0)}</strong></div>
          </div>
        </Card>
        <Card title="حركة الشراء" description="ملخص مختصر للمشتريات في نفس النطاق." actions={<span className="nav-pill">المشتريات</span>} className="reports-breakdown-card reports-motion-card">
          <div className="list-stack compact-list">
            <div className="list-row"><span>عدد فواتير الشراء</span><strong>{report?.purchases.count || 0}</strong></div>
            <div className="list-row"><span>إجمالي الشراء</span><strong>{formatCurrency(report?.purchases.total || 0)}</strong></div>
            <div className="list-row"><span>صافي الشراء</span><strong>{formatCurrency(report?.purchases.netPurchases || 0)}</strong></div>
          </div>
        </Card>
        <Card title="الربحية والخزينة" description="زاوية واحدة تربط الربح بحركة النقد." actions={<span className="nav-pill">الربحية والخزينة</span>} className="reports-breakdown-card reports-motion-card">
          <div className="metric-list">
            {operatingSignalRows.map((row) => (
              <div className="metric-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
