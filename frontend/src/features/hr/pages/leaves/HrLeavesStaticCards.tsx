import { FormSection } from '@/shared/components/form-section';

export function HrLeavesWorkflowCard() {
  return (
    <FormSection title="دليل الاستخدام السريع">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }} className="muted">
        <div><strong>1. راجع قيد المراجعة:</strong> اعتمد أو ارفض.</div>
        <div><strong>2. راجع غير المدفوعة:</strong> تؤثر على المرتبات.</div>
        <div><strong>3. استخدم الفلاتر:</strong> للبحث والفرز.</div>
        <div><strong>4. انتقل للمرتبات:</strong> لمراجعة الأثر النهائي.</div>
      </div>
    </FormSection>
  );
}

export function HrLeavesOperationalNote() {
  return null;
}
