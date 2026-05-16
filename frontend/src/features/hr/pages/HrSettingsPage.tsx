import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import { useHrLeaveTypes, useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

type MasterKind = 'departments' | 'job-titles' | 'positions';

interface MasterDraft {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  jobTitleId: string;
}

interface LeaveTypeDraft {
  name: string;
  code: string;
  description: string;
  isPaid: 'paid' | 'unpaid';
}

const initialDraft: MasterDraft = {
  name: '',
  code: '',
  description: '',
  departmentId: '',
  jobTitleId: '',
};

const initialLeaveTypeDraft: LeaveTypeDraft = {
  name: '',
  code: '',
  description: '',
  isPaid: 'paid',
};

function toId(value: string) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function text(value: unknown) {
  return String(value || '').trim() || '—';
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isActiveValue(value: unknown) {
  return value !== false;
}

function statusLabel(isActive: unknown) {
  return isActiveValue(isActive) ? 'نشط' : 'غير نشط';
}

function paidLabel(value: unknown) {
  if (value === true) return 'مدفوعة';
  if (value === false) return 'غير مدفوعة';
  return 'غير متاح';
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
  const leaveTypesQuery = useHrLeaveTypes({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const [settingsSearch, setSettingsSearch] = useState('');
  const [departmentDraft, setDepartmentDraft] = useState<MasterDraft>(initialDraft);
  const [jobTitleDraft, setJobTitleDraft] = useState<MasterDraft>(initialDraft);
  const [positionDraft, setPositionDraft] = useState<MasterDraft>(initialDraft);
  const [leaveTypeDraft, setLeaveTypeDraft] = useState<LeaveTypeDraft>(initialLeaveTypeDraft);
  const [errors, setErrors] = useState<Record<MasterKind | 'leave-types', string>>({
    departments: '',
    'job-titles': '',
    positions: '',
    'leave-types': '',
  });

  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);
  const leaveTypes = useMemo(() => leaveTypesQuery.data?.rows || [], [leaveTypesQuery.data?.rows]);

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

  const filteredLeaveTypes = useMemo(
    () => leaveTypes.filter((row) => !searchValue
      || String(row.name || '').toLowerCase().includes(searchValue)
      || String(row.code || '').toLowerCase().includes(searchValue)
      || String(row.description || '').toLowerCase().includes(searchValue)),
    [leaveTypes, searchValue],
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

  async function saveLeaveType() {
    const name = String(leaveTypeDraft.name || '').trim();
    if (!name) {
      setErrors((current) => ({ ...current, 'leave-types': 'اسم نوع الإجازة مطلوب.' }));
      return;
    }

    setErrors((current) => ({ ...current, 'leave-types': '' }));

    try {
      await mutations.saveLeaveType.mutateAsync({
        payload: {
          name,
          code: String(leaveTypeDraft.code || '').trim() || undefined,
          description: String(leaveTypeDraft.description || '').trim() || undefined,
          isPaid: leaveTypeDraft.isPaid === 'paid',
          isActive: true,
        },
      });
      setLeaveTypeDraft(initialLeaveTypeDraft);
    } catch (error) {
      setErrors((current) => ({ ...current, 'leave-types': getErrorMessage(error, 'تعذر حفظ نوع الإجازة.') }));
    }
  }

  const isBusy = mutations.saveMasterData.isPending || mutations.saveLeaveType.isPending;

  const departmentStats = stats(departments);
  const jobTitleStats = stats(jobTitles);
  const positionStats = stats(positions);
  const leaveTypeStats = stats(leaveTypes);

  const healthSummary = useMemo(() => {
    const inactiveTotal = departmentStats.inactive + jobTitleStats.inactive + positionStats.inactive + leaveTypeStats.inactive;
    const reviewItems = [
      ...positions.filter((row) => !normalize(row.departmentName) || !normalize(row.jobTitleName)),
    ].length;

    return {
      departments: departmentStats.total,
      jobTitles: jobTitleStats.total,
      leaveTypes: leaveTypeStats.total,
      documentTypes: 'غير متاح',
      inactiveTotal,
      reviewItems,
    };
  }, [departmentStats, jobTitleStats, positionStats, leaveTypeStats, positions]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="إعدادات الموارد البشرية"
        description="مركز التحكم في القوائم الأساسية والإعدادات المرجعية المستخدمة في جميع صفحات الموارد البشرية."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="بحث عام في الإعدادات">
        <div className="form-grid">
          <label className="field">
            <span>بحث</span>
            <input
              value={settingsSearch}
              onChange={(event) => setSettingsSearch(event.target.value)}
              placeholder="ابحث بالاسم أو الكود أو الوصف"
            />
          </label>
        </div>
      </Card>

      <Card title="ملخص صحة الإعدادات">
        <div className="stats-grid">
          <div><strong>عدد الأقسام:</strong> {healthSummary.departments}</div>
          <div><strong>عدد المسميات الوظيفية:</strong> {healthSummary.jobTitles}</div>
          <div><strong>عدد أنواع الإجازات:</strong> {healthSummary.leaveTypes}</div>
          <div><strong>عدد أنواع المستندات:</strong> {healthSummary.documentTypes}</div>
          <div><strong>عناصر غير نشطة:</strong> {healthSummary.inactiveTotal}</div>
          <div><strong>عناصر تحتاج مراجعة:</strong> {healthSummary.reviewItems}</div>
        </div>
      </Card>

      <QueryFeedback
        isLoading={workspace.departments.isLoading || workspace.jobTitles.isLoading || workspace.positions.isLoading || leaveTypesQuery.isLoading}
        isError={workspace.departments.isError || workspace.jobTitles.isError || workspace.positions.isError || leaveTypesQuery.isError}
        error={workspace.departments.error || workspace.jobTitles.error || workspace.positions.error || leaveTypesQuery.error}
        isEmpty={false}
        loadingText="جاري تحميل إعدادات الموارد البشرية..."
        errorTitle="تعذر تحميل إعدادات الموارد البشرية"
      >
        <Card title="الهيكل التنظيمي" description="إدارة الأقسام والمسميات الوظيفية والمناصب المستخدمة في ملفات الموظفين والتقارير.">
          <div className="stats-grid" style={{ marginBottom: 12 }}>
            <div><strong>الأقسام:</strong> {departmentStats.total}</div>
            <div><strong>المسميات الوظيفية:</strong> {jobTitleStats.total}</div>
            <div><strong>المناصب/الوظائف:</strong> {positionStats.total}</div>
            <div><strong>الفروع/المواقع:</strong> غير متاح</div>
          </div>

          <Card title="الأقسام" description="القوائم التي يتم ربط الموظفين بها داخل الهيكل التنظيمي.">
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
              <Button onClick={() => { void saveKind('departments'); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ القسم'}</Button>
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
            ) : <p className="muted">لا توجد أقسام حتى الآن.</p>}
          </Card>

          <Card title="المسميات الوظيفية" description="المسميات التي تظهر في بيانات الموظفين والتقارير.">
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
              <Button onClick={() => { void saveKind('job-titles'); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ المسمى'}</Button>
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
            ) : <p className="muted">لا توجد مسميات وظيفية حتى الآن.</p>}
          </Card>

          <Card title="المناصب / الوظائف" description="الوظائف التفصيلية المرتبطة بالأقسام والمسميات الوظيفية.">
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
              <Button onClick={() => { void saveKind('positions'); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ المنصب'}</Button>
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
            ) : <p className="muted">لا توجد وظائف أو مناصب حتى الآن.</p>}
          </Card>
        </Card>

        <Card title="الإجازات" description="إدارة أنواع الإجازات المعتمدة وإعداداتها الأساسية.">
          <div className="form-grid">
            <div className="field">
              <span>الاسم *</span>
              <input value={leaveTypeDraft.name} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="field">
              <span>الكود</span>
              <input value={leaveTypeDraft.code} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, code: e.target.value }))} />
            </div>
            <div className="field">
              <span>النوع</span>
              <select value={leaveTypeDraft.isPaid} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, isPaid: e.target.value as 'paid' | 'unpaid' }))}>
                <option value="paid">مدفوعة</option>
                <option value="unpaid">غير مدفوعة</option>
              </select>
            </div>
            <div className="field field-wide">
              <span>الوصف</span>
              <input value={leaveTypeDraft.description} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
          {errors['leave-types'] ? <div className="error-box" style={{ marginTop: 12 }}>{errors['leave-types']}</div> : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button onClick={() => { void saveLeaveType(); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ نوع الإجازة'}</Button>
          </div>

          {filteredLeaveTypes.length ? (
            <DataTable
              rows={filteredLeaveTypes}
              rowKey={(row) => String(row.id)}
              density="compact"
              columns={[
                { key: 'name', header: 'الاسم', cell: (row) => text(row.name) },
                { key: 'code', header: 'الكود', cell: (row) => text(row.code) },
                { key: 'paid', header: 'مدفوعة / غير مدفوعة', cell: (row) => paidLabel(row.isPaid) },
                { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.isActive) },
                { key: 'description', header: 'الوصف', cell: (row) => text(row.description) },
              ]}
            />
          ) : <p className="muted">لا توجد أنواع إجازات حتى الآن.</p>}
        </Card>

        <Card title="المستندات" description="القوائم المتقدمة لأنواع المستندات وإعدادات الصلاحية.">
          <p className="muted" style={{ margin: 0 }}>
            لا توجد أنواع مستندات حتى الآن ضمن إعدادات البيانات الحالية. يمكن متابعة المستندات من صفحة مستندات الموظفين.
          </p>
        </Card>

        <Card title="الحضور والانصراف" description="إعدادات القواعد التشغيلية للحضور.">
          <p className="muted" style={{ margin: 0 }}>
            إعدادات الحضور المتقدمة غير متاحة حاليًا من البيانات الحالية.
          </p>
        </Card>

        <Card title="المرتبات" description="إعدادات مكونات المرتبات الأساسية.">
          <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
            لا توجد إعدادات متقدمة للبدلات والخصومات ضمن صفحة الإعدادات الحالية.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            إعدادات الضرائب والتأمينات تحتاج ضبطًا مستقلًا ومراجعة محاسب قبل الاعتماد.
          </p>
        </Card>

        <Card title="ملاحظة">
          <p className="muted" style={{ margin: 0 }}>
            أضف البيانات الأساسية حتى تظهر في صفحات الموظفين والحضور والإجازات.
          </p>
        </Card>
      </QueryFeedback>
    </div>
  );
}
