import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { SystemStatusBanner } from '@/shared/system/system-status-banner';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4M3 5h4M19 3v4M17 5h4"/>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  );
}

export function LoginPage() {
  const { form, onSubmit, submitError, isSubmitting } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);

  const features = [
    "متابعة المبيعات والأرباح والتقارير لحظة بلحظة",
    "جرد ذكي للمخازن ومستودعات الفروع المتعددة",
    "توافق تام مع الفاتورة الإلكترونية والربط الزكوي",
    "حماية فائقة من السرقات وحساب تلقائي لصندوق الكاشير"
  ];

  return (
    <div className="login-screen-split" dir="rtl">
      {/* Background Pattern */}
      <div className="login-pattern-overlay"></div>

      <div className="login-split-container">
        
        {/* Right Side: Branding */}
        <div className="login-branding-side">
          <div className="login-brand-logo-wrap">
            <img src="/brand/z-erp-approved-icon.png" alt="Z Systems" className="login-brand-logo-img" />
            <span className="login-brand-name">Z Systems <span className="text-pro">Pro</span></span>
          </div>

          <h1 className="login-brand-title">
            <span className="title-part1">مرحباً بك مجدداً في نظام</span>
            <span className="title-part2">Z ERP</span>
          </h1>

          <p className="login-brand-subtitle">
            المنظومة المالية والإدارية الأسهل والأسرع لمتابعة فروعك، مبيعاتك، ومخازنك من أي مكان في العالم.
          </p>

          <div className="login-features-list">
            {features.map((feature, idx) => (
              <div key={idx} className="login-feature-item">
                <div className="login-feature-icon">
                  <CheckIcon />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="login-brand-footer">
            <span className="line"></span>
            نظام مالي وإداري معتمد وسحابي بالكامل
            <span className="line"></span>
          </div>
        </div>

        {/* Left Side: Form Box */}
        <div className="login-form-side">
          <SystemStatusBanner />
          <div className="login-card-pro">
            <div className="login-card-header">
              <h2>تسجيل الدخول</h2>
              <p>أدخل بيانات حسابك للوصول للوحة التحكم والـ POS</p>
            </div>

            {submitError && (
              <div className="login-error-alert">
                <ShieldAlertIcon />
                <span>{submitError}</span>
              </div>
            )}

            <form className="login-form-pro" onSubmit={form.handleSubmit(onSubmit)}>
              
              <div className="login-field-group">
                <div className="login-field-label">
                  <label>البريد الإلكتروني</label>
                </div>
                <div className="login-input-pro-wrap">
                  <span className="login-input-pro-icon"><MailIcon /></span>
                  <input 
                    {...form.register('username')} 
                    autoComplete="off" 
                    placeholder="your@email.com" 
                    className="login-input-pro"
                  />
                </div>
                {form.formState.errors.username?.message && (
                  <span className="login-field-error-text">{form.formState.errors.username?.message}</span>
                )}
              </div>

              <div className="login-field-group">
                <div className="login-field-label flex-between">
                  <label>كلمة المرور</label>
                  <a href="#" className="forgot-password-link" onClick={(e) => e.preventDefault()}>نسيت كلمة المرور؟</a>
                </div>
                <div className="login-input-pro-wrap">
                  <span className="login-input-pro-icon"><LockIcon /></span>
                  <input 
                    {...form.register('password')} 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="new-password" 
                    autoCorrect="off" 
                    autoCapitalize="off" 
                    spellCheck={false}
                    placeholder="أدخل كلمة المرور الخاصة بك" 
                    className="login-input-pro"
                  />
                  <button type="button" className="login-pwd-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {form.formState.errors.password?.message && (
                  <span className="login-field-error-text">{form.formState.errors.password?.message}</span>
                )}
              </div>

              <div className="login-remember-me">
                <label className="checkbox-label">
                  <input type="checkbox" className="custom-checkbox" defaultChecked />
                  <span>تذكرني في المرة القادمة</span>
                </label>
              </div>

              <button type="submit" disabled={isSubmitting} className="login-submit-pro-btn">
                <span>{isSubmitting ? 'جاري التحقق والاتصال...' : 'تسجيل الدخول'}</span>
                {!isSubmitting && <ArrowLeftIcon />}
              </button>
            </form>

            {/* 
            <div className="login-demo-widget">
              <div className="demo-sparkles"><SparklesIcon /></div>
              <div className="demo-widget-content">
                <KeyIcon />
                <p>
                  لتجربة النظام بشكل سريع، استخدم بيانات الحساب التجريبي: <br/>
                  <span className="demo-badge">demo@zsystems.pro</span> / <span className="demo-badge">demo1234</span>
                </p>
                <button type="button" className="demo-fill-btn" onClick={() => {
                  form.setValue('username', 'demo@zsystems.pro');
                  form.setValue('password', 'demo1234');
                }}>
                  تعبئة بيانات الحساب التجريبي بنقرة واحدة
                </button>
              </div>
            </div>
            */}

            <div className="login-signup-link">
              <p>ليس لديك حساب؟ <Link to="/trial">ابدأ تجربة مجانية الآن</Link></p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
