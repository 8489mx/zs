import type { CSSProperties } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { AnimatedValue } from '@/shared/components/animated-value';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function OverviewReportSection({ report, reportQuery, executiveRows, operatingSignalRows, formatPercent }: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'executiveRows' | 'operatingSignalRows' | 'formatPercent'>) {
  const executiveSalesValue = Math.max(0, Number(report?.sales.netSales || 0));
  const executivePurchasesValue = Math.max(0, Number(report?.purchases.netPurchases || 0));
  const executiveProfitValue = Math.max(0, Number(report?.commercial.grossProfit || 0));
  const executiveFlowTotal = executiveSalesValue + executivePurchasesValue + executiveProfitValue;
  const executiveSalesShare = executiveFlowTotal > 0 ? Math.round((executiveSalesValue / executiveFlowTotal) * 100) : 0;
  const executivePurchasesShare = executiveFlowTotal > 0 ? Math.round((executivePurchasesValue / executiveFlowTotal) * 100) : 0;
  const executiveProfitShare = executiveFlowTotal > 0 ? Math.max(0, 100 - executiveSalesShare - executivePurchasesShare) : 0;
  const executiveRingStyle = {
    '--reports-sales-share': `${executiveSalesShare}%`,
    '--reports-purchases-share': `${Math.min(100, executiveSalesShare + executivePurchasesShare)}%`,
  } as CSSProperties;
  const premiumSalesTotal = Number(report?.sales.total || 0);
  const premiumNetSales = Number(report?.sales.netSales || 0);
  const premiumGrossProfit = Number(report?.commercial.grossProfit || 0);
  const premiumTreasuryNet = Number(report?.treasury.net || 0);
  const premiumStatMax = Math.max(1, Math.abs(premiumSalesTotal), Math.abs(premiumNetSales), Math.abs(premiumGrossProfit), Math.abs(premiumTreasuryNet));
  const premiumStats = [
    { label: 'إجمالي البيع', value: premiumSalesTotal, helper: 'كل البيع المسجل', tone: 'primary', progress: Math.round((Math.abs(premiumSalesTotal) / premiumStatMax) * 100) },
    { label: 'صافي البيع', value: premiumNetSales, helper: 'بعد الخصومات', tone: 'success', progress: Math.round((Math.abs(premiumNetSales) / premiumStatMax) * 100) },
    { label: 'الربح الإجمالي', value: premiumGrossProfit, helper: 'قبل المصروفات', tone: 'profit', progress: Math.round((Math.abs(premiumGrossProfit) / premiumStatMax) * 100) },
    { label: 'صافي الخزينة', value: premiumTreasuryNet, helper: 'داخل وخارج الخزينة', tone: 'treasury', progress: Math.round((Math.abs(premiumTreasuryNet) / premiumStatMax) * 100) },
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
                  <strong>{formatPercent(Number(report?.commercial.grossMarginPercent || 0))}</strong>
                </div>
              </div>
              <div className="reports-ring-legend">
                <div className="reports-ring-legend-row">
                  <span><i className="reports-ring-dot dot-sales" /> صافي البيع</span>
                  <strong>{executiveSalesShare}%</strong>
                </div>
                <div className="reports-ring-legend-row">
                  <span><i className="reports-ring-dot dot-purchases" /> صافي الشراء</span>
                  <strong>{executivePurchasesShare}%</strong>
                </div>
                <div className="reports-ring-legend-row">
                  <span><i className="reports-ring-dot dot-profit" /> الربح الإجمالي</span>
                  <strong>{executiveProfitShare}%</strong>
                </div>
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
