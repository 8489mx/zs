import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import { useHrLeaveTypes, useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrSettingsHealthSummaryCard } from '@/features/hr/pages/settings/HrSettingsHealthSummaryCard';
import { HrSettingsOrganizationSection } from '@/features/hr/pages/settings/HrSettingsOrganizationSection';
import {
  HrSettingsAttendanceSection,
  HrSettingsDocumentsSection,
  HrSettingsOperationalNote,
  HrSettingsPayrollSection,
} from '@/features/hr/pages/settings/HrSettingsStaticSections';
import { normalize, paidLabel, stats, statusLabel, text, toId } from '@/features/hr/pages/settings/hr-settings.helpers';

type MasterKind = 'departments' | 'job-titles' | 'positions';
type SettingsSection = 'organization' | 'leaves' | 'documents' | 'attendance' | 'payroll' | 'all';

interface MasterDraft { name: string; code: string; description: string; departmentId: string; jobTitleId: string; }
interface LeaveTypeDraft { name: string; code: string; description: string; isPaid: 'paid' | 'unpaid'; }

const initialDraft: MasterDraft = { name: '', code: '', description: '', departmentId: '', jobTitleId: '' };
const initialLeaveTypeDraft: LeaveTypeDraft = { name: '', code: '', description: '', isPaid: 'paid' };

const SETTINGS_SECTIONS: { key: SettingsSection; label: string }[] = [
  { key: 'organization', label: 'الهيكل الوظيفي' },
  { key: 'leaves', label: 'الإجازات' },
  { key: 'documents', label: 'المستندات' },
  { key: 'attendance', label: 'الحضور' },
  { key: 'payroll', label: 'المرتبات' },
  { key: 'all', label: 'عرض الكل' },
];

function shouldShowSection(activeSection: SettingsSection, section: SettingsSection) { return activeSection === 'all' || activeSection === section; }

