import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { ApiError } from '@/lib/http';
import { publicTrialApi } from '@/features/public-trial/api/public-trial.api';

const formSchema = z.object({
  businessName: z.string().trim().min(2, 'اسم المتجر مطلوب.').max(80, 'اسم المتجر طويل جدًا.'),
  ownerPhone: z.string().trim().min(6, 'رقم واتساب مطلوب.').max(30, 'رقم واتساب غير صحيح.'),
  ownerEmail: z.string().trim().email('البريد الإلكتروني غير صحيح.'),
  honeypot: z.string().optional(),
});

type TrialSignupForm = z.infer<typeof formSchema>;

export function TrialSignupPage() {
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
    try {
      const response = await publicTrialApi.signup(values);
      setSuccessMessage(response.message || 'تم إنشاء نسختك التجريبية بنجاح.');
      form.reset();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message || 'تعذر إرسال طلب التجربة. حاول مرة أخرى.');
        return;
      }
      setSubmitError('تعذر إرسال طلب التجربة. حاول مرة أخرى.');
    }
  }

  return (
    <div className="screen-center">
      <div className="login-stack">
        <form className="login-card" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="login-logo"><span className="z-mark">Z</span><span className="systems-mark">Systems</span></div>
          <div className="login-header">
            <h1>ابدأ التجربة المجانية</h1>
            <p className="login-subtitle muted">سجّل بياناتك وسنرسل لك الدخول إلى نسخة تجريبية لمدة 14 يوم.</p>
          </div>

          <Field label="اسم المتجر / النشاط" error={form.formState.errors.businessName?.message}>
            <input {...form.register('businessName')} autoComplete="organization" />
          </Field>
          <Field label="رقم واتساب" error={form.formState.errors.ownerPhone?.message}>
            <input {...form.register('ownerPhone')} autoComplete="tel" />
          </Field>
          <Field label="البريد الإلكتروني" error={form.formState.errors.ownerEmail?.message}>
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
              <strong>تم إنشاء نسختك التجريبية بنجاح</strong>
              <div>أرسلنا بيانات الدخول على بريدك الإلكتروني</div>
              <div className="muted small">راجع البريد غير الهام إذا لم تجد الرسالة</div>
            </div>
          ) : null}

          <Button type="submit" className="full-width" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'جارٍ الإرسال...' : 'ابدأ التجربة المجانية'}
          </Button>

          <div className="login-support">
            <Link className="login-support-link" to="/login">العودة إلى تسجيل الدخول</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
