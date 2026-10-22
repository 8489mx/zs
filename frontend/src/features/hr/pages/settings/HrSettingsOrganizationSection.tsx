import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { text } from '@/features/hr/pages/settings/hr-settings.helpers';
import { BuildingIcon, BadgeCheckIcon, BriefcaseIcon } from '@/features/hr/components/HrIcons';
import { ChevronDownIcon, ChevronUpIcon } from '@/shared/components/icons/AppIcons';

type MasterDraft = {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  jobTitleId: string;
};

type OptionRow = {
  id: string | number;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  departmentName?: string;
  jobTitleName?: string;
};

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

  // Closed by default as requested by user
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);
  const [isJobTitlesOpen, setIsJobTitlesOpen] = useState(false);
  const [isPositionsOpen, setIsPositionsOpen] = useState(false);

  const renderStatusBadge = (isActive: unknown) => {
    const active = isActive !== false;
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '1px 6px',
          borderRadius: '4px',
          backgroundColor: active ? '#f0fdf4' : '#f8fafc',
          color: active ? '#15803d' : '#64748b',
          border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}`,
          whiteSpace: 'nowrap',
        }}
      >
        {active ? 'نشط' : 'غير نشط'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 2-Column Responsive Grid for Departments and Job Titles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px', alignItems: 'start' }}>
        {/* 1. Departments Sub-Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {/* Card Header (Toggle trigger) */}
          <div
            onClick={() => setIsDepartmentsOpen(!isDepartmentsOpen)}
            style={{
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              background: isDepartmentsOpen ? '#f8fafc' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <BuildingIcon size={16} style={{ color: '#170e5e' }} />
              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_organization_section.s0', "الأقسام")}</strong>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                {filteredDepartments.length} قسم
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#170e5e' }}>
                {isDepartmentsOpen ? 'إخفاء الأقسام' : 'عرض الأقسام'}
              </span>
              {isDepartmentsOpen ? <ChevronUpIcon size={16} color="#170e5e" /> : <ChevronDownIcon size={16} color="#170e5e" />}
            </div>
          </div>

          {/* Collapsible Content */}
          {isDepartmentsOpen && (
            <div style={{ padding: '16px 18px', borderTop: '1px solid #e2e8f0' }}>
              <small style={{ display: 'block', color: '#64748b', marginBottom: '12px', fontSize: '0.75rem' }}>
                {t('hr.settings.hr_settings_organization_section.s1', "القوائم التي يتم ربط الموظفين بها داخل الهيكل.")}
              </small>
              
              {/* Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                    {t('hr.settings.hr_settings_organization_section.s2', "الاسم *")}
                  </label>
                  <input
                    value={departmentDraft.name}
                    onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, name: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                    {t('hr.settings.hr_settings_organization_section.s3', "الكود")}
                  </label>
                  <input
                    value={departmentDraft.code}
                    onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, code: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                    {t('hr.settings.hr_settings_organization_section.s4', "الوصف")}
                  </label>
                  <input
                    value={departmentDraft.description}
                    onChange={(e) => onDepartmentDraftChange((current) => ({ ...current, description: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
              {errors.departments ? <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '6px' }}>{errors.departments}</div> : null}
              <div style={{ marginBottom: '14px' }}>
                <Button onClick={onSaveDepartment} disabled={isBusy} style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                  {isBusy ? t('hr.settings.hr_settings_organization_section.s5', "جاري الحفظ...") : t('hr.settings.hr_settings_organization_section.s6', "حفظ القسم")}
                </Button>
              </div>

              {/* Zero-Scroll Compact Table */}
              {filteredDepartments.length ? (
                <div style={{ width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: '50%', padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                          {t('hr.settings.hr_settings_organization_section.s7', "الاسم")}
                        </th>
                        <th style={{ width: '25%', padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                          {t('hr.settings.hr_settings_organization_section.s8', "الكود")}
                        </th>
                        <th style={{ width: '25%', padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                          {t('hr.settings.hr_settings_organization_section.s9', "الحالة")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDepartments.map((row) => (
                        <tr
                          key={String(row.id)}
                          style={{ borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ width: '50%', padding: '7px 10px', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row.name || '')}>
                            {text(row.name)}
                          </td>
                          <td style={{ width: '25%', padding: '7px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                            {text(row.code)}
                          </td>
                          <td style={{ width: '25%', padding: '7px 8px', textAlign: 'center' }}>
                            {renderStatusBadge(row.isActive)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_organization_section.s10', "لا توجد أقسام حتى الآن.")}</p>
              )}
            </div>
          )}
        </div>

        {/* 2. Job Titles Sub-Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {/* Card Header (Toggle trigger) */}
          <div
            onClick={() => setIsJobTitlesOpen(!isJobTitlesOpen)}
            style={{
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              background: isJobTitlesOpen ? '#f8fafc' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <BadgeCheckIcon size={16} style={{ color: '#170e5e' }} />
              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_organization_section.s11', "المسميات الوظيفية")}</strong>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                {filteredJobTitles.length} مسمى
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#170e5e' }}>
                {isJobTitlesOpen ? 'إخفاء المسميات' : 'عرض المسميات'}
              </span>
              {isJobTitlesOpen ? <ChevronUpIcon size={16} color="#170e5e" /> : <ChevronDownIcon size={16} color="#170e5e" />}
            </div>
          </div>

          {/* Collapsible Content */}
          {isJobTitlesOpen && (
            <div style={{ padding: '16px 18px', borderTop: '1px solid #e2e8f0' }}>
              <small style={{ display: 'block', color: '#64748b', marginBottom: '12px', fontSize: '0.75rem' }}>
                {t('hr.settings.hr_settings_organization_section.s12', "المسميات التي تظهر في بيانات الموظفين والتقارير.")}
              </small>

              {/* Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                    {t('hr.settings.hr_settings_organization_section.s13', "الاسم *")}
                  </label>
                  <input
                    value={jobTitleDraft.name}
                    onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, name: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                    {t('hr.settings.hr_settings_organization_section.s14', "الكود")}
                  </label>
                  <input
                    value={jobTitleDraft.code}
                    onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, code: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                    {t('hr.settings.hr_settings_organization_section.s15', "الوصف")}
                  </label>
                  <input
                    value={jobTitleDraft.description}
                    onChange={(e) => onJobTitleDraftChange((current) => ({ ...current, description: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
              {errors['job-titles'] ? <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '6px' }}>{errors['job-titles']}</div> : null}
              <div style={{ marginBottom: '14px' }}>
                <Button onClick={onSaveJobTitle} disabled={isBusy} style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                  {isBusy ? t('hr.settings.hr_settings_organization_section.s16', "جاري الحفظ...") : t('hr.settings.hr_settings_organization_section.s17', "حفظ المسمى")}
                </Button>
              </div>

              {/* Zero-Scroll Compact Table */}
              {filteredJobTitles.length ? (
                <div style={{ width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: '50%', padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                          {t('hr.settings.hr_settings_organization_section.s18', "الاسم")}
                        </th>
                        <th style={{ width: '25%', padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                          {t('hr.settings.hr_settings_organization_section.s19', "الكود")}
                        </th>
                        <th style={{ width: '25%', padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                          {t('hr.settings.hr_settings_organization_section.s20', "الحالة")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobTitles.map((row) => (
                        <tr
                          key={String(row.id)}
                          style={{ borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ width: '50%', padding: '7px 10px', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row.name || '')}>
                            {text(row.name)}
                          </td>
                          <td style={{ width: '25%', padding: '7px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                            {text(row.code)}
                          </td>
                          <td style={{ width: '25%', padding: '7px 8px', textAlign: 'center' }}>
                            {renderStatusBadge(row.isActive)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_organization_section.s21', "لا توجد مسميات وظيفية حتى الآن.")}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Positions Sub-Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        {/* Card Header (Toggle trigger) */}
        <div
          onClick={() => setIsPositionsOpen(!isPositionsOpen)}
          style={{
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            background: isPositionsOpen ? '#f8fafc' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <BriefcaseIcon size={16} style={{ color: '#170e5e' }} />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_organization_section.s22', "المناصب / الوظائف التفصيلية")}</strong>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {filteredPositions.length} وظيفة
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#170e5e' }}>
              {isPositionsOpen ? 'إخفاء المناصب' : 'عرض المناصب والوظائف'}
            </span>
            {isPositionsOpen ? <ChevronUpIcon size={16} color="#170e5e" /> : <ChevronDownIcon size={16} color="#170e5e" />}
          </div>
        </div>

        {/* Collapsible Content */}
        {isPositionsOpen && (
          <div style={{ padding: '16px 18px', borderTop: '1px solid #e2e8f0' }}>
            <small style={{ display: 'block', color: '#64748b', marginBottom: '12px', fontSize: '0.75rem' }}>
              {t('hr.settings.hr_settings_organization_section.s23', "الوظائف التفصيلية المرتبطة بالأقسام والمسميات الوظيفية.")}
            </small>

            {/* Form */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  {t('hr.settings.hr_settings_organization_section.s24', "الاسم *")}
                </label>
                <input
                  value={positionDraft.name}
                  onChange={(e) => onPositionDraftChange((current) => ({ ...current, name: e.target.value }))}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  {t('hr.settings.hr_settings_organization_section.s25', "الكود")}
                </label>
                <input
                  value={positionDraft.code}
                  onChange={(e) => onPositionDraftChange((current) => ({ ...current, code: e.target.value }))}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  {t('hr.settings.hr_settings_organization_section.s26', "القسم")}
                </label>
                <select
                  value={positionDraft.departmentId}
                  onChange={(e) => onPositionDraftChange((current) => ({ ...current, departmentId: e.target.value }))}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                >
                  <option value="">{t('hr.settings.hr_settings_organization_section.s27', "اختيار...")}</option>
                  {departments.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  {t('hr.settings.hr_settings_organization_section.s28', "المسمى الوظيفي")}
                </label>
                <select
                  value={positionDraft.jobTitleId}
                  onChange={(e) => onPositionDraftChange((current) => ({ ...current, jobTitleId: e.target.value }))}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                >
                  <option value="">{t('hr.settings.hr_settings_organization_section.s29', "اختيار...")}</option>
                  {jobTitles.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  {t('hr.settings.hr_settings_organization_section.s30', "الوصف")}
                </label>
                <input
                  value={positionDraft.description}
                  onChange={(e) => onPositionDraftChange((current) => ({ ...current, description: e.target.value }))}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
            </div>
            {errors.positions ? <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '6px' }}>{errors.positions}</div> : null}
            <div style={{ marginBottom: '14px' }}>
              <Button onClick={onSavePosition} disabled={isBusy} style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                {isBusy ? t('hr.settings.hr_settings_organization_section.s31', "جاري الحفظ...") : t('hr.settings.hr_settings_organization_section.s32', "حفظ المنصب")}
              </Button>
            </div>

            {/* Zero-Scroll Compact Table */}
            {filteredPositions.length ? (
              <div style={{ width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: '30%', padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                        {t('hr.settings.hr_settings_organization_section.s33', "الاسم")}
                      </th>
                      <th style={{ width: '15%', padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                        {t('hr.settings.hr_settings_organization_section.s34', "الكود")}
                      </th>
                      <th style={{ width: '25%', padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                        {t('hr.settings.hr_settings_organization_section.s35', "القسم")}
                      </th>
                      <th style={{ width: '20%', padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                        {t('hr.settings.hr_settings_organization_section.s36', "المسمى الوظيفي")}
                      </th>
                      <th style={{ width: '10%', padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.75rem' }}>
                        {t('hr.settings.hr_settings_organization_section.s37', "الحالة")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map((row) => (
                      <tr
                        key={String(row.id)}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ width: '30%', padding: '7px 10px', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row.name || '')}>
                          {text(row.name)}
                        </td>
                        <td style={{ width: '15%', padding: '7px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                          {text(row.code)}
                        </td>
                        <td style={{ width: '25%', padding: '7px 8px', color: '#475569', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {text(row.departmentName)}
                        </td>
                        <td style={{ width: '20%', padding: '7px 8px', color: '#475569', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {text(row.jobTitleName)}
                        </td>
                        <td style={{ width: '10%', padding: '7px 8px', textAlign: 'center' }}>
                          {renderStatusBadge(row.isActive)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_organization_section.s38', "لا توجد وظائف أو مناصب حتى الآن.")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
