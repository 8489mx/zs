import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '@/features/auth/api/auth.api';
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_HINT } from '@/config/security';
import { ApiError } from '@/lib/http';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_HINT),
    confirmPassword: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_HINT),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين',
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export type ResetTokenStatus = 'checking' | 'valid' | 'invalid';

/**
 * الرمز يصل في الـfragment (`#token=`) لأن الـfragment لا يُرسَل للسيرفر فلا يدخل سجلات nginx
 * ولا ترويسة Referer. صيغة الـquery مقبولة أيضاً حتى لا ينكسر رابط قديم أو منسوخ يدوياً.
 */
export function readResetTokenFromLocation(hash: string, search: string): string {
  const fromHash = new URLSearchParams(String(hash || '').replace(/^#/, '')).get('token');
  if (fromHash && fromHash.trim()) return fromHash.trim();
  const fromQuery = new URLSearchParams(String(search || '')).get('token');
  return fromQuery?.trim() || '';
}

export function useResetPasswordForm() {
  const location = useLocation();
  const token = readResetTokenFromLocation(location.hash, location.search);

  const [tokenStatus, setTokenStatus] = useState<ResetTokenStatus>('checking');
  const [tokenError, setTokenError] = useState('');
  const [accountLabel, setAccountLabel] = useState<{ username: string; businessName: string } | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const validationStartedFor = useRef<string | null>(null);

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (validationStartedFor.current === token) return;
    validationStartedFor.current = token;

    if (!token) {
      setTokenStatus('invalid');
      setTokenError('الرابط غير مكتمل. افتح الرابط كما وصلك في البريد كاملاً، أو اطلب رابطاً جديداً.');
      return;
    }

    let cancelled = false;
    setTokenStatus('checking');

    authApi
      .validatePasswordResetToken(token)
      .then((result) => {
        if (cancelled) return;
        setAccountLabel({ username: result.username, businessName: result.businessName });
        setTokenStatus('valid');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTokenError(
          error instanceof ApiError
            ? error.message
            : 'تعذر التحقق من الرابط حالياً. حاول مرة أخرى بعد قليل.',
        );
        setTokenStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (submitError) setSubmitError('');
    });
    return () => subscription.unsubscribe();
  }, [form, submitError]);

  async function onSubmit(values: ResetPasswordSchema) {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      await authApi.confirmPasswordReset({ token, newPassword: values.newPassword });
      setIsDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PASSWORD_RESET_TOKEN_INVALID') {
        // الرمز مات بين فتح الصفحة والإرسال (انتهى، أو استُهلك، أو صدر رمز أحدث).
        setTokenError(error.message);
        setTokenStatus('invalid');
        return;
      }
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'تعذر تعيين كلمة المرور حالياً. حاول مرة أخرى بعد قليل.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    onSubmit,
    tokenStatus,
    tokenError,
    accountLabel,
    submitError,
    isSubmitting,
    isDone,
  };
}
