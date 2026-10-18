import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { useForgotPasswordForm } from '@/features/auth/hooks/useForgotPasswordForm';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { form, onSubmit, submitError, isSubmitting, sentToEmail } = useForgotPasswordForm();
  const [showCompanyCodeInput, setShowCompanyCodeInput] = useState(false);

  if (sentToEmail) {
    return (
      <AuthScreenShell
        title={t('auth.forgot_password_page.s0', "تحقق من بريدك الإلكتروني")}
        subtitle={t('auth.forgot_password_page.s1', "إذا كان هذا البريد مسجَّلاً لدينا فقد وصله رابط إعادة التعيين الآن")}
      >
        <div className="login-success-alert">
          <AppIcons.CheckCircle size={16} />
          <span>{t('auth.forgot_password_page.s2', "تم إرسال رابط إعادة التعيين إلى")} <strong dir="ltr">{sentToEmail}</strong> {t('auth.forgot_password_page.s3', "إن كان مرتبطاً بحساب.")}</span>
        </div>

        <ul className="auth-hint-list">
          <li>{t('auth.forgot_password_page.s4', "الرابط صالح لمدة قصيرة ويعمل مرة واحدة فقط.")}</li>
          <li>{t('auth.forgot_password_page.s5', "راجع مجلد البريد العشوائي (Spam) إن لم تجد الرسالة خلال دقائق.")}</li>
          <li>{t('auth.forgot_password_page.s6', "رابط الاستعادة يُرسل إلى البريد المسجَّل لمالك المنشأة. المستخدمون الآخرون يعيد لهم مدير المنشأة كلمة المرور من شاشة المستخدمين.")}</li>
        </ul>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      title={t('auth.forgot_password_page.s7', "نسيت كلمة المرور؟")}
      subtitle={t('auth.forgot_password_page.s8', "أدخل البريد الإلكتروني المسجَّل لمالك المنشأة وسنرسل لك رابط إعادة التعيين")}
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
            <label htmlFor="forgot-email">{t('auth.forgot_password_page.s9', "البريد الإلكتروني")}</label>
          </div>
          <div className="login-input-pro-wrap">
            <input
              id="forgot-email"
              {...form.register('email')}
              type="email"
              dir="ltr"
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="owner@example.com"
              className="login-input-pro"
            />
          </div>
          {form.formState.errors.email?.message && (
            <span className="login-field-error-text">{form.formState.errors.email?.message}</span>
          )}
        </div>

        {showCompanyCodeInput ? (
          <div className="login-field-group">
            <div className="login-field-label">
              <label htmlFor="forgot-company-code">{t('auth.forgot_password_page.s10', "كود المنشأة (اختياري)")}</label>
            </div>
            <div className="login-input-pro-wrap">
              <input
                id="forgot-company-code"
                {...form.register('companyCode')}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={t('auth.forgot_password_page.s11', "مثال: enterprise-id أو كود المنشأة")}
                className="login-input-pro"
              />
            </div>
            <span className="auth-field-hint">{t('auth.forgot_password_page.s12', "استخدمه فقط إذا كان نفس البريد مرتبطاً بأكثر من منشأة.")}</span>
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <button
              type="button"
              onClick={() => setShowCompanyCodeInput(true)}
              className="auth-inline-link-btn"
            >
              {t('auth.forgot_password_page.s13', "+ تحديد كود منشأة معين")}
            </button>
          </div>
        )}

        <button
          type="button"
          className="login-submit-pro-btn"
          disabled={isSubmitting}
          onClick={form.handleSubmit(onSubmit)}
        >
          <span>{isSubmitting ? t('auth.forgot_password_page.s14', "جاري الإرسال...") : t('auth.forgot_password_page.s15', "إرسال رابط إعادة التعيين")}</span>
          {!isSubmitting && <AppIcons.Mail size={16} />}
        </button>
      </div>

      <p className="auth-note">
        {t('auth.forgot_password_page.s16', "تذكرت كلمة المرور؟")} <Link to="/login" className="forgot-password-link">{t('auth.forgot_password_page.s17', "ارجع لتسجيل الدخول")}</Link>
      </p>
    </AuthScreenShell>
  );
}
