import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { SystemStatusBanner } from '@/components/system/SystemStatusBanner';

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
            <a className="login-support-link" href="https://wa.me/201018017523" target="_blank" rel="noreferrer">
              الدعم الفني عبر واتساب
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
