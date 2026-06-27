import { FormSection } from '@/shared/components/form-section';

type Props = {
  healthSummary: {
    departments: number;
    jobTitles: number;
    leaveTypes: number;
    documentTypes: string;
    inactiveTotal: number;
    reviewItems: number;
  };
};

export function HrSettingsHealthSummaryCard({ healthSummary }: Props) {
  return (
    <FormSection title="ملخص صحة الإعدادات">
      <div className="hr-stats-grid">
        <div className="hr-stat-box">
          <div className="hr-stat-value">{healthSummary.departments}</div>
          <div className="hr-stat-label">إجمالي الأقسام</div>
        </div>
        <div className="hr-stat-box">
          <div className="hr-stat-value">{healthSummary.jobTitles}</div>
          <div className="hr-stat-label">المسميات الوظيفية</div>
        </div>
        <div className="hr-stat-box">
          <div className="hr-stat-value">{healthSummary.leaveTypes}</div>
          <div className="hr-stat-label">أنواع الإجازات</div>
        </div>
      </div>
    </FormSection>
  );
}
