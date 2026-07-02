import { FormSection } from '@/shared/components/form-section';

export function HrPayrollWorkflowCard() {
  return (
    <FormSection title="دليل الاستخدام السريع">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }} className="muted">
        <div><strong>1. إنشاء/اختيار المسير:</strong> اختر شهر المرتبات ثم افتح كشف الشهر.</div>
        <div><strong>2. مراجعة الحضور:</strong> تأكد من الاستثناءات المؤثرة على الأجر.</div>
        <div><strong>3. مراجعة السلف والإجازات:</strong> راجع الأقساط والخصومات.</div>
        <div><strong>4. الاعتماد والصرف:</strong> راجع التنبيهات واعتمد الكشف.</div>
      </div>
    </FormSection>
  );
}

export function HrPayrollOperationalNote() {
  return null;
}
