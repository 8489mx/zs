import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

interface EmployeeDraft {
  employeeNo: string;
  firstName: string;
  lastName: string;
  mobile: string;
  nationalId: string;
  branchId: string;
  departmentId: string;
  jobTitleId: string;
  positionId: string;
  hireDate: string;
  status: 'active' | 'inactive';
  contractType: string;
  baseSalary: string;
  salaryMethod: string;
  notes: string;
}

const initialDraft: EmployeeDraft = {
  employeeNo: '',
  firstName: '',
  lastName: '',
  mobile: '',
  nationalId: '',
  branchId: '',
  departmentId: '',
  jobTitleId: '',
  positionId: '',
  hireDate: '',
  status: 'active',
  contractType: '',
  baseSalary: '',
  salaryMethod: '',
  notes: '',
};

function toId(value: string) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');

  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const firstName = String(draft.firstName || '').trim();
    const mobile = String(draft.mobile || '').trim();
    const hireDate = String(draft.hireDate || '').trim();

    if (!firstName) {
      setSubmitError('????? ????? ?????.');
      return;
    }
    if (!mobile) {
      setSubmitError('???????? ?????.');
      return;
    }
    if (!hireDate) {
      setSubmitError('????? ??????? ?????.');
      return;
    }

    try {
      const employeePayload = {
        employeeNo: String(draft.employeeNo || '').trim() || undefined,
        firstName,
        lastName: String(draft.lastName || '').trim() || undefined,
        status: draft.status,
        branchId: toId(draft.branchId),
        departmentId: toId(draft.departmentId),
        jobTitleId: toId(draft.jobTitleId),
        positionId: toId(draft.positionId),
        hireDate,
        notes: String(draft.notes || '').trim() || undefined,
      };

      const result = await mutations.saveEmployee.mutateAsync({ payload: employeePayload });
      const responseRows = ((result as { employees?: Array<{ id?: string | number; firstName?: string; lastName?: string; employeeNo?: string }> })?.employees || []);
      const matched = responseRows.find((row) => {
        const sameFirst = String(row.firstName || '').trim() === firstName;
        const sameLast = String(row.lastName || '').trim() === String(draft.lastName || '').trim();
        const sameNo = String(row.employeeNo || '').trim() === String(draft.employeeNo || '').trim();
        return sameNo || (sameFirst && sameLast);
      });
      const createdEmployeeId = matched?.id != null ? String(matched.id) : '';

      if (createdEmployeeId) {
        await mutations.saveContact.mutateAsync({
          employeeId: createdEmployeeId,
          payload: {
            contactType: 'phone',
            value: mobile,
            label: '????????',
            isPrimary: true,
            notes: '',
          },
        });
      }

      navigate('/hr/employees');
    } catch (error) {
      setSubmitError(getErrorMessage(error, '???? ??? ?????? ??????.'));
    }
  }

  const isBusy = mutations.saveEmployee.isPending || mutations.saveContact.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="????? ????"
        description="????? ???? ???? ????????? ????????? ?? ??????? ???????? ???????? ?? ??????? ???????."
      />

      <form onSubmit={(event) => { void handleSubmit(event); }}>
        <Card title="???????? ????????" description="???? ??? ?????? ?????? ???? ??? ??????.">
          <div className="form-grid">
            <div className="field">
              <span>??? ??????</span>
              <input value={draft.employeeNo} onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))} />
            </div>
            <div className="field">
              <span>????? ????? *</span>
              <input value={draft.firstName} onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))} required />
            </div>
            <div className="field">
              <span>??? ???????</span>
              <input value={draft.lastName} onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))} />
            </div>
            <div className="field">
              <span>???????? *</span>
              <input value={draft.mobile} onChange={(e) => setDraft((current) => ({ ...current, mobile: e.target.value }))} required />
            </div>
            <div className="field">
              <span>????? ??????</span>
              <input value={draft.nationalId} onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))} />
            </div>
          </div>
        </Card>

        <Card title="?????? ?????" description="????? ????? ??????? ??????? ???????.">
          <div className="form-grid">
            <div className="field">
              <span>?????</span>
              <select value={draft.departmentId} onChange={(e) => setDraft((current) => ({ ...current, departmentId: e.target.value }))}>
                <option value="">???? ?????</option>
                {departments.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>?????? ???????</span>
              <select value={draft.jobTitleId} onChange={(e) => setDraft((current) => ({ ...current, jobTitleId: e.target.value }))}>
                <option value="">???? ?????</option>
                {jobTitles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>???????/??????</span>
              <select value={draft.positionId} onChange={(e) => setDraft((current) => ({ ...current, positionId: e.target.value }))}>
                <option value="">???? ?????</option>
                {positions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>?????</span>
              <input value={draft.branchId} onChange={(e) => setDraft((current) => ({ ...current, branchId: e.target.value }))} placeholder="???????" />
            </div>
            <div className="field">
              <span>????? ??????? *</span>
              <input type="date" value={draft.hireDate} onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))} required />
            </div>
            <div className="field">
              <span>??????</span>
              <select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value === 'inactive' ? 'inactive' : 'active' }))}>
                <option value="active">???</option>
                <option value="inactive">??? ???</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="????? ???????" description="?????? ???????? ???????? ????? ??????? ??????? ?? ???? ?????? ?????????.">
          <div className="form-grid">
            <div className="field">
              <span>??? ???????</span>
              <input value={draft.contractType} onChange={(e) => setDraft((current) => ({ ...current, contractType: e.target.value }))} placeholder="???????" />
            </div>
            <div className="field">
              <span>?????? ???????</span>
              <input type="number" min="0" step="0.01" value={draft.baseSalary} onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))} placeholder="???????" />
            </div>
            <div className="field">
              <span>????? ??? ??????</span>
              <input value={draft.salaryMethod} onChange={(e) => setDraft((current) => ({ ...current, salaryMethod: e.target.value }))} placeholder="???????" />
            </div>
          </div>
        </Card>

        <Card title="???????" description="?? ??????? ??????? ??? ??? ??????.">
          <div className="field field-wide">
            <span>???????</span>
            <textarea rows={4} value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} />
          </div>

          {submitError ? <div className="error-box" style={{ marginTop: 12 }}>{submitError}</div> : null}

          <div className="actions compact-actions" style={{ marginTop: 16 }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>?????</Button>
            <Button type="submit" disabled={isBusy}>{isBusy ? '???? ?????...' : '??? ??????'}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
