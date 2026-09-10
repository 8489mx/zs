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
import { ApiError, setLocalSessionFallback } from '@/lib/http';
import type { AuthTenant } from '@/types/auth';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'رقم الهاتف أو اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  companyCode: z.string().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export interface DisambiguationTenant {
  id: string;
  name: string;
  slug: string;
}

export const isDesktopApp = typeof window !== 'undefined' && (
  Boolean((window as any).electronAPI) ||
  Boolean((window as any).process?.versions?.electron) ||
  window.navigator.userAgent.toLowerCase().includes('electron') ||
  import.meta.env.MODE === 'electron' ||
  import.meta.env.MODE === 'portable' ||
  window.location.protocol === 'file:'
);

export function useLoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disambiguationTenants, setDisambiguationTenants] = useState<DisambiguationTenant[] | null>(null);
  const [showCompanyCodeInput, setShowCompanyCodeInput] = useState(false);

  const [rememberedCompanyCode, setRememberedCompanyCode] = useState<string | null>(() => {
    if (typeof window === 'undefined' || isDesktopApp) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('zs_last_company_code');
        localStorage.removeItem('zs_last_company_name');
      }
      return null;
    }
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('c') || searchParams.get('tenant') || localStorage.getItem('zs_last_company_code') || null;
  });

  const [rememberedCompanyName, setRememberedCompanyName] = useState<string | null>(() => {
    if (typeof window === 'undefined' || isDesktopApp) return null;
    return localStorage.getItem('zs_last_company_name') || null;
  });

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', companyCode: isDesktopApp ? '' : (rememberedCompanyCode || '') }
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      if (submitError) {
        setSubmitError('');
      }
    });

    return () => subscription.unsubscribe();
  }, [form, submitError]);

  async function executeLogin(values: { username: string; password: string; companyCode?: string }) {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const activeCompanyCode = isDesktopApp
        ? undefined
        : (values.companyCode?.trim() || rememberedCompanyCode?.trim() || undefined);

      const loginResult = await authApi.login({
        username: values.username.trim(),
        password: values.password,
        ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
      });
      setLocalSessionFallback(loginResult.sessionId);

      let storeName = DEFAULT_STORE_NAME;
      let theme = DEFAULT_THEME;
      let tenant: AuthTenant | null = loginResult.tenant ?? null;
      let onboardingCompleted: boolean | undefined;
      let user = {
        ...loginResult.user,
        tenantId: String(loginResult.user?.tenantId || loginResult.tenant?.id || '').trim() || loginResult.user?.tenantId,
        accountId: String(loginResult.user?.accountId || loginResult.tenant?.accountId || '').trim() || loginResult.user?.accountId,
        mustChangePassword: loginResult.mustChangePassword === true,
        usingDefaultAdminPassword: false,
      };

      try {
        const me = await authApi.me();
        storeName = me.settings.storeName || DEFAULT_STORE_NAME;
        theme = me.settings.theme || DEFAULT_THEME;
        tenant = me.tenant ?? tenant;
        onboardingCompleted = me.settings?.onboardingCompleted;
        user = {
          ...me.user,
          tenantId: String(me.user?.tenantId || me.tenant?.id || '').trim() || me.user?.tenantId,
          accountId: String(me.user?.accountId || me.tenant?.accountId || '').trim() || me.user?.accountId,
          mustChangePassword: me.security?.mustChangePassword === true,
          usingDefaultAdminPassword: me.security?.usingDefaultAdminPassword === true,
        };
      } catch (sessionError) {
        if (sessionError instanceof ApiError && sessionError.status === 401) {
          throw new Error('تم تحديث الجلسة. من فضلك سجل الدخول مرة اخرى.');
        }
        if (!(sessionError instanceof Error)) throw sessionError;
      }

      await clearQueryClientData(queryClient);
      setSession({ user, tenant, storeName, theme });
      const friendlyCompanyCode = String(tenant?.slug || user?.tenantId || '').trim();
      const friendlyCompanyName = String(tenant?.businessName || storeName || friendlyCompanyCode).trim();
      if (!isDesktopApp && friendlyCompanyCode && typeof localStorage !== 'undefined') {
        localStorage.setItem('zs_last_company_code', friendlyCompanyCode);
        if (friendlyCompanyName) {
          localStorage.setItem('zs_last_company_name', friendlyCompanyName);
        }
        setRememberedCompanyCode(friendlyCompanyCode);
        setRememberedCompanyName(friendlyCompanyName);
      }
      setDisambiguationTenants(null);
      navigate(getPostLoginRoute(user, storeName, { tenant, deploymentMode: useAuthStore.getState().activationStatus?.deploymentMode, onboardingCompleted }), { replace: true });
    } catch (err) {
      setLocalSessionFallback(null);

      // Check if multiple tenants disambiguation payload was returned
      if (err instanceof ApiError) {
        const details = err.details as any;
        const tenants = details?.tenants || details?.error?.tenants;
        const code = err.code || details?.code || details?.error?.code;

        if (code === 'MULTIPLE_TENANTS' && Array.isArray(tenants) && tenants.length > 0) {
          setDisambiguationTenants(tenants);
          return;
        }
      }

      const message = err instanceof Error ? err.message : 'تعذر تسجيل الدخول';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(values: LoginSchema) {
    if (isSubmitting) return;
    await executeLogin(values);
  }

  async function handleSelectTenant(tenantId: string) {
    if (isSubmitting) return;
    const currentValues = form.getValues();
    await executeLogin({
      username: currentValues.username,
      password: currentValues.password,
      companyCode: tenantId,
    });
  }

  function handleClearRememberedTenant() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('zs_last_company_code');
      localStorage.removeItem('zs_last_company_name');
    }
    setRememberedCompanyCode(null);
    setRememberedCompanyName(null);
    form.setValue('companyCode', '');
    setShowCompanyCodeInput(true);
  }

  return {
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
    isDesktop: isDesktopApp,
  };
}
