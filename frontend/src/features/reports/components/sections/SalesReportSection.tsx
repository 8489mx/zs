import { QueryCard } from '@/shared/components/query-card';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function SalesReportSection({
  report,
  reportQuery,
  accountingFinancialSummary,
  salesDailyAverage,
  purchaseDailyAverage,
  returnRatePercent,
  rangeDays,
  topProducts,
  exportTopProducts,
  printTopProducts,
  formatPercent
}: Pick<ReportsSectionContentProps, 'report' | 'reportQuery' | 'accountingFinancialSummary' | 'salesDailyAverage' | 'purchaseDailyAverage' | 'returnRatePercent' | 'rangeDays' | 'topProducts' | 'exportTopProducts' | 'printTopProducts' | 'formatPercent'>) {
  const financial = accountingFinancialSummary?.cards;
  const salesTotal = financial?.grossSales ?? report?.sales.total ?? 0;
  const netSales = financial?.netSales ?? report?.sales.netSales ?? 0;
  const returnsAndDiscounts = financial ? financial.salesReturns + financial.salesDiscounts : report?.returns.total || 0;
  const cogs = financial?.cogs ?? report?.commercial.cogs ?? 0;
  const grossProfit = financial?.grossProfit ?? report?.commercial.grossProfit ?? 0;
  const netProfit = financial?.netProfit ?? report?.commercial.netOperatingProfit ?? 0;
  const values = [salesTotal, netSales, returnsAndDiscounts, cogs, grossProfit, netProfit];

  return (
    <div className="page-stack">
      <QueryCard
        title="مؤشرات البيع"
        description="تركيز مباشر على أرقام المبيعات ضمن النطاق الحالي مع الاحتفاظ بتفاصيل التشغيل مثل عدد الفواتير وأعلى الأصناف."
        actions={<span className="nav-pill">المبيعات</span>}
        isLoading={reportQuery.isLoading}
        isError={reportQuery.isError}
        error={reportQuery.error}
        isEmpty={!report}
        loadingText="جاري تحميل بيانات البيع..."
        emptyTitle="لا توجد بيانات بيع للفترة الحالية"
        emptyHint="غيّر النطاق أو أضف مبيعات جديدة."
      >
        <div className="reports-spotlight-grid section-spotlight-grid">
          <ReportMetricCard label="عدد الفواتير" value={report?.sales.count || 0} helper="إجمالي البيع المسجل" tone="primary" progress={relativePercent(report?.sales.count || 0, [report?.sales.count || 0, 1])} />
          <ReportMetricCard label="إجمالي البيع" value={salesTotal} helper="قبل المرتجعات والخصومات" tone="primary" formatter={formatCurrency} progress={relativePercent(salesTotal, values)} />
          <ReportMetricCard label="صافي البيع" value={netSales} helper="أفضل رقم للمتابعة اليومية" tone="success" formatter={formatCurrency} progress={relativePercent(netSales, values)} />
          <ReportMetricCard label="مردودات وخصومات" value={returnsAndDiscounts} helper="الأثر على البيع" tone="danger" formatter={formatCurrency} progress={relativePercent(returnsAndDiscounts, values)} />
          <ReportMetricCard label="تكلفة البضاعة" value={cogs} helper="تكلفة البضاعة المباعة" tone="warning" formatter={formatCurrency} progress={relativePercent(cogs, values)} />
          <ReportMetricCard label="مجمل الربح" value={grossProfit} helper="بعد تكلفة البضاعة" tone="success" formatter={formatCurrency} progress={relativePercent(grossProfit, values)} />
        </div>
        <div className="two-column-grid" style={{ marginTop: 16 }}>
          <Card title="قراءة يومية سريعة" description="أرقام مختصرة لصاحب النشاط بدون فتح جداول إضافية.">
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">متوسط البيع اليومي</div><div className="detail-value">{formatCurrency(salesDailyAverage)}</div></div>
              <div className="detail-item"><div className="detail-label">متوسط الشراء اليومي</div><div className="detail-value">{formatCurrency(purchaseDailyAverage)}</div></div>
              <div className="detail-item"><div className="detail-label">معدل المرتجعات</div><div className="detail-value">{formatPercent(returnRatePercent)}</div></div>
              <div className="detail-item"><div className="detail-label">الأيام المغطاة</div><div className="detail-value">{rangeDays} يوم</div></div>
              <div className="detail-item"><div className="detail-label">صافي الربح</div><div className="detail-value">{formatCurrency(netProfit)}</div></div>
            </div>
          </Card>
          <Card title="أعلى الأصناف" description="أفضل الأصناف مبيعًا داخل النطاق الحالي مع طباعة وتصدير مباشر." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void exportTopProducts()} disabled={!topProducts.length}>تصدير CSV</Button><Button variant="secondary" onClick={() => void printTopProducts()} disabled={!topProducts.length}>طباعة</Button></div>}>
            <DataTable
              ariaLabel="أعلى الأصناف"
              columns={[
                { key: 'name', header: 'الصنف', cell: (row) => row.name },
                { key: 'qty', header: 'الكمية', cell: (row) => row.qty },
                { key: 'revenue', header: 'الإيراد', cell: (row) => formatCurrency(row.revenue || 0) },
              ]}
              rows={topProducts.slice(0, 8)}
              empty={<div className="muted small">لا توجد أصناف مباعة في هذا النطاق.</div>}
            />
          </Card>
        </div>
      </QueryCard>
    </div>
  );
}
