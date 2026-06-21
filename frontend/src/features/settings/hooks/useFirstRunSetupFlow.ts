import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { referenceDataApi } from '@/services/reference-data.api';
import { settingsApi } from '@/features/settings/api/settings.api';
import { DEFAULT_STORE_NAME } from '@/config/app-defaults';
import { useAuthStore } from '@/stores/auth-store';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { AuthTenant } from '@/types/auth';

export type SetupStepKey =
  | 'language'
  | 'store'
  | 'locale'
  | 'invoice-tax'
  | 'branch-location'
  | 'trial-start'
  | 'admin-user'
  | 'secure-account';
export type SetupSectionKey = 'core' | 'reference' | 'users' | 'overview';

export interface SetupFlowStep {
  key: SetupStepKey;
  title: string;
  section: SetupSectionKey;
  to: string;
  done: boolean;
  ctaLabel: string;
  nextLabel: string;
}

export interface FirstRunSetupFlowState {
  enabled: boolean;
  steps: SetupFlowStep[];
  currentStep: SetupFlowStep | null;
  nextStep: SetupFlowStep | null;
  previousStep: SetupFlowStep | null;
  currentStepIndex: number;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  resolvedStoreName: string;
}

interface SetupSettingsSnapshot {
  storeName?: string | null;
  uiLanguage?: string | null;
  currency?: string | null;
  timezone?: string | null;
  taxMode?: string | null;
  taxRate?: number | string | null;
  paperSize?: string | null;
}

interface BuildFirstRunSetupFlowStateInput {
  user: { role?: string; permissions?: string[]; usingDefaultAdminPassword?: boolean; mustChangePassword?: boolean } | null | undefined;
  tenant?: AuthTenant | null;
  deploymentMode?: string | null;
  sessionStoreName: string;
  branches: Array<{ id?: string | number }>;
  locations: Array<{ id?: string | number }>;
  users: Array<{ isActive?: boolean; role?: string }>;
  settings: SetupSettingsSnapshot | null | undefined;
}

function hasSecureBootstrapAccount(user: { usingDefaultAdminPassword?: boolean; mustChangePassword?: boolean } | null | undefined) {
  if (!user) return false;
  return user.usingDefaultAdminPassword !== true && user.mustChangePassword !== true;
}

function isSaasOrTrialContext(tenant: AuthTenant | null | undefined, deploymentMode: string | null | undefined) {
  return deploymentMode === 'server' || tenant?.isTrial === true || tenant?.status === 'trial';
}

function hasValue(value: unknown) {
  return String(value || '').trim().length > 0;
}

function isValidLanguage(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'ar' || normalized === 'en';
}

