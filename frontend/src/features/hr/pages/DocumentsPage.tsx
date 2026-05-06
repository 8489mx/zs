import { useMemo, useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { useHrProfile, useHrWorkspace } from '@/features/hr/hooks/useHr';

export function DocumentsPage() {
  const [employeeId, setEmployeeId] = useState('');
  const workspace = useHrWorkspace({ page: 1, pageSize: 50 });
  const profile = useHrProfile(employeeId);
  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  return (
    <div className="page-stack page-shell">
      <PageHeader title="المستندات" description="عرض مستندات الموظفين المحفوظة." />
      <Card title="اختيار موظف">
        <div className="form-grid">
          <label className="field">
            <span>الموظف</span>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">اختر موظفًا</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.displayName}</option>)}
            </select>
          </label>
        </div>
      </Card>
      <Card title="قائمة المستندات">
        <QueryFeedback isLoading={profile.isLoading} isError={profile.isError} error={profile.error} isEmpty={!((profile.data?.documents || []).length)}>
          <DataTable rows={profile.data?.documents || []} rowKey={(row) => row.id} columns={[
            { key: 'title', header: 'المستند', cell: (row) => row.title || '—' },
            { key: 'type', header: 'النوع', cell: (row) => row.documentType || '—' },
            { key: 'expiry', header: 'الانتهاء', cell: (row) => row.expiryDate || '—' },
          ]} />
        </QueryFeedback>
      </Card>
    </div>
  );
}
