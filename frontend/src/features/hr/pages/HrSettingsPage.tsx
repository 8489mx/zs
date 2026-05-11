import { FormEvent, useMemo } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrMasterDataRecord } from '@/types/domain';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { formValue, numericFormValue } from '@/features/hr/pages/hr.shared';

function MasterDataForm({ kind, title, departments, jobTitles }: { kind: 'departments' | 'job-titles' | 'positions'; title: string; departments: HrMasterDataRecord[]; jobTitles: HrMasterDataRecord[] }) {
  const mutations = useHrMutations();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutations.saveMasterData.mutateAsync({
      kind,
      payload: {
        name: formValue(form, 'name'),
        code: formValue(form, 'code'),
        description: formValue(form, 'description'),
        departmentId: numericFormValue(form, 'departmentId'),
        jobTitleId: numericFormValue(form, 'jobTitleId'),
      },
    });
    event.currentTarget.reset();
  }
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="field"><span>{title}</span><input name="name" required /></label>
      <label className="field"><span>الكود</span><input name="code" /></label>
      {kind === 'positions' ? <>
        <label className="field"><span>القسم</span><select name="departmentId"><option value="">—</option>{departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="field"><span>المسمى</span><select name="jobTitleId"><option value="">—</option>{jobTitles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      </> : null}
      <label className="field field-wide"><span>ملاحظات</span><textarea name="description" rows={2} /></label>
      <div className="actions compact-actions"><Button type="submit" disabled={mutations.saveMasterData.isPending}>حفظ</Button></div>
    </form>
  );
}

export function HrSettingsPage() {
  const workspace = useHrWorkspace({ page: 1, pageSize: 20 });
  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  return (
    <div className="page-stack page-shell">
      <PageHeader title="إعدادات الموارد البشرية" description="إدارة الأقسام والمسميات والوظائف." />
      <Card title="تعريفات أساسية">
        <div className="three-column-grid">
          <MasterDataForm kind="departments" title="قسم جديد" departments={departments} jobTitles={jobTitles} />
          <MasterDataForm kind="job-titles" title="مسمى جديد" departments={departments} jobTitles={jobTitles} />
          <MasterDataForm kind="positions" title="وظيفة جديدة" departments={departments} jobTitles={jobTitles} />
        </div>
      </Card>
      <Card title="القيم الحالية">
        <div className="two-column-grid">
          <DataTable<HrMasterDataRecord> rows={departments} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'الأقسام', cell: (row) => row.name }, { key: 'code', header: 'الكود', cell: (row) => row.code || '—' }]} />
          <DataTable<HrMasterDataRecord> rows={jobTitles} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'المسميات', cell: (row) => row.name }, { key: 'code', header: 'الكود', cell: (row) => row.code || '—' }]} />
        </div>
      </Card>
    </div>
  );
}