export function buildFirstRunSetupFlowState({
  user,
  tenant,
  deploymentMode,
  sessionStoreName,
  branches,
  locations,
  users,
  settings,
}: BuildFirstRunSetupFlowStateInput): FirstRunSetupFlowState {
  const enabled = user?.role === 'super_admin' || user?.permissions?.includes('settings') === true || user?.permissions?.includes('canManageSettings') === true;
  const saasOrTrial = isSaasOrTrialContext(tenant, deploymentMode);
  const operationalAdmins = users.filter((candidate) => candidate.isActive !== false && candidate.role === 'admin');
  const resolvedStoreName = String(settings?.storeName || tenant?.name || sessionStoreName || '').trim();
  const hasNamedStore = saasOrTrial
    ? Boolean(settings?.storeName) || Boolean(tenant?.name && tenant?.name !== DEFAULT_STORE_NAME)
    : Boolean(settings?.storeName) || Boolean(resolvedStoreName && resolvedStoreName !== DEFAULT_STORE_NAME);
  const secureBootstrapAccount = hasSecureBootstrapAccount(user);
  const hasBranchAndLocation = branches.length > 0 && locations.length > 0;
  const hasLocaleSettings = hasValue(settings?.currency) && hasValue(settings?.timezone);
  const hasInvoiceSettings = hasValue(settings?.paperSize) && hasValue(settings?.taxMode) && settings?.taxRate !== undefined && settings?.taxRate !== null;

  const steps: SetupFlowStep[] = [
    {
      key: 'language',
      title: 'لغة النظام',
      section: 'core',
      to: '/settings/core?setup=1',
      done: isValidLanguage(settings?.uiLanguage),
      ctaLabel: 'اختيار لغة النظام',
      nextLabel: 'حفظ لغة النظام والانتقال للخطوة التالية',
    },
    {
      key: 'store',
      title: 'بيانات النشاط / المتجر',
      section: 'core',
      to: '/settings/core?setup=1',
      done: hasNamedStore,
      ctaLabel: 'استكمال بيانات النشاط',
      nextLabel: 'حفظ بيانات النشاط والانتقال للخطوة التالية',
    },
    {
      key: 'locale',
      title: 'العملة والمنطقة الزمنية',
      section: 'core',
      to: '/settings/core?setup=1',
      done: hasLocaleSettings,
      ctaLabel: 'ضبط العملة والمنطقة الزمنية',
      nextLabel: 'حفظ إعدادات اللغة والمنطقة',
    },
    {
      key: 'invoice-tax',
      title: 'إعدادات الفاتورة والضريبة',
      section: 'core',
      to: '/settings/core?setup=1',
      done: hasInvoiceSettings,
      ctaLabel: 'ضبط الفاتورة والضريبة',
      nextLabel: 'حفظ إعدادات الفاتورة والضريبة',
    },
    {
      key: 'branch-location',
      title: SINGLE_STORE_MODE ? 'الفرع والمخزن الأساسي' : 'الفرع والمخزن الأساسي',
      section: 'reference',
      to: '/settings/reference?setup=1',
      done: hasBranchAndLocation,
      ctaLabel: SINGLE_STORE_MODE ? 'استكمال الفرع والمخزن الأساسي' : 'استكمال الفرع والمخزن الأساسي',
      nextLabel: 'تم، انتقل للخطوة التالية',
    },
  ];

  if (saasOrTrial) {
    steps.push({
      key: 'trial-start',
      title: 'بداية التجربة',
      section: 'overview',
      to: '/settings/overview?setup=1',
      done: true,
      ctaLabel: 'مراجعة حالة التجربة',
      nextLabel: 'إنهاء الإعداد',
    });
  } else {
    steps.push(
      {
        key: 'admin-user',
        title: 'مستخدم الإدارة اليومي',
        section: 'users',
        to: '/settings/users?setup=1',
        done: operationalAdmins.length > 0,
        ctaLabel: 'فتح إدارة المستخدمين',
        nextLabel: 'الانتقال إلى تأمين حساب التثبيت',
      },
      {
        key: 'secure-account',
        title: 'تأمين حساب التثبيت',
        section: 'users',
        to: '/settings/users?setup=1',
        done: secureBootstrapAccount,
        ctaLabel: 'فتح حساب التثبيت',
        nextLabel: 'إنهاء التهيئة',
      },
    );
  }

  const currentStepIndex = steps.findIndex((step) => !step.done);
  const completedCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const nextStep = currentStepIndex >= 0 ? steps[currentStepIndex + 1] || null : null;
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] || null : null;

  return {
    enabled,
    steps,
    currentStep,
    nextStep,
    previousStep,
    currentStepIndex,
    completedCount,
    totalCount,
    isComplete: currentStep === null,
    resolvedStoreName,
  };
}

export function useFirstRunSetupFlow() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode || null);
  const sessionStoreName = useAuthStore((state) => state.storeName);

  const enabled = user?.role === 'super_admin' || user?.permissions?.includes('settings') === true || user?.permissions?.includes('canManageSettings') === true;
  const usersQueryEnabled = enabled && user?.role === 'super_admin';

  const [branchesQuery, locationsQuery, usersQuery, settingsQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.branches, queryFn: referenceDataApi.branches, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.locations, queryFn: referenceDataApi.locations, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.settingsUsers, queryFn: settingsApi.users, enabled: usersQueryEnabled, staleTime: 60_000 },
      { queryKey: queryKeys.settings, queryFn: settingsApi.settings, enabled, staleTime: 60_000 },
    ],
  });

  const flowState = useMemo(() => buildFirstRunSetupFlowState({
    user,
    tenant,
    deploymentMode,
    sessionStoreName,
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || [],
    users: usersQuery.data || [],
    settings: settingsQuery.data,
  }), [branchesQuery.data, deploymentMode, locationsQuery.data, sessionStoreName, settingsQuery.data, tenant, user, usersQuery.data]);
  const isLoading = enabled && [branchesQuery, locationsQuery, usersQuery, settingsQuery].some((query) => query.isLoading);
  const isError = enabled && [branchesQuery, locationsQuery, usersQuery, settingsQuery].some((query) => query.isError);

  const refresh = async () => {
    if (!enabled) return flowState;
    const [branchesResult, locationsResult, settingsResult] = await Promise.all([
      branchesQuery.refetch(),
      locationsQuery.refetch(),
      settingsQuery.refetch(),
    ]);
    const usersData = usersQueryEnabled ? (await usersQuery.refetch()).data : usersQuery.data;
    return buildFirstRunSetupFlowState({
      user,
      tenant,
      deploymentMode,
      sessionStoreName,
      branches: branchesResult.data || [],
      locations: locationsResult.data || [],
      settings: settingsResult.data,
      users: usersData || [],
    });
  };

  return {
    ...flowState,
    isLoading,
    isError,
    refresh,
  };
}
