import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

type MasterKind = 'departments' | 'job-titles' | 'positions';

interface MasterDraft {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  jobTitleId: string;
}

const initialDraft: MasterDraft = {
  name: '',
  code: '',
  description: '',
  departmentId: '',
  jobTitleId: '',
};

function toId(value: string) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function text(value: unknown) {
  return String(value || '').trim() || '—';
}

function isActiveValue(value: unknown) {
  return value !== false;
}

function statusLabel(isActive: unknown) {
  return isActiveValue(isActive) ? 'نشط' : 'غير نشط';
}

function stats(rows: Array<{ isActive?: boolean }>) {
  const total = rows.length;
  const active = rows.filter((row) => isActiveValue(row.isActive)).length;
  const inactive = Math.max(0, total - active);
  return { total, active, inactive };
}

export function HrSettingsPage() {
  const navigate = useNavigate();
  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const [settingsSearch, setSettingsSearch] = useState('');
  const [departmentDraft, setDepartmentDraft] = useState<MasterDraft>(initialDraft);
  const [jobTitleDraft, setJobTitleDraft] = useState<MasterDraft>(initialDraft);
  const [positionDraft, setPositionDraft] = useState<MasterDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<MasterKind, string>>({
    departments: '',
    'job-titles': '',
    positions: '',
  });

  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  const searchValue = settingsSearch.trim().toLowerCase();

  const filteredDepartments = useMemo(
    () => departments.filter((row) => !searchValue
      || String(row.name || '').toLowerCase().includes(searchValue)
      || String(row.code || '').toLowerCase().includes(searchValue)
      || String(row.description || '').toLowerCase().includes(searchValue)),
    [departments, searchValue],
  );

  const filteredJobTitles = useMemo(
    () => jobTitles.filter((row) => !searchValue
      || String(row.name || '').toLowerCase().includes(searchValue)
      || String(row.code || '').toLowerCase().includes(searchValue)
      || String(row.description || '').toLowerCase().includes(searchValue)),
    [jobTitles, searchValue],
  );

  const filteredPositions = useMemo(
    () => positions.filter((row) => !searchValue
      || String(row.name || '').toLowerCase().includes(searchValue)
      || String(row.code || '').toLowerCase().includes(searchValue)
      || String(row.departmentName || '').toLowerCase().includes(searchValue)
      || String(row.jobTitleName || '').toLowerCase().includes(searchValue)
      || String(row.description || '').toLowerCase().includes(searchValue)),
    [positions, searchValue],
  );

  async function saveKind(kind: MasterKind) {
    const draft = kind === 'departments' ? departmentDraft : kind === 'job-titles' ? jobTitleDraft : positionDraft;
    const name = String(draft.name || '').trim();
    if (!name) {
      setErrors((current) => ({ ...current, [kind]: 'الاسم مطلوب.' }));
      return;
    }

    setErrors((current) => ({ ...current, [kind]: '' }));

    const payload: Record<string, unknown> = {
      name,
      code: String(draft.code || '').trim() || undefined,
      description: String(draft.description || '').trim() || undefined,
    };

    if (kind === 'positions') {
      payload.departmentId = toId(draft.departmentId);
      payload.jobTitleId = toId(draft.jobTitleId);
    }

    try {
      await mutations.saveMasterData.mutateAsync({ kind, payload });
      if (kind === 'departments') setDepartmentDraft(initialDraft);
      if (kind === 'job-titles') setJobTitleDraft(initialDraft);
      if (kind === 'positions') setPositionDraft(initialDraft);
    } catch (error) {
      setErrors((current) => ({ ...current, [kind]: getErrorMessage(error, 'تعذر حفظ البيانات.') }));
    }
  }

  const isBusy = mutations.saveMasterData.isPending;
  const departmentStats = stats(departments);
  const jobTitleStats = stats(jobTitles);
  const positionStats = stats(positions);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="إعدادات الموارد البشرية"
        description="إدارة بيانات الأساس التي يعتمد عليها ملف الموظف والتقارير داخل الموارد البشرية."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card>
        <div className="form-grid">
          <label className="field">
            <span>بحث في الإعدادات</span>
            <input
              value={settingsSearch}
              onChange={(event) => setSettingsSearch(event.target.value)}
              placeholder="بحث في الإعدادات"
            />
          </label>
        </div>
      </Card>

      <QueryFeedback
        isLoading={workspace.departments.isLoading || workspace.jobTitles.isLoading || workspace.positions.isLoading}
        isError={workspace.departments.isError || workspace.jobTitles.isError || workspace.positions.isError}
        error={workspace.departments.error || workspace.jobTitles.error || workspace.positions.error}
        isEmpty={false}
        loadingText="جاري تحميل إعدادات الموارد البشرية..."
        errorTitle="تعذر تحميل إعدادات الموارد البشرية"
      >
        <Card title="الأقسام" description="الأقسام التي يتم ربط الموظفين بها داخل الشركة.">
          <p className="muted" style={{ marginTop: 0 }}>
            استخدم كودًا قصيرًا اختياريًا مثل SALES أو OPS لو الشركة بتعتمد على الأكواد.
          </p>
          {departments.length ? (
            <div className="muted" style={{ marginBottom: 12 }}>
              إجمالي: {departmentStats.total} | نشط: {departmentStats.active} | غير نشط: {departmentStats.inactive}
            </div>
          ) : null}

          <div className="form-grid">
            <div className="field">
              <span>الاسم *</span>
              <input value={departmentDraft.name} onChange={(e) => setDepartmentDraft((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="field">
              <span>الكود</span>
              <input value={departmentDraft.code} onChange={(e) => setDepartmentDraft((current) => ({ ...current, code: e.target.value }))} />
            </div>
            <div className="field field-wide">
              <span>الوصف</span>
              <input value={departmentDraft.description} onChange={(e) => setDepartmentDraft((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
          {errors.departments ? <div className="error-box" style={{ marginTop: 12 }}>{errors.departments}</div> : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button onClick={() => { void saveKind('departments'); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>

          {filteredDepartments.length ? (
            <DataTable
              rows={filteredDepartments}
              rowKey={(row) => String(row.id)}
              density="compact"
              columns={[
                { key: 'name', header: 'الاسم', cell: (row) => text(row.name) },
                { key: 'code', header: 'الكود', cell: (row) => text(row.code) },
                { key: 'description', header: 'الوصف', cell: (row) => text(row.description) },
                { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.isActive) },
              ]}
            />
          ) : <p className="muted">لا توجد أقسام مسجلة. ابدأ بإضافة أول قسم.</p>}
        </Card>

        <Card title="المسميات الوظيفية" description="المسميات التي تظهر في ملف الموظف والتقارير.">
          <p className="muted" style={{ marginTop: 0 }}>
            استخدم كودًا قصيرًا اختياريًا مثل SALES أو OPS لو الشركة بتعتمد على الأكواد.
          </p>
          {jobTitles.length ? (
            <div className="muted" style={{ marginBottom: 12 }}>
              إجمالي: {jobTitleStats.total} | نشط: {jobTitleStats.active} | غير نشط: {jobTitleStats.inactive}
            </div>
          ) : null}

          <div className="form-grid">
            <div className="field">
              <span>الاسم *</span>
              <input value={jobTitleDraft.name} onChange={(e) => setJobTitleDraft((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="field">
              <span>الكود</span>
              <input value={jobTitleDraft.code} onChange={(e) => setJobTitleDraft((current) => ({ ...current, code: e.target.value }))} />
            </div>
            <div className="field field-wide">
              <span>الوصف</span>
              <input value={jobTitleDraft.description} onChange={(e) => setJobTitleDraft((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
          {errors['job-titles'] ? <div className="error-box" style={{ marginTop: 12 }}>{errors['job-titles']}</div> : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button onClick={() => { void saveKind('job-titles'); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>

          {filteredJobTitles.length ? (
            <DataTable
              rows={filteredJobTitles}
              rowKey={(row) => String(row.id)}
              density="compact"
              columns={[
                { key: 'name', header: 'الاسم', cell: (row) => text(row.name) },
                { key: 'code', header: 'الكود', cell: (row) => text(row.code) },
                { key: 'description', header: 'الوصف', cell: (row) => text(row.description) },
                { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.isActive) },
              ]}
            />
          ) : <p className="muted">لا توجد مسميات وظيفية مسجلة. ابدأ بإضافة أول مسمى.</p>}
        </Card>

        <Card title="الوظائف/المناصب" description="الوظائف التفصيلية المرتبطة بالقسم والمسمى الوظيفي.">
          <p className="muted" style={{ marginTop: 0 }}>
            استخدم كودًا قصيرًا اختياريًا مثل SALES أو OPS لو الشركة بتعتمد على الأكواد.
          </p>
          {positions.length ? (
            <div className="muted" style={{ marginBottom: 12 }}>
              إجمالي: {positionStats.total} | نشط: {positionStats.active} | غير نشط: {positionStats.inactive}
            </div>
          ) : null}

          <div className="form-grid">
            <div className="field">
              <span>الاسم *</span>
              <input value={positionDraft.name} onChange={(e) => setPositionDraft((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="field">
              <span>الكود</span>
              <input value={positionDraft.code} onChange={(e) => setPositionDraft((current) => ({ ...current, code: e.target.value }))} />
            </div>
            <div className="field">
              <span>القسم</span>
              <select value={positionDraft.departmentId} onChange={(e) => setPositionDraft((current) => ({ ...current, departmentId: e.target.value }))}>
                <option value="">اختيار</option>
                {departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>المسمى الوظيفي</span>
              <select value={positionDraft.jobTitleId} onChange={(e) => setPositionDraft((current) => ({ ...current, jobTitleId: e.target.value }))}>
                <option value="">اختيار</option>
                {jobTitles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div className="field field-wide">
              <span>الوصف</span>
              <input value={positionDraft.description} onChange={(e) => setPositionDraft((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
          {errors.positions ? <div className="error-box" style={{ marginTop: 12 }}>{errors.positions}</div> : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button onClick={() => { void saveKind('positions'); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>

          {filteredPositions.length ? (
            <DataTable
              rows={filteredPositions}
              rowKey={(row) => String(row.id)}
              density="compact"
              columns={[
                { key: 'name', header: 'الاسم', cell: (row) => text(row.name) },
                { key: 'code', header: 'الكود', cell: (row) => text(row.code) },
                { key: 'department', header: 'القسم', cell: (row) => text(row.departmentName) },
                { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => text(row.jobTitleName) },
                { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.isActive) },
              ]}
            />
          ) : <p className="muted">لا توجد وظائف أو مناصب مسجلة. ابدأ بإضافة أول وظيفة.</p>}
        </Card>
      </QueryFeedback>
    </div>
  );
}
