import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';

export function HrLeavesWorkflowCard() {
  const { t } = useTranslation();
  const steps = [
    ['1. راجع قيد المراجعة', 'اعتمد أو ارفض الطلبات الجديدة أولًا.'],
    ['2. راجع غير المدفوعة', 'الإجازات غير المدفوعة تظهر لاحقًا في مراجعة المرتبات.'],
    ['3. استخدم الفلاتر', 'ابحث بالموظف أو نوع الإجازة أو الفترة الزمنية.'],
    ['4. انتقل للمرتبات', 'بعد اعتماد الطلبات، راجع أثرها في صفحة المرتبات.'],
  ];

  return (
    <FormSection title={t('hr.leaves.hr_leaves_static_cards.s0', "تسلسل مراجعة الإجازات")} description={t('hr.leaves.hr_leaves_static_cards.s1', "استخدم الصفحة بهذا الترتيب حتى لا تدخل إجازة مؤثرة على المرتب بدون مراجعة.")}>
      <div className="compact-actions" style={{ flexWrap: 'wrap', gap: '16px' }}>
        {steps.map(([title, hint]) => (
          <span key={title}><strong>{title}:</strong> <span className="muted">{hint}</span></span>
        ))}
      </div>
    </FormSection>
  );
}

export function HrLeavesOperationalNote() {
  const { t } = useTranslation();
  return (
    <FormSection title={t('hr.leaves.hr_leaves_static_cards.s2', "ملاحظة تشغيلية")}>
      <p className="muted" style={{ margin: 0 }}>{t('hr.leaves.hr_leaves_static_cards.s3', "راجع نوع الإجازة وحالة الدفع قبل اعتماد المرتبات.")}</p>
    </FormSection>
  );
}
