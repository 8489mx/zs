import { QueryCard } from '@/components/shared/QueryCard';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function BalancesReportSection({
  balancesQuery,
  exportCustomerBalances,
  printCustomerBalances,
  balancesSearch,
  onBalancesSearchChange,
  balancesFilter,
  onBalancesFilterChange,
  onBalancesPageChange,
  onBalancesPageSizeChange
}: Pick<ReportsSectionContentProps, 'balancesQuery' | 'exportCustomerBalances' | 'printCustomerBalances' | 'balancesSearch' | 'onBalancesSearchChange' | 'balancesFilter' | 'onBalancesFilterChange' | 'onBalancesPageChange' | 'onBalancesPageSizeChange'>) {
  const rows = balancesQuery.data?.rows || [];
  const pagination = balancesQuery.data?.pagination;
  const summary = balancesQuery.data?.summary;
  const values = [summary?.totalItems || 0, summary?.totalBalance || 0, summary?.overLimit || 0, summary?.highBalance || 0];

  return (
    <QueryCard
      title="العملاء الأعلى رصيدًا"
      description="تبويب مخصص للذمم مع بحث وترقيم صفحات من الخادم بدل تحميل كل العملاء دفعة واحدة."
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void exportCustomerBalances()} disabled={!summary?.totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void printCustomerBalances()} disabled={!summary?.totalItems}>طباعة</Button><span className="nav-pill">الذمم</span></div>}
      className="reports-focus-card"
      isLoading={balancesQuery.isLoading}
      isError={balancesQuery.isError}
      error={balancesQuery.error}
      isEmpty={!summary?.totalItems}
      loadingText="جاري تحميل ذمم العملاء..."
      emptyTitle="لا توجد ذمم عملاء حاليًا"
      emptyHint="سيظهر هنا العملاء الأعلى رصيدًا بمجرد وجود حركة مالية."
    >
      <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
        <ReportMetricCard label="عدد العملاء" value={summary?.totalItems || 0} helper="ضمن النطاق الحالي" tone="primary" progress={relativePercent(summary?.totalItems || 0, values)} />
        <ReportMetricCard label="إجمالي الذمم" value={summary?.totalBalance || 0} helper="رصيد العملاء المفتوح" tone="warning" formatter={formatCurrency} progress={relativePercent(summary?.totalBalance || 0, values)} />
        <ReportMetricCard label="فوق الحد" value={summary?.overLimit || 0} helper="يحتاج متابعة" tone="danger" progress={relativePercent(summary?.overLimit || 0, values)} />
        <ReportMetricCard label="رصيد مرتفع" value={summary?.highBalance || 0} helper="عملاء مهمون ماليًا" tone="success" progress={relativePercent(summary?.highBalance || 0, values)} />
      </div>
      <div className="toolbar-grid compact-toolbar-grid">
        <Field label="بحث"><input value={balancesSearch} onChange={(event) => onBalancesSearchChange(event.target.value)} placeholder="اسم العميل / الهاتف" /></Field>
        <Field label="الفلتر"><select value={balancesFilter} onChange={(event) => onBalancesFilterChange(event.target.value as 'all' | 'high-balance' | 'over-limit')}><option value="all">الكل</option><option value="high-balance">رصيد مرتفع</option><option value="over-limit">فوق الحد الائتماني</option></select></Field>
      </div>
      <DataTable
        ariaLabel="ذمم العملاء"
        columns={[
          { key: 'name', header: 'العميل', cell: (row) => row.name },
          { key: 'phone', header: 'الهاتف', cell: (row) => row.phone || '—' },
          { key: 'balance', header: 'الرصيد', cell: (row) => formatCurrency(row.balance || 0) },
          { key: 'creditLimit', header: 'الحد الائتماني', cell: (row) => formatCurrency(row.creditLimit || 0) },
        ]}
        rows={rows}
        empty={<div className="muted small">لا توجد نتائج مطابقة.</div>}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.pageSize, totalItems: pagination.totalItems, onPageChange: onBalancesPageChange, onPageSizeChange: onBalancesPageSizeChange, itemLabel: 'عميل' } : undefined}
      />
    </QueryCard>
  );
}
