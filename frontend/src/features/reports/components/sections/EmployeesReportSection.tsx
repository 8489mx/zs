import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';
import { reportsApi } from '@/features/reports/api/reports.api';
import { userDirectoryApi } from '@/shared/api/user-directory';

const roleLabel: Record<string, string> = {
  super_admin: 'سوبر أدمن',
  admin: 'مدير',
  cashier: 'كاشير',
};

const activityLabel: Record<string, string> = {
  all: 'كل العمليات',
  sales: 'المبيعات',
  returns: 'المرتجعات',
  purchases: 'المشتريات',
  expenses: 'المصروفات',
  shifts: 'الورديات',
  audit: 'السجل',
  sale: 'بيع',
  purchase: 'شراء',
};

export function EmployeesReportSection({
  employeesQuery,
  employeeSearch,
  onEmployeeSearchChange,
  selectedEmployeeId,
  onSelectedEmployeeIdChange,
  employeeRole,
  onEmployeeRoleChange,
  employeeActivityType,
  onEmployeeActivityTypeChange,
  onEmployeesPageChange,
  onEmployeesPageSizeChange,
  onEmployeesFiltersReset,
}: Pick<ReportsSectionContentProps,
  'employeesQuery'
  | 'employeeSearch'
  | 'onEmployeeSearchChange'
  | 'selectedEmployeeId'
  | 'onSelectedEmployeeIdChange'
  | 'employeeRole'
  | 'onEmployeeRoleChange'
  | 'employeeActivityType'
  | 'onEmployeeActivityTypeChange'
  | 'onEmployeesPageChange'
  | 'onEmployeesPageSizeChange'
  | 'onEmployeesFiltersReset'
>) {
  const [detailsUserId, setDetailsUserId] = useState('');
  const usersQuery = useQuery({ queryKey: ['reports', 'employee-options'], queryFn: userDirectoryApi.users, staleTime: 60_000 });
  const detailsQuery = useQuery({
    queryKey: ['reports', 'employee-details', detailsUserId, employeeActivityType],
    queryFn: () => reportsApi.employeeReportDetails(detailsUserId, { activityType: employeeActivityType, limit: 30 }),
    enabled: Boolean(detailsUserId),
  });

  const rows = employeesQuery.data?.rows || [];
  const pagination = employeesQuery.data?.pagination;
  const summary = employeesQuery.data?.summary;
  const metricsBase = [
    summary?.totalUsers || 0,
    summary?.activeUsers || 0,
    summary?.usersWithActivity || 0,
    summary?.totalSales || 0,
    summary?.totalPurchases || 0,
    summary?.totalReturns || 0,
  ];
  const userOptions = useMemo(() => (usersQuery.data || []).map((user) => ({
    id: String(user.id || ''),
    label: String(user.name || user.username || 'مستخدم'),
  })), [usersQuery.data]);
  const employeeDetails = detailsQuery.data?.employee;
  const activityRows = detailsQuery.data?.activities || [];
  const detailsSummary = detailsQuery.data?.summary;

  return (
    <>
      <QueryCard
        title="تقارير الموظفين"
        description="فلترة حسب الموظف أو الدور أو نوع العملية، ثم مراجعة الملخصات وفتح تفاصيل الموظف من نفس الشاشة."
        actions={<span className="nav-pill">الموظفون</span>}
        isLoading={employeesQuery.isLoading || usersQuery.isLoading}
        isError={employeesQuery.isError || usersQuery.isError}
        error={employeesQuery.error || usersQuery.error}
        isEmpty={!summary?.totalUsers}
        loadingText="جاري تحميل ملخصات الموظفين..."
        emptyTitle="لا توجد نتائج مطابقة"
        emptyHint="وسّع الفلاتر أو جرّب فترة أخرى."
        preserveChildrenOnEmpty
        emptyAction={<Button variant="secondary" onClick={onEmployeesFiltersReset}>إعادة الضبط</Button>}
      >
        <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
          <ReportMetricCard label="عدد الموظفين" value={summary?.totalUsers || 0} helper="ضمن الفلاتر الحالية" tone="primary" progress={relativePercent(summary?.totalUsers || 0, metricsBase)} />
          <ReportMetricCard label="نشطون" value={summary?.activeUsers || 0} helper="حسابات مفعّلة" tone="success" progress={relativePercent(summary?.activeUsers || 0, metricsBase)} />
          <ReportMetricCard label="لديهم نشاط" value={summary?.usersWithActivity || 0} helper="داخل الفترة" tone="warning" progress={relativePercent(summary?.usersWithActivity || 0, metricsBase)} />
          <ReportMetricCard label="مبيعات الموظفين" value={summary?.totalSales || 0} helper="إجمالي البيع المنسوب" tone="primary" formatter={formatCurrency} progress={relativePercent(summary?.totalSales || 0, metricsBase)} />
          <ReportMetricCard label="مشتريات الموظفين" value={summary?.totalPurchases || 0} helper="الفواتير المدخلة" tone="warning" formatter={formatCurrency} progress={relativePercent(summary?.totalPurchases || 0, metricsBase)} />
          <ReportMetricCard label="مرتجعات الموظفين" value={summary?.totalReturns || 0} helper="إجمالي المرتجعات" tone="danger" formatter={formatCurrency} progress={relativePercent(summary?.totalReturns || 0, metricsBase)} />
        </div>

        <div className="toolbar-grid compact-toolbar-grid">
          <Field label="بحث">
            <input value={employeeSearch} onChange={(event) => onEmployeeSearchChange(event.target.value)} placeholder="اسم الموظف / اسم المستخدم" />
          </Field>
          <Field label="الموظف">
            <select value={selectedEmployeeId} onChange={(event) => onSelectedEmployeeIdChange(event.target.value)}>
              <option value="">كل الموظفين</option>
              {userOptions.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}
            </select>
          </Field>
          <Field label="الدور">
            <select value={employeeRole} onChange={(event) => onEmployeeRoleChange(event.target.value as 'all' | 'super_admin' | 'admin' | 'cashier')}>
              <option value="all">كل الأدوار</option>
              <option value="super_admin">سوبر أدمن</option>
              <option value="admin">مدير</option>
              <option value="cashier">كاشير</option>
            </select>
          </Field>
          <Field label="نوع العملية">
            <select value={employeeActivityType} onChange={(event) => onEmployeeActivityTypeChange(event.target.value as 'all' | 'sales' | 'returns' | 'purchases' | 'expenses' | 'shifts' | 'audit')}>
              <option value="all">كل العمليات</option>
              <option value="sales">المبيعات</option>
              <option value="returns">المرتجعات</option>
              <option value="purchases">المشتريات</option>
              <option value="expenses">المصروفات</option>
              <option value="shifts">الورديات</option>
              <option value="audit">السجل</option>
            </select>
          </Field>
          <div className="actions compact-actions" style={{ alignItems: 'end' }}><Button variant="secondary" onClick={onEmployeesFiltersReset}>إعادة الضبط</Button></div>
        </div>

        <DataTable
          ariaLabel="تقارير الموظفين"
          rows={rows}
          columns={[
            {
              key: 'employee',
              header: 'الموظف',
              cell: (row) => (
                <div>
                  <strong>{row.name}</strong>
                  <div className="muted small">{row.username} · {roleLabel[row.role] || row.role} · {row.isActive ? 'نشط' : 'موقوف'}</div>
                </div>
              ),
            },
            { key: 'sales', header: 'المبيعات', cell: (row) => `${row.salesCount} · ${formatCurrency(row.salesTotal || 0)}` },
            { key: 'returns', header: 'المرتجعات', cell: (row) => `${row.returnsCount} · ${formatCurrency(row.returnsTotal || 0)}` },
            { key: 'purchases', header: 'المشتريات', cell: (row) => `${row.purchasesCount} · ${formatCurrency(row.purchasesTotal || 0)}` },
            { key: 'ops', header: 'العمليات', cell: (row) => `${row.shiftsCount} وردية · ${row.auditCount} سجل` },
            { key: 'last', header: 'آخر نشاط', cell: (row) => formatDate(row.lastActivityAt || '') },
            {
              key: 'actions',
              header: 'تفاصيل',
              cell: (row) => <Button variant="secondary" onClick={(event) => { event.stopPropagation(); setDetailsUserId(String(row.id || '')); }}>عرض</Button>,
            },
          ]}
          empty={<div className="muted small">لا توجد نتائج مطابقة للفلاتر الحالية.</div>}
          pagination={pagination ? {
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalItems: pagination.totalItems,
            onPageChange: onEmployeesPageChange,
            onPageSizeChange: onEmployeesPageSizeChange,
            itemLabel: 'موظف',
          } : undefined}
        />
      </QueryCard>

      <DialogShell open={Boolean(detailsUserId)} onClose={() => setDetailsUserId('')} width="min(980px, 100%)" ariaLabel="تفاصيل نشاط الموظف">
        <div className="page-stack">
          <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>تفاصيل المستخدم</h3>
              <div className="muted small">{employeeDetails ? `${employeeDetails.name} · ${employeeDetails.username}` : 'جاري التحميل...'}</div>
            </div>
            <Button variant="secondary" onClick={() => setDetailsUserId('')}>إغلاق</Button>
          </div>

          {detailsQuery.isLoading ? <div className="muted small">جاري تحميل التفاصيل...</div> : null}
          {detailsQuery.isError ? <div className="warning-box">تعذر تحميل تفاصيل الموظف.</div> : null}

          {employeeDetails ? (
            <>
              <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
                <ReportMetricCard label="المبيعات" value={detailsSummary?.totalSales || employeeDetails.salesTotal || 0} helper={`${employeeDetails.salesCount} فاتورة`} tone="primary" formatter={formatCurrency} progress={relativePercent(detailsSummary?.totalSales || employeeDetails.salesTotal || 0, [detailsSummary?.totalSales || 0, detailsSummary?.totalPurchases || 0, detailsSummary?.totalReturns || 0, detailsSummary?.totalExpenses || 0])} />
                <ReportMetricCard label="المشتريات" value={detailsSummary?.totalPurchases || employeeDetails.purchasesTotal || 0} helper={`${employeeDetails.purchasesCount} فاتورة`} tone="warning" formatter={formatCurrency} progress={relativePercent(detailsSummary?.totalPurchases || employeeDetails.purchasesTotal || 0, [detailsSummary?.totalSales || 0, detailsSummary?.totalPurchases || 0, detailsSummary?.totalReturns || 0, detailsSummary?.totalExpenses || 0])} />
                <ReportMetricCard label="المرتجعات" value={detailsSummary?.totalReturns || employeeDetails.returnsTotal || 0} helper={`${employeeDetails.returnsCount} مستند`} tone="danger" formatter={formatCurrency} progress={relativePercent(detailsSummary?.totalReturns || employeeDetails.returnsTotal || 0, [detailsSummary?.totalSales || 0, detailsSummary?.totalPurchases || 0, detailsSummary?.totalReturns || 0, detailsSummary?.totalExpenses || 0])} />
                <ReportMetricCard label="المصروفات" value={detailsSummary?.totalExpenses || employeeDetails.expensesTotal || 0} helper={`${employeeDetails.expensesCount} حركة`} tone="warning" formatter={formatCurrency} progress={relativePercent(detailsSummary?.totalExpenses || employeeDetails.expensesTotal || 0, [detailsSummary?.totalSales || 0, detailsSummary?.totalPurchases || 0, detailsSummary?.totalReturns || 0, detailsSummary?.totalExpenses || 0])} />
                <ReportMetricCard label="السجل" value={detailsSummary?.totalAuditEvents || employeeDetails.auditCount || 0} helper="أحداث رقابية" tone="success" progress={relativePercent(detailsSummary?.totalAuditEvents || employeeDetails.auditCount || 0, [detailsSummary?.totalAuditEvents || 0, detailsSummary?.totalShifts || 0, 1])} />
                <ReportMetricCard label="الورديات" value={detailsSummary?.totalShifts || employeeDetails.shiftsCount || 0} helper={`المفتوح الآن: ${employeeDetails.openShifts || 0}`} tone="primary" progress={relativePercent(detailsSummary?.totalShifts || employeeDetails.shiftsCount || 0, [detailsSummary?.totalAuditEvents || 0, detailsSummary?.totalShifts || 0, 1])} />
              </div>

              <DataTable
                ariaLabel="آخر نشاط الموظف"
                rows={activityRows}
                columns={[
                  { key: 'type', header: 'النوع', cell: (row) => activityLabel[row.activityType] || row.activityType },
                  { key: 'title', header: 'العنوان', cell: (row) => row.title },
                  { key: 'details', header: 'التفاصيل', cell: (row) => row.details || '—' },
                  { key: 'amount', header: 'القيمة', cell: (row) => row.amount == null ? '—' : formatCurrency(row.amount || 0) },
                  { key: 'date', header: 'التاريخ والوقت', cell: (row) => formatDate(row.createdAt) },
                  { key: 'ref', header: 'المرجع', cell: (row) => row.referenceLabel || '—' },
                ]}
                empty={<div className="muted small">لا توجد حركات داخل النطاق الحالي.</div>}
              />
            </>
          ) : null}
        </div>
      </DialogShell>
    </>
  );
}