export function HrSettingsPage() {
  const navigate = useNavigate();
  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const leaveTypesQuery = useHrLeaveTypes({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const [settingsSearch, setSettingsSearch] = useState('');
  const [activeSection, setActiveSection] = useState<SettingsSection>('organization');
  const [departmentDraft, setDepartmentDraft] = useState<MasterDraft>(initialDraft);
  const [jobTitleDraft, setJobTitleDraft] = useState<MasterDraft>(initialDraft);
  const [positionDraft, setPositionDraft] = useState<MasterDraft>(initialDraft);
  const [leaveTypeDraft, setLeaveTypeDraft] = useState<LeaveTypeDraft>(initialLeaveTypeDraft);
  const [errors, setErrors] = useState<Record<MasterKind | 'leave-types', string>>({ departments: '', 'job-titles': '', positions: '', 'leave-types': '' });

  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);
  const leaveTypes = useMemo(() => leaveTypesQuery.data?.rows || [], [leaveTypesQuery.data?.rows]);
  const searchValue = settingsSearch.trim().toLowerCase();

  const filteredDepartments = useMemo(() => departments.filter((row) => !searchValue || String(row.name || '').toLowerCase().includes(searchValue) || String(row.code || '').toLowerCase().includes(searchValue) || String(row.description || '').toLowerCase().includes(searchValue)), [departments, searchValue]);
  const filteredJobTitles = useMemo(() => jobTitles.filter((row) => !searchValue || String(row.name || '').toLowerCase().includes(searchValue) || String(row.code || '').toLowerCase().includes(searchValue) || String(row.description || '').toLowerCase().includes(searchValue)), [jobTitles, searchValue]);
  const filteredPositions = useMemo(() => positions.filter((row) => !searchValue || String(row.name || '').toLowerCase().includes(searchValue) || String(row.code || '').toLowerCase().includes(searchValue) || String(row.departmentName || '').toLowerCase().includes(searchValue) || String(row.jobTitleName || '').toLowerCase().includes(searchValue) || String(row.description || '').toLowerCase().includes(searchValue)), [positions, searchValue]);
  const filteredLeaveTypes = useMemo(() => leaveTypes.filter((row) => !searchValue || String(row.name || '').toLowerCase().includes(searchValue) || String(row.code || '').toLowerCase().includes(searchValue) || String(row.description || '').toLowerCase().includes(searchValue)), [leaveTypes, searchValue]);

  async function saveKind(kind: MasterKind) {
    const draft = kind === 'departments' ? departmentDraft : kind === 'job-titles' ? jobTitleDraft : positionDraft;
    const name = String(draft.name || '').trim();
    if (!name) { setErrors((current) => ({ ...current, [kind]: 'الاسم مطلوب.' })); return; }
    setErrors((current) => ({ ...current, [kind]: '' }));
    const payload: Record<string, unknown> = { name, code: String(draft.code || '').trim() || undefined, description: String(draft.description || '').trim() || undefined };
    if (kind === 'positions') { payload.departmentId = toId(draft.departmentId); payload.jobTitleId = toId(draft.jobTitleId); }
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
    if (!name) { setErrors((current) => ({ ...current, 'leave-types': 'اسم نوع الإجازة مطلوب.' })); return; }
    setErrors((current) => ({ ...current, 'leave-types': '' }));
    try {
      await mutations.saveLeaveType.mutateAsync({ payload: { name, code: String(leaveTypeDraft.code || '').trim() || undefined, description: String(leaveTypeDraft.description || '').trim() || undefined, isPaid: leaveTypeDraft.isPaid === 'paid', isActive: true } });
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

  const healthSummary = useMemo(() => ({
    departments: departmentStats.total,
    jobTitles: jobTitleStats.total,
    leaveTypes: leaveTypeStats.total,
    documentTypes: 'غير متاح',
    inactiveTotal: departmentStats.inactive + jobTitleStats.inactive + positionStats.inactive + leaveTypeStats.inactive,
    reviewItems: positions.filter((row) => !normalize(row.departmentName) || !normalize(row.jobTitleName)).length,
  }), [departmentStats, jobTitleStats, positionStats, leaveTypeStats, positions]);

  const setupChecklist = [
    { title: 'الأقسام', status: departments.length ? `${departments.length} قسم جاهز للاستخدام.` : 'لم يتم إنشاء أقسام بعد. ابدأ هنا قبل إضافة الموظفين.', ok: departments.length > 0, section: 'organization' as SettingsSection },
    { title: 'المسميات الوظيفية', status: jobTitles.length ? `${jobTitles.length} مسمى وظيفي جاهز.` : 'لم يتم إنشاء مسميات وظيفية بعد.', ok: jobTitles.length > 0, section: 'organization' as SettingsSection },
    { title: 'أنواع الإجازات', status: leaveTypes.length ? `${leaveTypes.length} نوع إجازة جاهز.` : 'أنواع الإجازات مطلوبة قبل تشغيل طلبات الإجازة بشكل صحيح.', ok: leaveTypes.length > 0, section: 'leaves' as SettingsSection },
    { title: 'الموظفون', status: departments.length && jobTitles.length ? 'يمكنك الآن إضافة موظف ببيانات منظمة.' : 'استكمل الأقسام والمسميات أولًا لتقليل الملفات الناقصة.', ok: departments.length > 0 && jobTitles.length > 0, section: 'organization' as SettingsSection, action: () => navigate('/hr/employees/new') },
  ];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader title="إعدادات الموارد البشرية" description="ابدأ من الهيكل الوظيفي وأنواع الإجازات، ثم انتقل لإضافة الموظفين وتشغيل الحضور والمرتبات." actions={<div className="compact-actions"><Button variant="secondary" onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button><Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button></div>} />

      <Card title="ترتيب الإعداد الصحيح" description="هذه هي نقطة البداية قبل إضافة الموظفين وتشغيل الحضور والمرتبات.">
        <div className="form-grid">
          {setupChecklist.map((item) => <div key={item.title} className="field" style={{ alignItems: 'flex-start' }}><strong>{item.ok ? '✓' : '•'} {item.title}</strong><span className="muted">{item.status}</span>{item.action ? <Button type="button" variant="secondary" onClick={item.action} disabled={!item.ok}>إضافة موظف</Button> : <Button type="button" variant="secondary" onClick={() => setActiveSection(item.section)}>فتح الإعداد</Button>}</div>)}
        </div>
      </Card>

      <Card title="أقسام الإعدادات" description="اختر القسم الذي تريد تعديله بدل التمرير داخل صفحة طويلة.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>{SETTINGS_SECTIONS.map((section) => <Button key={section.key} type="button" variant={activeSection === section.key ? 'primary' : 'secondary'} onClick={() => setActiveSection(section.key)}>{section.label}</Button>)}</div>
        <div className="form-grid"><label className="field"><span>بحث داخل الإعدادات</span><input value={settingsSearch} onChange={(event) => setSettingsSearch(event.target.value)} placeholder="ابحث بالاسم أو الكود أو الوصف" /></label></div>
      </Card>

      <HrSettingsHealthSummaryCard healthSummary={healthSummary} />

      <QueryFeedback isLoading={workspace.departments.isLoading || workspace.jobTitles.isLoading || workspace.positions.isLoading || leaveTypesQuery.isLoading} isError={workspace.departments.isError || workspace.jobTitles.isError || workspace.positions.isError || leaveTypesQuery.isError} error={workspace.departments.error || workspace.jobTitles.error || workspace.positions.error || leaveTypesQuery.error} isEmpty={false} loadingText="جاري تحميل إعدادات الموارد البشرية..." errorTitle="تعذر تحميل إعدادات الموارد البشرية">
        {shouldShowSection(activeSection, 'organization') ? <HrSettingsOrganizationSection departmentStatsTotal={departmentStats.total} jobTitleStatsTotal={jobTitleStats.total} positionStatsTotal={positionStats.total} departmentDraft={departmentDraft} jobTitleDraft={jobTitleDraft} positionDraft={positionDraft} errors={{ departments: errors.departments, 'job-titles': errors['job-titles'], positions: errors.positions }} isBusy={isBusy} departments={departments} jobTitles={jobTitles} filteredDepartments={filteredDepartments} filteredJobTitles={filteredJobTitles} filteredPositions={filteredPositions} onDepartmentDraftChange={setDepartmentDraft} onJobTitleDraftChange={setJobTitleDraft} onPositionDraftChange={setPositionDraft} onSaveDepartment={() => { void saveKind('departments'); }} onSaveJobTitle={() => { void saveKind('job-titles'); }} onSavePosition={() => { void saveKind('positions'); }} /> : null}

        {shouldShowSection(activeSection, 'leaves') ? (
          <Card title="الإجازات" description="إدارة أنواع الإجازات المعتمدة. هذا يؤثر على صفحة الإجازات وعلى مراجعة المرتبات إذا كانت الإجازة غير مدفوعة.">
            <div className="form-grid">
              <div className="field"><span>الاسم *</span><input value={leaveTypeDraft.name} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, name: e.target.value }))} /></div>
              <div className="field"><span>الكود</span><input value={leaveTypeDraft.code} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, code: e.target.value }))} /></div>
              <div className="field"><span>النوع</span><select value={leaveTypeDraft.isPaid} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, isPaid: e.target.value as 'paid' | 'unpaid' }))}><option value="paid">مدفوعة</option><option value="unpaid">غير مدفوعة</option></select></div>
              <div className="field field-wide"><span>الوصف</span><input value={leaveTypeDraft.description} onChange={(e) => setLeaveTypeDraft((current) => ({ ...current, description: e.target.value }))} /></div>
            </div>
            {errors['leave-types'] ? <div className="error-box" style={{ marginTop: 12 }}>{errors['leave-types']}</div> : null}
            <div className="actions compact-actions" style={{ marginTop: 12 }}><Button onClick={() => { void saveLeaveType(); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ نوع الإجازة'}</Button><Button type="button" variant="secondary" onClick={() => navigate('/hr/leaves')}>فتح صفحة الإجازات</Button></div>
            {filteredLeaveTypes.length ? <DataTable rows={filteredLeaveTypes} rowKey={(row) => String(row.id)} density="compact" columns={[{ key: 'name', header: 'الاسم', cell: (row) => text(row.name) }, { key: 'code', header: 'الكود', cell: (row) => text(row.code) }, { key: 'paid', header: 'مدفوعة / غير مدفوعة', cell: (row) => paidLabel(row.isPaid) }, { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.isActive) }, { key: 'description', header: 'الوصف', cell: (row) => text(row.description) }]} /> : <p className="muted">لا توجد أنواع إجازات حتى الآن.</p>}
          </Card>
        ) : null}

        {shouldShowSection(activeSection, 'documents') ? <HrSettingsDocumentsSection navigate={navigate} /> : null}
        {shouldShowSection(activeSection, 'attendance') ? <HrSettingsAttendanceSection navigate={navigate} /> : null}
        {shouldShowSection(activeSection, 'payroll') ? <HrSettingsPayrollSection navigate={navigate} /> : null}
        <HrSettingsOperationalNote />
      </QueryFeedback>
    </div>
  );
}
