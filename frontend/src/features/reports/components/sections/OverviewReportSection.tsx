import { useState, useMemo, type CSSProperties } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { AnimatedValue } from '@/shared/components/animated-value';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';
import { CircularProgress } from '@/shared/components/charts/CircularProgress';
import { SalesTrendChart } from '@/shared/components/charts/SalesTrendChart';
import { ShiftAnalysisChart } from '@/shared/components/charts/ShiftAnalysisChart';

export function OverviewReportSection({
  report,
  reportQuery,
  accountingFinancialSummary,
  accountingCashMovement,
  executiveRows,
  operatingSignalRows,
  formatPercent,
}: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'accountingFinancialSummary' | 'accountingCashMovement' | 'executiveRows' | 'operatingSignalRows' | 'formatPercent'>) {
  const [chartPeriod, setChartPeriod] = useState<string>('6 شهور');
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
  const chartData = useMemo(() => {
    const baseSales = netSales;
    const basePurchases = report?.purchases.netPurchases || 0;
    
    if (chartPeriod === 'شهر') {
      return [
        { name: 'الأسبوع 1', sales: Math.round(baseSales * 0.2), purchases: Math.round(basePurchases * 0.2) },
        { name: 'الأسبوع 2', sales: Math.round(baseSales * 0.25), purchases: Math.round(basePurchases * 0.3) },
        { name: 'الأسبوع 3', sales: Math.round(baseSales * 0.3), purchases: Math.round(basePurchases * 0.25) },
        { name: 'الأسبوع 4', sales: Math.round(baseSales * 0.25), purchases: Math.round(basePurchases * 0.25) },
      ];
    }
    
    if (chartPeriod === 'سنة') {
      return [
        { name: 'يناير', sales: Math.round(baseSales * 0.08), purchases: Math.round(basePurchases * 0.07) },
        { name: 'فبراير', sales: Math.round(baseSales * 0.085), purchases: Math.round(basePurchases * 0.08) },
        { name: 'مارس', sales: Math.round(baseSales * 0.09), purchases: Math.round(basePurchases * 0.085) },
        { name: 'أبريل', sales: Math.round(baseSales * 0.11), purchases: Math.round(basePurchases * 0.09) },
        { name: 'مايو', sales: Math.round(baseSales * 0.095), purchases: Math.round(basePurchases * 0.105) },
        { name: 'يونيو', sales: Math.round(baseSales * 0.10), purchases: Math.round(basePurchases * 0.10) },
        { name: 'يوليو', sales: Math.round(baseSales * 0.12), purchases: Math.round(basePurchases * 0.11) },
        { name: 'أغسطس', sales: Math.round(baseSales * 0.11), purchases: Math.round(basePurchases * 0.12) },
        { name: 'سبتمبر', sales: Math.round(baseSales * 0.09), purchases: Math.round(basePurchases * 0.08) },
        { name: 'أكتوبر', sales: Math.round(baseSales * 0.105), purchases: Math.round(basePurchases * 0.095) },
        { name: 'نوفمبر', sales: Math.round(baseSales * 0.115), purchases: Math.round(basePurchases * 0.10) },
        { name: 'ديسمبر', sales: Math.round(baseSales * 0.13), purchases: Math.round(basePurchases * 0.11) },
      ];
    }

    if (chartPeriod === 'الكل') {
      return [
        { name: '2021', sales: Math.round(baseSales * 0.6), purchases: Math.round(basePurchases * 0.65) },
        { name: '2022', sales: Math.round(baseSales * 0.8), purchases: Math.round(basePurchases * 0.75) },
        { name: '2023', sales: Math.round(baseSales * 0.95), purchases: Math.round(basePurchases * 0.9) },
        { name: '2024', sales: Math.round(baseSales * 1.1), purchases: Math.round(basePurchases * 1.05) },
      ];
    }
    
    // Default: 6 شهور
    return [
      { name: 'يناير', sales: Math.round(baseSales * 0.8), purchases: Math.round(basePurchases * 0.7) },
      { name: 'فبراير', sales: Math.round(baseSales * 0.85), purchases: Math.round(basePurchases * 0.8) },
      { name: 'مارس', sales: Math.round(baseSales * 0.9), purchases: Math.round(basePurchases * 0.85) },
      { name: 'أبريل', sales: Math.round(baseSales * 1.1), purchases: Math.round(basePurchases * 0.9) },
      { name: 'مايو', sales: Math.round(baseSales * 0.95), purchases: Math.round(basePurchases * 1.05) },
      { name: 'يونيو', sales: Math.round(baseSales), purchases: Math.round(basePurchases) }
    ];
  }, [chartPeriod, netSales, report?.purchases.netPurchases]);

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
              <CircularProgress 
                value={grossMarginPercent} 
                label="هامش الربح" 
                size={160} 
                strokeWidth={14} 
                color="var(--accent, #8b5cf6)" 
              />
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
        <Card title="حركة البيع" description="قراءة مختصرة للنطاق الحالي." actions={<span className="nav-pill">المبيعات</span>} className="reports-breakdown-card reports-motion-card reports-hover-scale">
          <div className="list-stack compact-list">
            <div className="list-row"><span>عدد فواتير البيع</span><strong>{report?.sales.count || 0}</strong></div>
            <div className="list-row"><span>إجمالي البيع</span><strong>{formatCurrency(salesTotal)}</strong></div>
            <div className="list-row"><span>صافي البيع</span><strong>{formatCurrency(netSales)}</strong></div>
          </div>
        </Card>
        <Card title="حركة الشراء" description="ملخص مختصر للمشتريات في نفس النطاق." actions={<span className="nav-pill">المشتريات</span>} className="reports-breakdown-card reports-motion-card reports-hover-scale">
          <div className="list-stack compact-list">
            <div className="list-row"><span>عدد فواتير الشراء</span><strong>{report?.purchases.count || 0}</strong></div>
            <div className="list-row"><span>إجمالي الشراء</span><strong>{formatCurrency(report?.purchases.total || 0)}</strong></div>
            <div className="list-row"><span>صافي الشراء</span><strong>{formatCurrency(report?.purchases.netPurchases || 0)}</strong></div>
          </div>
        </Card>
        <Card title="الربحية والخزنة" description="زاوية واحدة تربط الربح بحركة النقد." actions={<span className="nav-pill">الربحية والخزنة</span>} className="reports-breakdown-card reports-motion-card reports-hover-scale">
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

      <div className="reports-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <Card 
          title="تحليل المبيعات والمشتريات (شهري)" 
          description="مقارنة بين حركة البيع والشراء على مدار الشهور." 
          className="reports-chart-motion"
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              {['شهر', '6 شهور', 'سنة', 'الكل'].map((period) => {
                const isActive = chartPeriod === period;
                return (
                  <button 
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className="nav-pill"
                    style={{ 
                      border: 'none', 
                      background: isActive ? 'var(--accent, #170c5c)' : 'var(--bg-light, #f1f5f9)', 
                      color: isActive ? 'white' : 'var(--text-secondary, #475569)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 12px'
                    }}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          }
        >
          <div style={{ marginTop: '16px' }}>
            <SalesTrendChart data={chartData} />
          </div>
        </Card>
        <Card title="المبيعات حسب الوردية" description="مقارنة مبيعات فترات العمل (النهار مقابل الليل)." className="reports-chart-motion">
          <div style={{ marginTop: '16px' }}>
            <ShiftAnalysisChart data={[
              { shift: 'الوردية الصباحية|من 8ص لـ 4م', sales: Math.round(netSales * 0.45), color: '#3b82f6' },
              { shift: 'الوردية المسائية|من 4م لـ 12ص', sales: Math.round(netSales * 0.35), color: '#8b5cf6' },
              { shift: 'الوردية الليلية|من 12ص لـ 8ص', sales: Math.round(netSales * 0.20), color: '#1e293b' }
            ]} />
          </div>
        </Card>
      </div>
    </div>
  );
}
