import { FormSection } from '@/shared/components/form-section';

export function HrLoansWorkflowCard() {
  return (
    <FormSection title="دليل الاستخدام السريع">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }} className="muted">
        <div><strong>1. سجل السلفة:</strong> اختر الموظف والمبلغ وخطة السداد.</div>
        <div><strong>2. اعتمد أو اصرف:</strong> راجع السلف الجديدة قبل صرفها فعليًا.</div>
        <div><strong>3. راجع أقساط الشهر:</strong> تنتقل للمراجعة في المرتبات.</div>
        <div><strong>4. تابع السداد:</strong> سجل السداد اليدوي أو راجع الخصم.</div>
      </div>
    </FormSection>
  );
}

export function HrLoansOperationalNote() {
  return null;
}
