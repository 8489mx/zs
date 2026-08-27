import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/lib/http';
import { publicTrialApi, type PublicTrialSignupResponse } from '@/features/public-trial/api/public-trial.api';

const formSchema = z.object({
  businessName: z.string().trim().min(2, 'اسم النشاط / المتجر مطلوب.').max(80, 'اسم النشاط / المتجر طويل جدا.'),
  ownerPhone: z.string().trim().min(6, 'رقم واتساب مطلوب.').max(30, 'رقم واتساب غير صحيح.'),
  ownerEmail: z.string().trim().email('البريد الالكتروني غير صحيح.'),
  honeypot: z.string().optional(),
});

type TrialSignupForm = z.infer<typeof formSchema>;
type TrialDebugCredentials = NonNullable<PublicTrialSignupResponse['debug']>;

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
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

export function TrialSignupPage() {
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [debugCredentials, setDebugCredentials] = useState<TrialDebugCredentials | null>(null);

  const form = useForm<TrialSignupForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: '',
      ownerPhone: '',
      ownerEmail: '',
      honeypot: '',
    },
  });

  async function onSubmit(values: TrialSignupForm) {
    setSubmitError('');
    setSuccessMessage('');
    setDebugCredentials(null);
    try {
      const response = await publicTrialApi.signup(values);
      setSuccessMessage(response.message || 'تم انشاء نسختك التجريبية بنجاح.');
      setDebugCredentials(response.debug ?? null);
      form.reset();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message || 'تعذر ارسال طلب التجربة. حاول مرة اخرى.');
        return;
      }
      setSubmitError('تعذر ارسال طلب التجربة. حاول مرة اخرى.');
    }
  }

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
          <div className="login-card-pro">
            <div className="login-card-header">
              <h2>ابدأ التجربة المجانية</h2>
              <p>استلم بيانات الدخول على بريدك الالكتروني فوراً</p>
            </div>

            {submitError && (
              <div className="login-error-alert">
                <ShieldAlertIcon />
                <span>{submitError}</span>
              </div>
            )}

            {successMessage ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: '#d1fae5', color: '#10b981', marginBottom: '16px' }}>
                  <CheckIcon />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#065f46', fontSize: '18px', fontWeight: '700' }}>تم انشاء نسختك التجريبية بنجاح</h3>
                <p style={{ margin: '0 0 16px 0', color: '#047857', fontSize: '14px', fontWeight: '500' }}>ارسلنا بيانات الدخول على بريدك الالكتروني، يرجى مراجعة البريد غير الهام إذا لم تجد الرسالة.</p>
                
                {debugCredentials && (
                  <div style={{ background: '#ffffff', borderRadius: '8px', padding: '12px', border: '1px solid #a7f3d0', textAlign: 'right', marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: '600', marginBottom: '8px' }}>بيانات التطوير المحلي:</div>
                    <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '4px' }}><strong>اسم المستخدم:</strong> {debugCredentials.username}</div>
                    <div style={{ fontSize: '14px', color: '#065f46' }}><strong>كلمة المرور المؤقتة:</strong> {debugCredentials.temporaryPassword}</div>
                  </div>
                )}
                
                <Link to="/login" style={{ display: 'inline-block', marginTop: '24px', color: '#10b981', fontWeight: '700', textDecoration: 'underline' }}>
                  الذهاب لتسجيل الدخول
                </Link>
              </div>
            ) : (
              <form className="login-form-pro" onSubmit={form.handleSubmit(onSubmit)}>
                
                <div className="login-field-group">
                  <div className="login-field-label">
                    <label>اسم النشاط / المتجر</label>
                  </div>
                  <div className="login-input-pro-wrap">
                    <input 
                      {...form.register('businessName')} 
                      autoComplete="organization" 
                      placeholder="أدخل اسم النشاط أو المتجر الخاص بك" 
                      className="login-input-pro"
                    />
                  </div>
                  {form.formState.errors.businessName?.message && (
                    <span className="login-field-error-text">{form.formState.errors.businessName?.message}</span>
                  )}
                </div>

                <div className="login-field-group">
                  <div className="login-field-label">
                    <label>رقم واتساب</label>
                  </div>
                  <div className="login-input-pro-wrap">
                    <input 
                      {...form.register('ownerPhone')} 
                      autoComplete="tel" 
                      placeholder="رقم الواتساب للتواصل والدعم" 
                      className="login-input-pro"
                    />
                  </div>
                  {form.formState.errors.ownerPhone?.message && (
                    <span className="login-field-error-text">{form.formState.errors.ownerPhone?.message}</span>
                  )}
                </div>

                <div className="login-field-group">
                  <div className="login-field-label">
                    <label>البريد الإلكتروني</label>
                  </div>
                  <div className="login-input-pro-wrap">
                    <input 
                      {...form.register('ownerEmail')} 
                      type="email"
                      autoComplete="email" 
                      placeholder="أدخل البريد الإلكتروني الخاص بك" 
                      className="login-input-pro"
                    />
                  </div>
                  {form.formState.errors.ownerEmail?.message && (
                    <span className="login-field-error-text">{form.formState.errors.ownerEmail?.message}</span>
                  )}
                </div>

                <input
                  {...form.register('honeypot')}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }}
                />

                <button type="submit" disabled={form.formState.isSubmitting} className="login-submit-pro-btn" style={{ marginTop: '16px' }}>
                  {form.formState.isSubmitting ? (
                    <span>جاري الإنشاء...</span>
                  ) : (
                    <>
                      <span>ابدأ التجربة المجانية</span>
                      <ArrowLeftIcon />
                    </>
                  )}
                </button>

                <div className="login-signup-link">
                  <p>لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link></p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
