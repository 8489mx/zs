import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { useResetPasswordForm } from '@/features/auth/hooks/useResetPasswordForm';

export function ResetPasswordPage() {
  const { t } = useTranslation();
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
        title={t('auth.reset_password_page.s0', "تم تعيين كلمة المرور")}
        subtitle={t('auth.reset_password_page.s1', "يمكنك الآن الدخول بكلمة المرور الجديدة")}
      >
        <div className="login-success-alert">
          <AppIcons.CheckCircle size={16} />
          <span>{t('auth.reset_password_page.s2', "تم تحديث كلمة المرور وإنهاء كل الجلسات المفتوحة على هذا الحساب.")}</span>
        </div>

        <Link to="/login" className="login-submit-pro-btn auth-link-btn">
          <span>{t('auth.reset_password_page.s3', "الدخول إلى النظام")}</span>
          <AppIcons.ArrowLeft size={16} />
        </Link>
      </AuthScreenShell>
    );
  }

  if (tokenStatus === 'checking') {
    return (
      <AuthScreenShell title={t('auth.reset_password_page.s4', "جاري التحقق من الرابط")} subtitle={t('auth.reset_password_page.s5', "لحظة واحدة من فضلك")}>
        <div className="auth-note" role="status">{t('auth.reset_password_page.s6', "جاري التحقق من صلاحية رابط إعادة التعيين...")}</div>
      </AuthScreenShell>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <AuthScreenShell
        title={t('auth.reset_password_page.s7', "الرابط لم يعد صالحاً")}
        subtitle={t('auth.reset_password_page.s8', "روابط إعادة التعيين قصيرة العمر وتعمل مرة واحدة فقط")}
      >
        <div className="login-error-alert">
          <AppIcons.AlertTriangle size={16} />
          <span>{tokenError}</span>
        </div>

        <Link to="/forgot-password" className="login-submit-pro-btn auth-link-btn">
          <span>{t('auth.reset_password_page.s9', "اطلب رابطاً جديداً")}</span>
          <AppIcons.ArrowLeft size={16} />
        </Link>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      title={t('auth.reset_password_page.s10', "تعيين كلمة مرور جديدة")}
      subtitle={accountLabel ? `الحساب: ${accountLabel.username} — ${accountLabel.businessName}` : t('auth.reset_password_page.s11', "اختر كلمة مرور جديدة لحسابك")}
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
            <label htmlFor="reset-new-password">{t('auth.reset_password_page.s12', "كلمة المرور الجديدة")}</label>
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
              placeholder={t('auth.reset_password_page.s13', "أدخل كلمة المرور الجديدة")}
            />
            <button
              type="button"
              className="login-pwd-toggle-btn"
              aria-label={showPassword ? t('auth.reset_password_page.s14', "إخفاء كلمة المرور") : t('auth.reset_password_page.s15', "إظهار كلمة المرور")}
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
            <label htmlFor="reset-confirm-password">{t('auth.reset_password_page.s16', "تأكيد كلمة المرور")}</label>
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
              placeholder={t('auth.reset_password_page.s17', "أعد إدخال كلمة المرور")}
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
          <span>{isSubmitting ? t('auth.reset_password_page.s18', "جاري الحفظ...") : t('auth.reset_password_page.s19', "حفظ كلمة المرور")}</span>
          {!isSubmitting && <AppIcons.Lock size={16} />}
        </button>
      </div>

      <p className="auth-note">
        {t('auth.reset_password_page.s20', "حفظ كلمة المرور ينهي كل الجلسات المفتوحة على هذا الحساب على كل الأجهزة.")}
      </p>
    </AuthScreenShell>
  );
}
