import { Link } from 'react-router-dom';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { SystemStatusBanner } from '@/shared/system/system-status-banner';

const SUPPORT_WHATSAPP_NUMBER = String(import.meta.env?.VITE_SUPPORT_WHATSAPP_NUMBER || '201018017523').trim();
const SUPPORT_WHATSAPP_TEXT = 'مرحبا، احتاج مساعدة في استخدام Z Systems';
const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(SUPPORT_WHATSAPP_TEXT)}`;

export function LoginPage() {
  const { form, onSubmit, submitError, isSubmitting } = useLoginForm();

  return (
    <div className="screen-center">
      <div className="login-stack">
        <SystemStatusBanner />
        <form className="login-card" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="login-logo"><span className="z-mark">Z</span><span className="systems-mark">Systems</span></div>
          <div className="login-header">
            <h1>Z Systems</h1>
            <p className="login-subtitle muted">نظام إدارة وتشغيل الأعمال</p>
          </div>
          <Field label="اسم المستخدم او البريد الالكتروني" error={form.formState.errors.username?.message}>
            <input {...form.register('username')} autoComplete="off" />
          </Field>
          <Field label="كلمة المرور" error={form.formState.errors.password?.message}>
            <input {...form.register('password')} type="password" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          </Field>
          {submitError ? <div className="error-box">{submitError}</div> : null}
          <Button type="submit" className="full-width" disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </Button>
          <div className="login-support">
            <Link className="login-support-link" to="/trial">جرب النظام مجانا 14 يوم</Link>
          </div>
          <div className="login-support login-support-whatsapp-compact">
            <span className="muted small support-label">تحتاج مساعدة؟</span>
            <a className="login-support-link login-support-whatsapp-inline" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">
              <span className="wa-icon-inline" aria-hidden="true">WA</span>
              <span>تواصل مع الدعم الفني</span>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
