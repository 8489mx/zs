import { Card } from '@/shared/ui/card';

export function HrLoansWorkflowCard() {
  const steps = [
    ['1. سجل السلفة', 'اختر الموظف والمبلغ وخطة السداد.'],
    ['2. اعتمد أو اصرف', 'راجع السلف الجديدة قبل صرفها فعليًا.'],
    ['3. راجع أقساط الشهر', 'الأقساط المستحقة تنتقل للمراجعة في المرتبات.'],
    ['4. تابع السداد', 'سجل السداد اليدوي أو راجع الخصم من المرتب.'],
  ];

  return (
    <Card title="تسلسل السلف والخصومات" description="استخدم الصفحة بهذا الترتيب حتى لا تظهر خصومات مفاجئة في المرتبات.">
      <div className="form-grid">
        {steps.map(([title, hint]) => (
          <div key={title} className="field"><strong>{title}</strong><span className="muted">{hint}</span></div>
        ))}
      </div>
    </Card>
  );
}

export function HrLoansOperationalNote() {
  return (
    <Card title="ملاحظة تشغيلية">
      <p className="muted" style={{ margin: 0 }}>الأقساط المستحقة تظهر في مراجعة المرتبات للشهر المحدد. لا تعتمد المرتبات قبل مراجعة السلف النشطة والمستحقة.</p>
    </Card>
  );
}
