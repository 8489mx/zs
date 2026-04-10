import { QueryCard } from '@/shared/components/query-card';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function PurchasesReportSection({ report, reportQuery }: Pick<ReportsSectionContentProps, 'report' | 'reportQuery'>) {
  const values = [
    report?.purchases.total || 0,
    report?.purchases.netPurchases || 0,
    report?.expenses.total || 0,
    report?.treasury.cashIn || 0,
    report?.treasury.net || 0,
  ];

  return (
    <div className="page-stack">
      <QueryCard
        title="مؤشرات الشراء"
        description="فصل ملخص الشراء في تبويب مستقل يسهّل على الإدارة والمخزن مراجعة الوضع الشرائي بدون ازدحام."
        actions={<span className="nav-pill">المشتريات</span>}
        isLoading={reportQuery.isLoading}
        isError={reportQuery.isError}
        error={reportQuery.error}
        isEmpty={!report}
        loadingText="جاري تحميل بيانات الشراء..."
        emptyTitle="لا توجد بيانات شراء للفترة الحالية"
        emptyHint="غيّر النطاق أو راجع المشتريات المسجلة."
      >
        <div className="reports-spotlight-grid section-spotlight-grid">
          <ReportMetricCard label="عدد الفواتير" value={report?.purchases.count || 0} helper="إجمالي أوامر الشراء" tone="primary" progress={relativePercent(report?.purchases.count || 0, [report?.purchases.count || 0, 1])} />
          <ReportMetricCard label="إجمالي الشراء" value={report?.purchases.total || 0} helper="قبل التسويات" tone="warning" formatter={formatCurrency} progress={relativePercent(report?.purchases.total || 0, values)} />
          <ReportMetricCard label="صافي الشراء" value={report?.purchases.netPurchases || 0} helper="بعد الخصومات" tone="warning" formatter={formatCurrency} progress={relativePercent(report?.purchases.netPurchases || 0, values)} />
          <ReportMetricCard label="المصروفات" value={report?.expenses.total || 0} helper="مرتبطة بالنطاق الحالي" tone="danger" formatter={formatCurrency} progress={relativePercent(report?.expenses.total || 0, values)} />
          <ReportMetricCard label="داخل الخزينة" value={report?.treasury.cashIn || 0} helper="تأثير الشراء على النقد" tone="success" formatter={formatCurrency} progress={relativePercent(report?.treasury.cashIn || 0, values)} />
          <ReportMetricCard label="صافي الخزينة" value={report?.treasury.net || 0} helper="المحصلة النهائية" tone={(report?.treasury.net || 0) >= 0 ? 'success' : 'danger'} formatter={formatCurrency} progress={relativePercent(report?.treasury.net || 0, values)} />
        </div>
      </QueryCard>
    </div>
  );
}
