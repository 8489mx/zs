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
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <span>إجمالي الأقسام</span>
          <strong>{healthSummary.departments}</strong>
        </div>
        <div className="stat-card">
          <span>المسميات الوظيفية</span>
          <strong>{healthSummary.jobTitles}</strong>
        </div>
        <div className="stat-card">
          <span>أنواع الإجازات</span>
          <strong>{healthSummary.leaveTypes}</strong>
        </div>
      </div>
    </FormSection>
  );
}
