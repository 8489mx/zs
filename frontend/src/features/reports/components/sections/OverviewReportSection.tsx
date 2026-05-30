import type { CSSProperties } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { AnimatedValue } from '@/shared/components/animated-value';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function OverviewReportSection({
  report,
  reportQuery,
  accountingFinancialSummary,
  accountingCashMovement,
  executiveRows,
  operatingSignalRows,
  formatPercent,
}: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'accountingFinancialSummary' | 'accountingCashMovement' | 'executiveRows' | 'operatingSignalRows' | 'formatPercent'>) {
  const financial = accountingFinancialSummary?.cards;
  const cash = accountingCashMovement?.totals;
  const salesTotal = financial?.grossSales ?? report?.sales.total ?? 0;
  const netSales = financial?.netSales ?? report?.sales.netSales ?? 0;
  const grossProfit = financial?.grossProfit ?? report?.commercial.grossProfit ?? 0;
  const netCashMovement = cash?.netMovement ?? financial?.netCashMovement ?? report?.treasury.net ?? 0;
  const grossMarginPercent = financial?.netSales ? (grossProfit / Math.max(1, financial.netSales)) * 100 : report?.commercial.grossMarginPercent || 0;
  const statMax = Math.max(1, Math.abs(salesTotal), Math.abs(netSales), Math.abs(grossProfit), Math.abs(netCashMovement));
  const premiumStats = [
    { label: 'إجمالي البيع', value: salesTotal, helper: 'كل البيع المسجل', tone: 'primary', progress: Math.round((Math.abs(salesTotal) / statMax) * 100) },
    { label: 'صافي البيع', value: netSales, helper: 'بعد المرتجعات والخصومات', tone: 'success', progress: Math.round((Math.abs(netSales) / statMax) * 100) },
    { label: 'مجمل الربح', value: grossProfit, helper: 'بعد تكلفة البضاعة', tone: 'profit', progress: Math.round((Math.abs(grossProfit) / statMax) * 100) },
    { label: 'صافي حركة النقدية', value: netCashMovement, helper: 'داخل وخارج خلال الفترة', tone: 'treasury', progress: Math.round((Math.abs(netCashMovement) / statMax) * 100) },
  ];
  const flowTotal = Math.max(1, Math.abs(netSales) + Math.abs(report?.purchases.netPurchases || 0) + Math.abs(grossProfit));
  const salesShare = Math.round((Math.abs(netSales) / flowTotal) * 100);
  const purchasesShare = Math.round((Math.abs(report?.purchases.netPurchases || 0) / flowTotal) * 100);
  const profitShare = Math.max(0, 100 - salesShare - purchasesShare);
  const executiveRingStyle = {
    '--reports-sales-share': `${salesShare}%`,
    '--reports-purchases-share': `${Math.min(100, salesShare + purchasesShare)}%`,
  } as CSSProperties;

  return (
    <div className="page-stack">
      <QueryCard
        title="الملخص التنفيذي"
        description="أهم أرقام الإدارة في بطاقة واحدة: المبيعات، الربحية، والمصروفات وحركة النقدية خلال الفترة."
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
        <div className="reports-premium-summary-strip" aria-label="أهم أرقام الفترة">
          {premiumStats.map((stat) => (
            <div className={`reports-premium-stat reports-premium-stat-${stat.tone}`} key={stat.label}>
              <span>{stat.label}</span>
              <strong><AnimatedValue value={stat.value} formatter={formatCurrency} /></strong>
              <small>{stat.helper}</small>
              <span className="reports-premium-stat-rail" style={{ '--reports-stat-progress': `${stat.progress}%` } as CSSProperties} aria-hidden="true">
                <i />
              </span>
            </div>
          ))}
        </div>

        <div className="reports-executive-layout enhanced-executive-layout reports-executive-wide-layout">
          <aside className="reports-executive-insight-card reports-executive-wide-card" aria-label="ملخص بصري للتقرير">
            <div className="reports-executive-insight-copy">
              <span className="reports-kicker">نبض الفترة</span>
              <strong>قراءة سريعة لحركة البيع والشراء والربح</strong>
            </div>
            <div className="reports-orb-cluster">
              <div className="reports-balance-orb" style={executiveRingStyle} aria-hidden="true">
                <div className="reports-balance-orb-core">
                  <span>هامش الربح</span>
                  <strong>{formatPercent(grossMarginPercent)}</strong>
                </div>
              </div>
              <div className="reports-ring-legend">
                <div className="reports-ring-legend-row"><span><i className="reports-ring-dot dot-sales" /> صافي البيع</span><strong>{salesShare}%</strong></div>
                <div className="reports-ring-legend-row"><span><i className="reports-ring-dot dot-purchases" /> صافي الشراء</span><strong>{purchasesShare}%</strong></div>
                <div className="reports-ring-legend-row"><span><i className="reports-ring-dot dot-profit" /> مجمل الربح</span><strong>{profitShare}%</strong></div>
              </div>
            </div>
            <div className="metric-list reports-metric-list reports-executive-list">
              {executiveRows.map(([metric, value]) => (
                <div className="metric-row" key={metric}>
                  <span>{metric}</span>
                  <strong>{metric === 'هامش الربح %' ? formatPercent(Number(value || 0)) : formatCurrency(Number(value || 0))}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </QueryCard>

      <div className="three-column-grid reports-unified-grid">
        <Card title="حركة البيع" description="قراءة مختصرة للنطاق الحالي." actions={<span className="nav-pill">المبيعات</span>} className="reports-breakdown-card reports-motion-card">
          <div className="list-stack compact-list">
            <div className="list-row"><span>عدد فواتير البيع</span><strong>{report?.sales.count || 0}</strong></div>
            <div className="list-row"><span>إجمالي البيع</span><strong>{formatCurrency(salesTotal)}</strong></div>
            <div className="list-row"><span>صافي البيع</span><strong>{formatCurrency(netSales)}</strong></div>
          </div>
        </Card>
        <Card title="حركة الشراء" description="ملخص مختصر للمشتريات في نفس النطاق." actions={<span className="nav-pill">المشتريات</span>} className="reports-breakdown-card reports-motion-card">
          <div className="list-stack compact-list">
            <div className="list-row"><span>عدد فواتير الشراء</span><strong>{report?.purchases.count || 0}</strong></div>
            <div className="list-row"><span>إجمالي الشراء</span><strong>{formatCurrency(report?.purchases.total || 0)}</strong></div>
            <div className="list-row"><span>صافي الشراء</span><strong>{formatCurrency(report?.purchases.netPurchases || 0)}</strong></div>
          </div>
        </Card>
        <Card title="الربحية والخزنة" description="زاوية واحدة تربط الربح بحركة النقد." actions={<span className="nav-pill">الربحية والخزنة</span>} className="reports-breakdown-card reports-motion-card">
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
