import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { DataTable } from '@/shared/ui/data-table';
import { useHrProfile } from '@/features/hr/hooks/useHr';

export function EmployeeProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const profile = useHrProfile(id);
  const employee = profile.data?.employee;
  return (
    <div className="page-stack page-shell">
      <PageHeader title={employee ? `ملف الموظف: ${employee.displayName || employee.firstName}` : 'ملف الموظف'} description="عرض البيانات الأساسية، جهات الاتصال، العقود، والمستندات." />
      <QueryFeedback isLoading={profile.isLoading} isError={profile.isError} error={profile.error} isEmpty={!employee}>
        <Card title="البيانات الأساسية">
          <div className="stats-grid">
            <div><span className="muted">الاسم</span><strong>{employee?.displayName || '—'}</strong></div>
            <div><span className="muted">رقم الموظف</span><strong>{employee?.employeeNo || '—'}</strong></div>
            <div><span className="muted">الحالة</span><strong>{employee?.status || '—'}</strong></div>
          </div>
          <div className="actions compact-actions"><Link to="/hr/employees">العودة للسجل</Link></div>
        </Card>
        <Card title="جهات الاتصال">
          <DataTable rows={profile.data?.contacts || []} rowKey={(row) => row.id} columns={[{ key: 'type', header: 'النوع', cell: (row) => row.contactType || '—' }, { key: 'value', header: 'البيان', cell: (row) => row.value || '—' }]} />
        </Card>
        <Card title="المستندات">
          <DataTable rows={profile.data?.documents || []} rowKey={(row) => row.id} columns={[{ key: 'title', header: 'المستند', cell: (row) => row.title || '—' }, { key: 'type', header: 'النوع', cell: (row) => row.documentType || '—' }]} />
        </Card>
      </QueryFeedback>
    </div>
  );
}
