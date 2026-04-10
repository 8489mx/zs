import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_STORE_NAME, DEFAULT_THEME, useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/features/auth/api/auth.api';
import { getPostLoginRoute } from '@/features/auth/lib/post-login-route';
import { clearQueryClientData } from '@/lib/query-client-session';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة')
});

export type LoginSchema = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      if (submitError) {
        setSubmitError('');
      }
    });

    return () => subscription.unsubscribe();
  }, [form, submitError]);

  async function onSubmit(values: LoginSchema) {
    if (isSubmitting) return;

    setSubmitError('');
    setIsSubmitting(true);

    try {
      await authApi.login(values);
      const me = await authApi.me();
      const storeName = me.settings.storeName || DEFAULT_STORE_NAME;
      const theme = me.settings.theme || DEFAULT_THEME;
      const user = {
        ...me.user,
        mustChangePassword: me.security?.mustChangePassword === true,
        usingDefaultAdminPassword: me.security?.usingDefaultAdminPassword === true,
      };

      await clearQueryClientData(queryClient);
      setSession({ user, storeName, theme });
      navigate(getPostLoginRoute(user, storeName), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر تسجيل الدخول';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { form, onSubmit, submitError, isSubmitting };
}
