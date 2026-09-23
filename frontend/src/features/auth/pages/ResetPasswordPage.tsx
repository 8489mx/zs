import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { useResetPasswordForm } from '@/features/auth/hooks/useResetPasswordForm';

export function ResetPasswordPage() {
  const {
    form,
    onSubmit,
    tokenStatus,
    tokenError,
    accountLabel,
    submitError,
    isSubmitting,
    isDone,
  } = useResetPasswordForm();
  const [showPassword, setShowPassword] = useState(false);

  if (isDone) {
    return (
      <AuthScreenShell
        title="تم تعيين كلمة المرور"
        subtitle="يمكنك الآن الدخول بكلمة المرور الجديدة"
      >
        <div className="login-success-alert">
          <AppIcons.CheckCircle size={16} />
          <span>تم تحديث كلمة المرور وإنهاء كل الجلسات المفتوحة على هذا الحساب.</span>
        </div>

        <Link to="/login" className="login-submit-pro-btn auth-link-btn">
          <span>الدخول إلى النظام</span>
          <AppIcons.ArrowLeft size={16} />
        </Link>
      </AuthScreenShell>
    );
  }

  if (tokenStatus === 'checking') {
    return (
      <AuthScreenShell title="جاري التحقق من الرابط" subtitle="لحظة واحدة من فضلك">
        <div className="auth-note" role="status">جاري التحقق من صلاحية رابط إعادة التعيين...</div>
      </AuthScreenShell>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <AuthScreenShell
        title="الرابط لم يعد صالحاً"
        subtitle="روابط إعادة التعيين قصيرة العمر وتعمل مرة واحدة فقط"
      >
        <div className="login-error-alert">
          <AppIcons.AlertTriangle size={16} />
          <span>{tokenError}</span>
        </div>

        <Link to="/forgot-password" className="login-submit-pro-btn auth-link-btn">
          <span>اطلب رابطاً جديداً</span>
          <AppIcons.ArrowLeft size={16} />
        </Link>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      title="تعيين كلمة مرور جديدة"
      subtitle={accountLabel ? `الحساب: ${accountLabel.username} — ${accountLabel.businessName}` : 'اختر كلمة مرور جديدة لحسابك'}
    >
      {submitError && (
        <div className="login-error-alert">
          <AppIcons.AlertTriangle size={16} />
          <span>{submitError}</span>
        </div>
      )}

      <div
        className="login-form-pro"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
          }
        }}
      >
        <div className="login-field-group">
          <div className="login-field-label">
            <label htmlFor="reset-new-password">كلمة المرور الجديدة</label>
          </div>
          <div className="login-input-pro-wrap">
            <input
              id="reset-new-password"
              {...form.register('newPassword')}
              type={showPassword ? 'text' : 'password'}
              className="login-input-pro has-toggle"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="أدخل كلمة المرور الجديدة"
            />
            <button
              type="button"
              className="login-pwd-toggle-btn"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              onClick={() => setShowPassword(!showPassword)}
            >
              <AppIcons.Eye size={16} />
            </button>
          </div>
          {form.formState.errors.newPassword?.message && (
            <span className="login-field-error-text">{form.formState.errors.newPassword?.message}</span>
          )}
        </div>

        <div className="login-field-group">
          <div className="login-field-label">
            <label htmlFor="reset-confirm-password">تأكيد كلمة المرور</label>
          </div>
          <div className="login-input-pro-wrap">
            <input
              id="reset-confirm-password"
              {...form.register('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              className="login-input-pro"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>
          {form.formState.errors.confirmPassword?.message && (
            <span className="login-field-error-text">{form.formState.errors.confirmPassword?.message}</span>
          )}
        </div>

        <button
          type="button"
          className="login-submit-pro-btn"
          disabled={isSubmitting}
          onClick={form.handleSubmit(onSubmit)}
        >
          <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</span>
          {!isSubmitting && <AppIcons.Lock size={16} />}
        </button>
      </div>

      <p className="auth-note">
        حفظ كلمة المرور ينهي كل الجلسات المفتوحة على هذا الحساب على كل الأجهزة.
      </p>
    </AuthScreenShell>
  );
}
