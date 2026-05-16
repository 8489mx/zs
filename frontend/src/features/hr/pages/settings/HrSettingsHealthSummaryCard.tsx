import { Card } from '@/shared/ui/card';

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
  );
}
