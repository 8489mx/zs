import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';

const plannedModules = [
  'الموظفين',
  'الحضور والانصراف',
  'الإجازات',
  'السلف والخصومات',
  'المرتبات',
  'المستندات',
  'العُهد',
  'الإعدادات',
];

export function HrComingSoonPage() {
  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الموارد البشرية"
        description="سيتم إعادة بناء موديول الموارد البشرية بشكل منظم صفحة صفحة."
      />

      <Card
        title="إعادة بناء واجهة الموارد البشرية"
        description="تم إيقاف النسخة السابقة مؤقتًا، وجارٍ تنفيذ نسخة جديدة معتمدة بشكل تدريجي."
      >
        <p className="muted" style={{ marginTop: 0 }}>
          سيتم التنفيذ على مراحل واضحة، مع بناء كل صفحة بشكل مستقل قبل الانتقال للمرحلة التالية.
        </p>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
          {plannedModules.join('، ')}
        </div>
      </Card>
    </div>
  );
}
