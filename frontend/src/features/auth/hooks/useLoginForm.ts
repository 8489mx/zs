import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/features/auth/api/auth.api';
import { getPostLoginRoute } from '@/features/auth/lib/post-login-route';

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة')
});

export type LoginSchema = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  async function onSubmit(values: LoginSchema) {
    if (isSubmitting) return;

    setSubmitError('');
    setIsSubmitting(true);

    try {
      await authApi.login(values);
      const me = await authApi.me();

      setSession({
        user: {
          ...me.user,
          mustChangePassword: me.security?.mustChangePassword === true,
          usingDefaultAdminPassword: me.security?.usingDefaultAdminPassword === true,
        },
        storeName: me.settings.storeName || 'Z Systems',
        theme: me.settings.theme || 'light'
      });

      navigate(getPostLoginRoute({
        ...me.user,
        mustChangePassword: me.security?.mustChangePassword === true,
        usingDefaultAdminPassword: me.security?.usingDefaultAdminPassword === true,
      }, me.settings.storeName || 'Z Systems'), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر تسجيل الدخول';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { form, onSubmit, submitError, isSubmitting };
}