import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

export function NotFoundPage() {
  return (
    <FormSection title="الصفحة غير موجودة" actions={<span className="nav-pill">404</span>}>
      <div className="muted" style={{ marginBottom: 16 }}>
        المسار المطلوب غير موجود داخل الواجهة الجديدة. ارجع للوحة التحكم أو استخدم القائمة الجانبية.
      </div>
      <Link to="/">
        <Button>العودة للرئيسية</Button>
      </Link>
    </FormSection>
  );
}
