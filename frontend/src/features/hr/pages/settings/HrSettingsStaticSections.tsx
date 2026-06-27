import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';

type NavigateTo = (path: string) => void;

export function HrSettingsDocumentsSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <FormSection title="المستندات" description="القوائم المتقدمة لأنواع المستندات وإعدادات الصلاحية.">
      <div className="card-soft" style={{ padding: 16 }}>
        <p className="muted" style={{ margin: '0 0 12px 0' }}>إدارة أنواع المستندات وتنبيهات انتهاء الصلاحية.</p>
        <div className="compact-actions"><Button type="button" variant="secondary" onClick={() => navigate('/hr/documents')}>الذهاب لصفحة المستندات</Button></div>
      </div>
    </FormSection>
  );
}

export function HrSettingsAttendanceSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <FormSection title="الحضور والانصراف" description="إعدادات القواعد التشغيلية للحضور.">
      <div className="card-soft" style={{ padding: 16 }}>
        <p className="muted" style={{ margin: '0 0 12px 0' }}>تتضمن إعدادات الحضور، أجهزة البصمة، سياسات التأخير.</p>
        <div className="compact-actions"><Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')}>الذهاب لصفحة الحضور</Button></div>
      </div>
    </FormSection>
  );
}

export function HrSettingsPayrollSection({ navigate }: { navigate: NavigateTo }) {
  return (
    <FormSection title="المرتبات" description="إعدادات مكونات المرتبات الأساسية.">
      <div className="card-soft" style={{ padding: 16 }}>
        <p className="muted" style={{ margin: '0 0 12px 0' }}>إدارة بدلات وخصومات الموظفين وإعدادات المرتبات.</p>
        <div className="compact-actions" style={{ display: 'flex', gap: 8 }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف</Button>
        </div>
      </div>
    </FormSection>
  );
}

export function HrSettingsOperationalNote() {
  return (
    <FormSection title="ملاحظة تشغيلية">
      <p className="muted" style={{ margin: 0 }}>
        نوصي بمراجعة وتحديث هذه الإعدادات دوريًا لضمان توافقها مع الهيكل الإداري للشركة، مما يقلل من الأخطاء أثناء إضافة الموظفين الجدد أو إعداد كشوف المرتبات.
      </p>
    </FormSection>
  );
}
