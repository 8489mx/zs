import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { SystemStatusBanner } from '@/shared/system/system-status-banner';

const SUPPORT_URL = (import.meta.env?.VITE_SUPPORT_URL || '').trim();
const SUPPORT_LABEL = (import.meta.env?.VITE_SUPPORT_LABEL || 'الدعم الفني').trim() || 'الدعم الفني';

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
          <Field label="اسم المستخدم" error={form.formState.errors.username?.message}>
            <input {...form.register('username')} autoComplete="username" />
          </Field>
          <Field label="كلمة المرور" error={form.formState.errors.password?.message}>
            <input {...form.register('password')} type="password" autoComplete="current-password" />
          </Field>
          {submitError ? <div className="error-box">{submitError}</div> : null}
          <Button type="submit" className="full-width" disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </Button>
          <div className="login-support">
            <span className="muted small">بحاجة إلى مساعدة؟</span>
            {SUPPORT_URL ? (
              <a className="login-support-link" href={SUPPORT_URL} target="_blank" rel="noreferrer">
                {SUPPORT_LABEL}
              </a>
            ) : (
              <span className="muted small">راجع مسؤول النظام أو قناة الدعم المخصّصة لهذا العميل.</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
