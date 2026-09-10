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


function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

export function LoginPage() {
  const {
    form,
    onSubmit,
    submitError,
    isSubmitting,
    disambiguationTenants,
    setDisambiguationTenants,
    handleSelectTenant,
    rememberedCompanyCode,
    rememberedCompanyName,
    handleClearRememberedTenant,
    showCompanyCodeInput,
    setShowCompanyCodeInput,
    isDesktop,
  } = useLoginForm();
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
            <img src="./brand/z-erp-approved-icon.png" alt="Z Systems" className="login-brand-logo-img" />
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

            <div className="login-form-pro" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); form.handleSubmit(onSubmit)(); } }}>
              {!isDesktop && rememberedCompanyCode && !showCompanyCodeInput ? (() => {
                const isRememberedUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rememberedCompanyCode);
                const rememberedTenantLabel = rememberedCompanyName
                  ? (isRememberedUuid || rememberedCompanyName === rememberedCompanyCode
                      ? rememberedCompanyName
                      : `${rememberedCompanyName} (${rememberedCompanyCode})`)
                  : (isRememberedUuid ? 'منشأتك السابقة' : rememberedCompanyCode);

                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      marginBottom: '14px',
                      fontSize: '12.5px',
                      color: '#334155',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BuildingIcon />
                      <span>تسجيل الدخول لمنشأة: <strong style={{ color: '#0f172a' }}>{rememberedTenantLabel}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRememberedTenant}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#170e5e',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '0',
                      }}
                    >
                      تغيير
                    </button>
                  </div>
                );
              })() : null}

              {!isDesktop && showCompanyCodeInput ? (
                <div className="login-field-group">
                  <div className="login-field-label flex-between">
                    <label htmlFor="login-companyCode">كود أو معرف المنشأة (اختياري)</label>
                    {rememberedCompanyCode ? (
                      <button
                        type="button"
                        onClick={() => setShowCompanyCodeInput(false)}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11.5px', cursor: 'pointer' }}
                      >
                        إلغاء
                      </button>
                    ) : null}
                  </div>
                  <div className="login-input-pro-wrap">
                    <input
                      id="login-companyCode"
                      {...form.register('companyCode')}
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder="مثال: my-store أو المعرف الخاص بالمنشأة"
                      className="login-input-pro"
                    />
                  </div>
                </div>
              ) : null}

              <div className="login-field-group">
                <div className="login-field-label">
                  <label htmlFor="login-username">رقم الهاتف المحمول أو اسم المستخدم</label>
                </div>
                <div className="login-input-pro-wrap">
                  <input 
                    id="login-username"
                    {...form.register('username')} 
                    type="text"
                    autoComplete="off" 
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    autoCorrect="off" 
                    autoCapitalize="off" 
                    spellCheck={false}
                    placeholder="مثال: 01012345678 أو اسم المستخدم" 
                    className="login-input-pro"
                  />
                </div>
                {form.formState.errors.username?.message && (
                  <span className="login-field-error-text">{form.formState.errors.username?.message}</span>
                )}
              </div>

              <div className="login-field-group">
                <div className="login-field-label flex-between">
                  <label htmlFor="login-password">كلمة المرور</label>
                  <a href="#" className="forgot-password-link" tabIndex={-1} onClick={(e) => e.preventDefault()}>نسيت كلمة المرور؟</a>
                </div>
                <div className="login-input-pro-wrap">
                  <input 
                    id="login-password"
                    {...form.register('password')} 
                    type="text"
                    className={`login-input-pro has-toggle ${!showPassword ? 'secure-password-field' : ''}`}
                    autoComplete="new-password" 
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    autoCorrect="off" 
                    autoCapitalize="off" 
                    spellCheck={false}
                    placeholder="أدخل كلمة المرور الخاصة بك" 
                  />
                  <button type="button" className="login-pwd-toggle-btn" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {form.formState.errors.password?.message && (
                  <span className="login-field-error-text">{form.formState.errors.password?.message}</span>
                )}
              </div>

              {!isDesktop && !rememberedCompanyCode && !showCompanyCodeInput ? (
                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <button
                    type="button"
                    onClick={() => setShowCompanyCodeInput(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0',
                    }}
                  >
                    + تحديد كود منشأة معين
                  </button>
                </div>
              ) : null}

              <button type="button" className="login-submit-pro-btn" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
                <span>{isSubmitting ? 'جاري التحقق والاتصال...' : 'تسجيل الدخول'}</span>
                {!isSubmitting && <ArrowLeftIcon />}
              </button>
            </div>

            {disambiguationTenants && disambiguationTenants.length > 0 && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '16px',
                }}
                dir="rtl"
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    maxWidth: '480px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#ede9fe',
                          color: '#170e5e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BuildingIcon />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                          اختر المنشأة للمتابعة
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                          بيانات الدخول مسجلة لدى أكثر من منشأة
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '8px 0 0', lineHeight: 1.5 }}>
                      يرجى اختيار المنشأة التي ترغب في تسجيل الدخول إليها ومتابعة العمل:
                    </p>
                  </div>

                  <div style={{ padding: '16px 24px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {disambiguationTenants.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelectTenant(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          textAlign: 'right',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#170e5e';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#f1f5f9',
                              color: '#170e5e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <BuildingIcon />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>كود المنشأة: {t.slug || t.id}</div>
                          </div>
                        </div>
                        <div style={{ color: '#94a3b8' }}>
                          <ChevronLeftIcon />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setDisambiguationTenants(null)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      إلغاء والعودة
                    </button>
                  </div>
                </div>
              </div>
            )}


            <div className="login-signup-link">
              <p>ليس لديك حساب؟ <Link to="/trial">ابدأ تجربة مجانية الآن</Link></p>
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                <Link
                  to="/hub"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#170e5e',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span>دليل بوابات الموظفين والمناديب (Launchpad)</span>
                  <span>←</span>
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
