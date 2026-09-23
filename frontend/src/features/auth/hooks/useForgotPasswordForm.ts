import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '@/features/auth/api/auth.api';
import { ApiError } from '@/lib/http';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  companyCode: z.string().optional(),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export function useForgotPasswordForm() {
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', companyCode: '' },
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      if (submitError) setSubmitError('');
    });
    return () => subscription.unsubscribe();
  }, [form, submitError]);

  async function onSubmit(values: ForgotPasswordSchema) {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const email = values.email.trim();
      const companyCode = values.companyCode?.trim();
      await authApi.requestPasswordReset({ email, ...(companyCode ? { companyCode } : {}) });
      // الرد واحد سواء وُجد الحساب أم لا — الواجهة تعرض نفس الرسالة للسبب نفسه: ألّا تتحول
      // الشاشة إلى وسيلة لمعرفة أي البُرُد مسجَّلة لدينا.
      setSentToEmail(email);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'تعذر إرسال رابط الاستعادة حالياً. حاول مرة أخرى بعد قليل.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    onSubmit,
    submitError,
    isSubmitting,
    sentToEmail,
    resetSentState: () => setSentToEmail(''),
  };
}
