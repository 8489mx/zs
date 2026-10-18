import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <FormSection title={t('not_found.not_found_page.s0', "الصفحة غير موجودة")} actions={<span className="nav-pill">404</span>}>
      <div className="muted" style={{ marginBottom: 16 }}>
        {t('not_found.not_found_page.s1', "المسار المطلوب غير موجود داخل الواجهة الجديدة. ارجع للوحة التحكم أو استخدم القائمة الجانبية.")}
      </div>
      <Link to="/">
        <Button>{t('not_found.not_found_page.s2', "العودة للرئيسية")}</Button>
      </Link>
    </FormSection>
  );
}
