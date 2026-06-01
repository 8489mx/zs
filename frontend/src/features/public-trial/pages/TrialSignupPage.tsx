import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { ApiError } from '@/lib/http';
import { publicTrialApi } from '@/features/public-trial/api/public-trial.api';
import type { PublicTrialSignupResponse } from '@/features/public-trial/api/public-trial.api';

const formSchema = z.object({
  businessName: z.string().trim().min(2, 'اسم المتجر مطلوب.').max(80, 'اسم المتجر طويل جدا.'),
  ownerPhone: z.string().trim().min(6, 'رقم واتساب مطلوب.').max(30, 'رقم واتساب غير صحيح.'),
  ownerEmail: z.string().trim().email('البريد الالكتروني غير صحيح.'),
  honeypot: z.string().optional(),
});

type TrialSignupForm = z.infer<typeof formSchema>;
type TrialDebugCredentials = NonNullable<PublicTrialSignupResponse['debug']>;

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

  return (
    <div className="screen-center">
      <div className="login-stack">
        <form className="login-card" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="login-logo"><span className="z-mark">Z</span><span className="systems-mark">Systems</span></div>
          <div className="login-header">
            <h1>ابدأ التجربة المجانية</h1>
            <div className="login-subtitle muted trial-subtitle-lines">
              <span>ابدأ تجربتك المجانية لمدة 14 يوم</span>
              <span>واستلم بيانات الدخول على بريدك الالكتروني</span>
            </div>
          </div>

          <Field label="اسم المتجر / النشاط" error={form.formState.errors.businessName?.message}>
            <input {...form.register('businessName')} autoComplete="organization" />
          </Field>
          <Field label="رقم واتساب" error={form.formState.errors.ownerPhone?.message}>
            <input {...form.register('ownerPhone')} autoComplete="tel" />
          </Field>
          <Field label="البريد الالكتروني" error={form.formState.errors.ownerEmail?.message}>
            <input {...form.register('ownerEmail')} type="email" autoComplete="email" />
          </Field>

          <input
            {...form.register('honeypot')}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }}
          />

          {submitError ? <div className="error-box">{submitError}</div> : null}
          {successMessage ? (
            <div className="success-box">
              <strong>تم انشاء نسختك التجريبية بنجاح</strong>
              <div>ارسلنا بيانات الدخول على بريدك الالكتروني</div>
              <div className="muted small">راجع البريد غير الهام اذا لم تجد الرسالة</div>
              {debugCredentials ? (
                <div className="stack gap-8" style={{ marginTop: 12, textAlign: 'right' }}>
                  <div className="muted small">بيانات دخول التطوير المحلي فقط:</div>
                  <div><strong>اسم المستخدم:</strong> {debugCredentials.username}</div>
                  <div><strong>كلمة المرور المؤقتة:</strong> {debugCredentials.temporaryPassword}</div>
                  <div className="muted small">لا تظهر هذه البيانات في الانتاج.</div>
                </div>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="full-width" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'جاري الارسال...' : 'ابدأ التجربة المجانية'}
          </Button>

          <div className="login-support">
            <Link className="login-support-link" to="/login">العودة الى تسجيل الدخول</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
