import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { statusLabel, text } from '@/features/hr/pages/settings/hr-settings.helpers';
import { BuildingIcon, BadgeCheckIcon, BriefcaseIcon } from '@/features/hr/components/HrIcons';

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
  const { t } = useTranslation();
  const {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 2-Column Grid for Departments and Job Titles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
        {/* Departments Sub-Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#0f172a', marginBottom: '2px' }}>
            <BuildingIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
            <span>{t('hr.settings.hr_settings_organization_section.s0', "الأقسام")}</span>
          </strong>
          <small style={{ display: 'block', color: '#64748b', marginBottom: '10px', fontSize: '0.75rem' }}>{t('hr.settings.hr_settings_organization_section.s1', "القوائم التي يتم ربط الموظفين بها داخل الهيكل.")}</small>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s2', "الاسم *")}</label><input value={departmentDraft.name} onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, name: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
            <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s3', "الكود")}</label><input value={departmentDraft.code} onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, code: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s4', "الوصف")}</label><input value={departmentDraft.description} onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, description: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
          </div>
          {errors.departments ? <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '6px' }}>{errors.departments}</div> : null}
          <div style={{ marginBottom: '10px' }}>
            <Button onClick={onSaveDepartment} disabled={isBusy} style={{ padding: '3px 10px', fontSize: '0.775rem' }}>{isBusy ? t('hr.settings.hr_settings_organization_section.s5', "جاري الحفظ...") : t('hr.settings.hr_settings_organization_section.s6', "حفظ القسم")}</Button>
          </div>

          {filteredDepartments.length ? (
            <DataTable
              rows={filteredDepartments}
              rowKey={(row) => String(row.id)}
              density="compact"
              columns={[
                { key: 'name', header: t('hr.settings.hr_settings_organization_section.s7', "الاسم"), cell: (row) => text(row.name) },
                { key: 'code', header: t('hr.settings.hr_settings_organization_section.s8', "الكود"), cell: (row) => text(row.code) },
                { key: 'status', header: t('hr.settings.hr_settings_organization_section.s9', "الحالة"), cell: (row) => statusLabel(row.isActive) },
              ]}
            />
          ) : <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_organization_section.s10', "لا توجد أقسام حتى الآن.")}</p>}
        </div>

        {/* Job Titles Sub-Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#0f172a', marginBottom: '2px' }}>
            <BadgeCheckIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
            <span>{t('hr.settings.hr_settings_organization_section.s11', "المسميات الوظيفية")}</span>
          </strong>
          <small style={{ display: 'block', color: '#64748b', marginBottom: '10px', fontSize: '0.75rem' }}>{t('hr.settings.hr_settings_organization_section.s12', "المسميات التي تظهر في بيانات الموظفين والتقارير.")}</small>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s13', "الاسم *")}</label><input value={jobTitleDraft.name} onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, name: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
            <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s14', "الكود")}</label><input value={jobTitleDraft.code} onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, code: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s15', "الوصف")}</label><input value={jobTitleDraft.description} onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, description: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
          </div>
          {errors['job-titles'] ? <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '6px' }}>{errors['job-titles']}</div> : null}
          <div style={{ marginBottom: '10px' }}>
            <Button onClick={onSaveJobTitle} disabled={isBusy} style={{ padding: '3px 10px', fontSize: '0.775rem' }}>{isBusy ? t('hr.settings.hr_settings_organization_section.s16', "جاري الحفظ...") : t('hr.settings.hr_settings_organization_section.s17', "حفظ المسمى")}</Button>
          </div>

          {filteredJobTitles.length ? (
            <DataTable
              rows={filteredJobTitles}
              rowKey={(row) => String(row.id)}
              density="compact"
              columns={[
                { key: 'name', header: t('hr.settings.hr_settings_organization_section.s18', "الاسم"), cell: (row) => text(row.name) },
                { key: 'code', header: t('hr.settings.hr_settings_organization_section.s19', "الكود"), cell: (row) => text(row.code) },
                { key: 'status', header: t('hr.settings.hr_settings_organization_section.s20', "الحالة"), cell: (row) => statusLabel(row.isActive) },
              ]}
            />
          ) : <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_organization_section.s21', "لا توجد مسميات وظيفية حتى الآن.")}</p>}
        </div>
      </div>

      {/* Positions Sub-Card */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#0f172a', marginBottom: '2px' }}>
          <BriefcaseIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
          <span>{t('hr.settings.hr_settings_organization_section.s22', "المناصب / الوظائف التفصيلية")}</span>
        </strong>
        <small style={{ display: 'block', color: '#64748b', marginBottom: '10px', fontSize: '0.75rem' }}>{t('hr.settings.hr_settings_organization_section.s23', "الوظائف التفصيلية المرتبطة بالأقسام والمسميات الوظيفية.")}</small>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
          <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s24', "الاسم *")}</label><input value={positionDraft.name} onChange={(e) => onPositionDraftChange((current) => ({ ...current, name: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
          <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s25', "الكود")}</label><input value={positionDraft.code} onChange={(e) => onPositionDraftChange((current) => ({ ...current, code: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
          <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s26', "القسم")}</label><select value={positionDraft.departmentId} onChange={(e) => onPositionDraftChange((current) => ({ ...current, departmentId: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}><option value="">{t('hr.settings.hr_settings_organization_section.s27', "اختيار...")}</option>{departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
          <div><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s28', "المسمى الوظيفي")}</label><select value={positionDraft.jobTitleId} onChange={(e) => onPositionDraftChange((current) => ({ ...current, jobTitleId: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}><option value="">{t('hr.settings.hr_settings_organization_section.s29', "اختيار...")}</option>{jobTitles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
          <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_organization_section.s30', "الوصف")}</label><input value={positionDraft.description} onChange={(e) => onPositionDraftChange((current) => ({ ...current, description: e.target.value }))} style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} /></div>
        </div>
        {errors.positions ? <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '6px' }}>{errors.positions}</div> : null}
        <div style={{ marginBottom: '10px' }}>
          <Button onClick={onSavePosition} disabled={isBusy} style={{ padding: '3px 10px', fontSize: '0.775rem' }}>{isBusy ? t('hr.settings.hr_settings_organization_section.s31', "جاري الحفظ...") : t('hr.settings.hr_settings_organization_section.s32', "حفظ المنصب")}</Button>
        </div>

        {filteredPositions.length ? (
          <DataTable
            rows={filteredPositions}
            rowKey={(row) => String(row.id)}
            density="compact"
            columns={[
              { key: 'name', header: t('hr.settings.hr_settings_organization_section.s33', "الاسم"), cell: (row) => text(row.name) },
              { key: 'code', header: t('hr.settings.hr_settings_organization_section.s34', "الكود"), cell: (row) => text(row.code) },
              { key: 'department', header: t('hr.settings.hr_settings_organization_section.s35', "القسم"), cell: (row) => text(row.departmentName) },
              { key: 'jobTitle', header: t('hr.settings.hr_settings_organization_section.s36', "المسمى الوظيفي"), cell: (row) => text(row.jobTitleName) },
              { key: 'status', header: t('hr.settings.hr_settings_organization_section.s37', "الحالة"), cell: (row) => statusLabel(row.isActive) },
            ]}
          />
        ) : <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_organization_section.s38', "لا توجد وظائف أو مناصب حتى الآن.")}</p>}
      </div>
    </div>
  );
}
