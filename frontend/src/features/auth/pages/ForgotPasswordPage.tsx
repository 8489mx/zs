import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { useForgotPasswordForm } from '@/features/auth/hooks/useForgotPasswordForm';

export function ForgotPasswordPage() {
  const { form, onSubmit, submitError, isSubmitting, sentToEmail } = useForgotPasswordForm();
  const [showCompanyCodeInput, setShowCompanyCodeInput] = useState(false);

  if (sentToEmail) {
    return (
      <AuthScreenShell
        title="تحقق من بريدك الإلكتروني"
        subtitle="إذا كان هذا البريد مسجَّلاً لدينا فقد وصله رابط إعادة التعيين الآن"
      >
        <div className="login-success-alert">
          <AppIcons.CheckCircle size={16} />
          <span>تم إرسال رابط إعادة التعيين إلى <strong dir="ltr">{sentToEmail}</strong> إن كان مرتبطاً بحساب.</span>
        </div>

        <ul className="auth-hint-list">
          <li>الرابط صالح لمدة قصيرة ويعمل مرة واحدة فقط.</li>
          <li>راجع مجلد البريد العشوائي (Spam) إن لم تجد الرسالة خلال دقائق.</li>
          <li>رابط الاستعادة يُرسل إلى البريد المسجَّل لمالك المنشأة. المستخدمون الآخرون يعيد لهم مدير المنشأة كلمة المرور من شاشة المستخدمين.</li>
        </ul>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      title="نسيت كلمة المرور؟"
      subtitle="أدخل البريد الإلكتروني المسجَّل لمالك المنشأة وسنرسل لك رابط إعادة التعيين"
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
            <label htmlFor="forgot-email">البريد الإلكتروني</label>
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
              <label htmlFor="forgot-company-code">كود المنشأة (اختياري)</label>
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
                placeholder="مثال: my-store"
                className="login-input-pro"
              />
            </div>
            <span className="auth-field-hint">استخدمه فقط إذا كان نفس البريد مرتبطاً بأكثر من منشأة.</span>
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <button
              type="button"
              onClick={() => setShowCompanyCodeInput(true)}
              className="auth-inline-link-btn"
            >
              + تحديد كود منشأة معين
            </button>
          </div>
        )}

        <button
          type="button"
          className="login-submit-pro-btn"
          disabled={isSubmitting}
          onClick={form.handleSubmit(onSubmit)}
        >
          <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}</span>
          {!isSubmitting && <AppIcons.Mail size={16} />}
        </button>
      </div>

      <p className="auth-note">
        تذكرت كلمة المرور؟ <Link to="/login" className="forgot-password-link">ارجع لتسجيل الدخول</Link>
      </p>
    </AuthScreenShell>
  );
}
