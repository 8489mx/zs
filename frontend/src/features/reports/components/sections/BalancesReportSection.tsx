import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function BalancesReportSection({
  balancesQuery,
  accountingReceivablesPayables,
  exportCustomerBalances,
  printCustomerBalances,
  balancesSearch,
  onBalancesSearchChange,
  balancesFilter,
  onBalancesFilterChange,
  onBalancesPageChange,
  onBalancesPageSizeChange,
  onBalancesFiltersReset
}: Pick<ReportsSectionContentProps, 'balancesQuery' | 'accountingReceivablesPayables' | 'exportCustomerBalances' | 'printCustomerBalances' | 'balancesSearch' | 'onBalancesSearchChange' | 'balancesFilter' | 'onBalancesFilterChange' | 'onBalancesPageChange' | 'onBalancesPageSizeChange' | 'onBalancesFiltersReset'>) {
  const rows = balancesQuery.data?.rows || [];
  const pagination = balancesQuery.data?.pagination;
  const summary = balancesQuery.data?.summary;
  const totals = accountingReceivablesPayables?.totals;
  const suppliers = accountingReceivablesPayables?.suppliers || [];
  const netPosition = totals?.netPosition ?? 0;
  const netPositionLabel = netPosition >= 0 ? 'صافي لصالحك' : 'صافي التزامات عليك';
  const values = [
    summary?.totalItems || 0,
    totals?.customerReceivables ?? summary?.totalBalance ?? 0,
    totals?.supplierPayables || 0,
    Math.abs(netPosition),
    summary?.overLimit || 0,
  ];

  return (
    <div className="page-stack">
      <QueryCard
        title="العملاء والموردون الأعلى رصيدًا"
        description="تبويب مخصص للذمم مع بحث وترقيم صفحات من الخادم، ويعرض مستحقات العملاء والموردين في قراءة واحدة."
        actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void exportCustomerBalances()} disabled={!summary?.totalItems}>تصدير Excel</Button><Button variant="secondary" onClick={() => void printCustomerBalances()} disabled={!summary?.totalItems}>طباعة</Button><span className="nav-pill">الذمم</span></div>}
        className="reports-focus-card"
        isLoading={balancesQuery.isLoading}
        isError={balancesQuery.isError}
        error={balancesQuery.error}
        isEmpty={!summary?.totalItems && !suppliers.length}
        loadingText="جاري تحميل الذمم..."
        emptyTitle="لا توجد ذمم حالية"
        emptyHint="سيظهر هنا العملاء والموردون الأعلى رصيدًا بمجرد وجود حركة مالية."
        preserveChildrenOnEmpty
        emptyAction={<Button variant="secondary" onClick={onBalancesFiltersReset}>إعادة الضبط</Button>}
      >
        <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
          <ReportMetricCard label="مستحق من العملاء" value={totals?.customerReceivables ?? summary?.totalBalance ?? 0} helper="مبالغ لم تحصل بعد" tone="warning" formatter={formatCurrency} progress={relativePercent(totals?.customerReceivables ?? summary?.totalBalance ?? 0, values)} />
          <ReportMetricCard label="مستحق للموردين" value={totals?.supplierPayables || 0} helper="التزامات على المنشأة" tone="danger" formatter={formatCurrency} progress={relativePercent(totals?.supplierPayables || 0, values)} />
          <ReportMetricCard label={netPositionLabel} value={Math.abs(netPosition)} helper="الفرق بين مستحقات العملاء والموردين" tone={netPosition >= 0 ? 'success' : 'danger'} formatter={formatCurrency} progress={relativePercent(Math.abs(netPosition), values)} />
          <ReportMetricCard label="عدد العملاء" value={summary?.totalItems || 0} helper="ضمن النطاق الحالي" tone="primary" progress={relativePercent(summary?.totalItems || 0, values)} />
        </div>
        <div className="toolbar-grid compact-toolbar-grid">
          <Field label="بحث"><input value={balancesSearch} onChange={(event) => onBalancesSearchChange(event.target.value)} placeholder="اسم العميل / الهاتف" /></Field>
          <Field label="الفلتر"><select value={balancesFilter} onChange={(event) => onBalancesFilterChange(event.target.value as 'all' | 'high-balance' | 'over-limit')}><option value="all">الكل</option><option value="high-balance">رصيد مرتفع</option><option value="over-limit">فوق الحد الائتماني</option></select></Field>
          <div className="actions compact-actions" style={{ alignItems: 'end' }}><Button variant="secondary" onClick={onBalancesFiltersReset}>إعادة الضبط</Button></div>
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

      <FormSection title="الموردون لهم مستحقات" description="قسم مختصر بنفس نمط التبويب الحالي لإظهار الالتزامات المفتوحة للموردين.">
        <DataTable
          ariaLabel="مستحقات الموردين"
          rows={suppliers.slice(0, 10)}
          columns={[
            { key: 'supplierName', header: 'المورد', cell: (row) => row.supplierName || '—' },
            { key: 'phone', header: 'الهاتف', cell: (row) => row.phone || '—' },
            { key: 'balance', header: 'المبلغ المستحق', cell: (row) => formatCurrency(row.balance || 0) },
            { key: 'lastMovementDate', header: 'آخر حركة', cell: (row) => row.lastMovementDate ? String(row.lastMovementDate).slice(0, 10) : '—' },
          ]}
          empty={<div className="muted small">لا توجد مستحقات موردين في النطاق الحالي.</div>}
        />
      </FormSection>
    </div>
  );
}
