import { FormSection } from '@/shared/components/form-section';

export function HrLeavesWorkflowCard() {
  const steps = [
    ['1. راجع قيد المراجعة', 'اعتمد أو ارفض الطلبات الجديدة أولًا.'],
    ['2. راجع غير المدفوعة', 'الإجازات غير المدفوعة تظهر لاحقًا في مراجعة المرتبات.'],
    ['3. استخدم الفلاتر', 'ابحث بالموظف أو نوع الإجازة أو الفترة الزمنية.'],
    ['4. انتقل للمرتبات', 'بعد اعتماد الطلبات، راجع أثرها في صفحة المرتبات.'],
  ];

  return (
    <FormSection title="تسلسل مراجعة الإجازات" description="استخدم الصفحة بهذا الترتيب حتى لا تدخل إجازة مؤثرة على المرتب بدون مراجعة.">
      <div className="compact-actions" style={{ flexWrap: 'wrap', gap: '16px' }}>
        {steps.map(([title, hint]) => (
          <span key={title}><strong>{title}:</strong> <span className="muted">{hint}</span></span>
        ))}
      </div>
    </FormSection>
  );
}

export function HrLeavesOperationalNote() {
  return (
    <FormSection title="ملاحظة تشغيلية">
      <p className="muted" style={{ margin: 0 }}>راجع نوع الإجازة وحالة الدفع قبل اعتماد المرتبات.</p>
    </FormSection>
  );
}
