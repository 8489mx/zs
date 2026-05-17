import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

type NavigateTo = (path: string) => void;

export function HrSettingsDocumentsSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <Card title="المستندات" description="القوائم المتقدمة لأنواع المستندات وإعدادات الصلاحية.">
      <p className="muted" style={{ margin: 0 }}>
        يمكن متابعة المستندات من صفحة مستندات الموظفين.
      </p>
      <div className="actions compact-actions" style={{ marginTop: 12 }}>
        <Button type="button" variant="secondary" onClick={() => navigate('/hr/documents')}>فتح المستندات</Button>
      </div>
    </Card>
  );
}

export function HrSettingsAttendanceSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <Card title="الحضور والانصراف" description="إعدادات القواعد التشغيلية للحضور.">
      <p className="muted" style={{ margin: 0 }}>
        يمكن ضبط مواعيد الدوام لكل موظف من صفحة إضافة أو تعديل الموظف.
      </p>
      <div className="actions compact-actions" style={{ marginTop: 12 }}>
        <Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>
      </div>
    </Card>
  );
}

export function HrSettingsPayrollSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <Card title="المرتبات" description="إعدادات مكونات المرتبات الأساسية.">
      <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
        لا توجد إعدادات متقدمة للبدلات والخصومات ضمن صفحة الإعدادات الحالية.
      </p>
      <p className="muted" style={{ margin: 0 }}>
        إعدادات الضرائب والتأمينات تحتاج ضبطًا مستقلًا ومراجعة محاسب قبل الاعتماد.
      </p>
      <div className="actions compact-actions" style={{ marginTop: 12 }}>
        <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف</Button>
      </div>
    </Card>
  );
}

export function HrSettingsOperationalNote() {
  return (
    <Card title="ملاحظة تشغيلية">
      <p className="muted" style={{ margin: 0 }}>
        أضف البيانات الأساسية أولًا حتى تظهر في صفحات الموظفين والحضور والإجازات. صفحة إضافة الموظف تحتوي أيضًا على إضافة سريعة للقسم والمسمى عند الحاجة.
      </p>
    </Card>
  );
}
