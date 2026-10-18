import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';

export function HrPayrollWorkflowCard() {
  const { t } = useTranslation();
  const steps = [
    ['1. إنشاء/اختيار المسير', 'اختر شهر المرتبات ثم افتح كشف الشهر.'],
    ['2. مراجعة الحضور', 'تأكد من اعتماد أو تخطي الاستثناءات المؤثرة على الأجر.'],
    ['3. مراجعة السلف والإجازات', 'راجع الأقساط والخصومات والإجازات غير المدفوعة.'],
    ['4. الاعتماد والصرف', 'بعد زوال التنبيهات، اعتمد الكشف ثم انتقل للصرف.'],
  ];

  return (
    <FormSection title={t('hr.payroll.hr_payroll_static_cards.s0', "تسلسل المرتبات الشهري")} description={t('hr.payroll.hr_payroll_static_cards.s1', "لا تعتمد المرتبات قبل المرور على نقاط المراجعة الأساسية.")}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map(([title, hint]) => (
          <div key={title}><strong>{title}:</strong> <span className="muted">{hint}</span></div>
        ))}
      </div>
    </FormSection>
  );
}

export function HrPayrollOperationalNote() {
  const { t } = useTranslation();
  return (
    <FormSection title={t('hr.payroll.hr_payroll_static_cards.s2', "ملاحظة تشغيلية")}>
      <p className="muted" style={{ margin: 0 }}>
        {t('hr.payroll.hr_payroll_static_cards.s3', "اعتمد المرتبات بعد مراجعة الحضور، الإجازات، والسلف. أي خصومات مقترحة تظهر للمراجعة ولا تُعامل كقرار نهائي إلا بعد اعتماد المسؤول.")}
      </p>
    </FormSection>
  );
}
