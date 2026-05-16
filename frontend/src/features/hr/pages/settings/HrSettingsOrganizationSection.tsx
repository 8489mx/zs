import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { statusLabel, text } from '@/features/hr/pages/settings/hr-settings.helpers';

type MasterDraft = {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  jobTitleId: string;
};

type OptionRow = { id: string | number; name?: string; code?: string; description?: string; isActive?: boolean; departmentName?: string; jobTitleName?: string };

type Props = {
  departmentStatsTotal: number;
  jobTitleStatsTotal: number;
  positionStatsTotal: number;
  departmentDraft: MasterDraft;
  jobTitleDraft: MasterDraft;
  positionDraft: MasterDraft;
  errors: { departments: string; 'job-titles': string; positions: string };
  isBusy: boolean;
  departments: OptionRow[];
  jobTitles: OptionRow[];
  filteredDepartments: OptionRow[];
  filteredJobTitles: OptionRow[];
  filteredPositions: OptionRow[];
  onDepartmentDraftChange: (updater: (current: MasterDraft) => MasterDraft) => void;
  onJobTitleDraftChange: (updater: (current: MasterDraft) => MasterDraft) => void;
  onPositionDraftChange: (updater: (current: MasterDraft) => MasterDraft) => void;
  onSaveDepartment: () => void;
  onSaveJobTitle: () => void;
  onSavePosition: () => void;
};

export function HrSettingsOrganizationSection(props: Props) {
  const {
    departmentStatsTotal,
    jobTitleStatsTotal,
    positionStatsTotal,
    departmentDraft,
    jobTitleDraft,
    positionDraft,
    errors,
    isBusy,
    departments,
    jobTitles,
    filteredDepartments,
    filteredJobTitles,
    filteredPositions,
    onDepartmentDraftChange,
    onJobTitleDraftChange,
    onPositionDraftChange,
    onSaveDepartment,
    onSaveJobTitle,
    onSavePosition,
  } = props;

  return (
    <Card title="الهيكل التنظيمي" description="إدارة الأقسام والمسميات الوظيفية والمناصب المستخدمة في ملفات الموظفين والتقارير.">
      <div className="stats-grid" style={{ marginBottom: 12 }}>
        <div><strong>الأقسام:</strong> {departmentStatsTotal}</div>
        <div><strong>المسميات الوظيفية:</strong> {jobTitleStatsTotal}</div>
        <div><strong>المناصب/الوظائف:</strong> {positionStatsTotal}</div>
        <div><strong>الفروع/المواقع:</strong> غير متاح</div>
      </div>

      <Card title="الأقسام" description="القوائم التي يتم ربط الموظفين بها داخل الهيكل التنظيمي.">
        <div className="form-grid">
          <div className="field"><span>الاسم *</span><input value={departmentDraft.name} onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, name: e.target.value }))} /></div>
          <div className="field"><span>الكود</span><input value={departmentDraft.code} onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, code: e.target.value }))} /></div>
          <div className="field field-wide"><span>الوصف</span><input value={departmentDraft.description} onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, description: e.target.value }))} /></div>
        </div>
        {errors.departments ? <div className="error-box" style={{ marginTop: 12 }}>{errors.departments}</div> : null}
        <div className="actions compact-actions" style={{ marginTop: 12 }}>
          <Button onClick={onSaveDepartment} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ القسم'}</Button>
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
          <div className="field"><span>الاسم *</span><input value={jobTitleDraft.name} onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, name: e.target.value }))} /></div>
          <div className="field"><span>الكود</span><input value={jobTitleDraft.code} onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, code: e.target.value }))} /></div>
          <div className="field field-wide"><span>الوصف</span><input value={jobTitleDraft.description} onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, description: e.target.value }))} /></div>
        </div>
        {errors['job-titles'] ? <div className="error-box" style={{ marginTop: 12 }}>{errors['job-titles']}</div> : null}
        <div className="actions compact-actions" style={{ marginTop: 12 }}>
          <Button onClick={onSaveJobTitle} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ المسمى'}</Button>
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
          <div className="field"><span>الاسم *</span><input value={positionDraft.name} onChange={(e) => onPositionDraftChange((current) => ({ ...current, name: e.target.value }))} /></div>
          <div className="field"><span>الكود</span><input value={positionDraft.code} onChange={(e) => onPositionDraftChange((current) => ({ ...current, code: e.target.value }))} /></div>
          <div className="field"><span>القسم</span><select value={positionDraft.departmentId} onChange={(e) => onPositionDraftChange((current) => ({ ...current, departmentId: e.target.value }))}><option value="">اختيار</option>{departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
          <div className="field"><span>المسمى الوظيفي</span><select value={positionDraft.jobTitleId} onChange={(e) => onPositionDraftChange((current) => ({ ...current, jobTitleId: e.target.value }))}><option value="">اختيار</option>{jobTitles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
          <div className="field field-wide"><span>الوصف</span><input value={positionDraft.description} onChange={(e) => onPositionDraftChange((current) => ({ ...current, description: e.target.value }))} /></div>
        </div>
        {errors.positions ? <div className="error-box" style={{ marginTop: 12 }}>{errors.positions}</div> : null}
        <div className="actions compact-actions" style={{ marginTop: 12 }}>
          <Button onClick={onSavePosition} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ المنصب'}</Button>
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
  );
}
