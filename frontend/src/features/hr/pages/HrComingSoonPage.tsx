import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

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
  const navigate = useNavigate();

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الموارد البشرية"
        description="سيتم إعادة بناء موديول الموارد البشرية بشكل منظم صفحة صفحة."
        actions={(
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>الموظفين</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/settings')}>الإعدادات</Button>
          </div>
        )}
      />

      <Card
        title="إعادة بناء واجهة الموارد البشرية"
        description="تم إيقاف النسخة السابقة مؤقتًا، وجارٍ تنفيذ نسخة جديدة معتمدة بشكل تدريجي."
      >
        <p className="muted" style={{ marginTop: 0 }}>
          يتم التنفيذ على مراحل واضحة، مع بناء كل صفحة بشكل مستقل قبل الانتقال للمرحلة التالية.
        </p>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
          {plannedModules.join('، ')}
        </div>
      </Card>
    </div>
  );
}
