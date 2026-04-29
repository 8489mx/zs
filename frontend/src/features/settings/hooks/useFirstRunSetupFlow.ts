import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { referenceDataApi } from '@/services/reference-data.api';
import { settingsApi } from '@/features/settings/api/settings.api';
import { DEFAULT_STORE_NAME } from '@/config/app-defaults';
import { useAuthStore } from '@/stores/auth-store';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export type SetupStepKey = 'store' | 'branch-location' | 'admin-user' | 'secure-account';
export type SetupSectionKey = 'core' | 'reference' | 'users';

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

interface BuildFirstRunSetupFlowStateInput {
  user: { role?: string; usingDefaultAdminPassword?: boolean; mustChangePassword?: boolean } | null | undefined;
  sessionStoreName: string;
  branches: Array<{ id?: string | number }>;
  locations: Array<{ id?: string | number }>;
  users: Array<{ isActive?: boolean; role?: string }>;
  settings: { storeName?: string | null } | null | undefined;
}

function hasSecureBootstrapAccount(user: { usingDefaultAdminPassword?: boolean; mustChangePassword?: boolean } | null | undefined) {
  if (!user) return false;
  return user.usingDefaultAdminPassword !== true && user.mustChangePassword !== true;
}

export function buildFirstRunSetupFlowState({
  user,
  sessionStoreName,
  branches,
  locations,
  users,
  settings,
}: BuildFirstRunSetupFlowStateInput): FirstRunSetupFlowState {
  const enabled = user?.role === 'super_admin';
  const operationalAdmins = users.filter((candidate) => candidate.isActive !== false && candidate.role === 'admin');
  const resolvedStoreName = String(settings?.storeName || sessionStoreName || '').trim();
  const hasNamedStore = Boolean(resolvedStoreName && resolvedStoreName !== DEFAULT_STORE_NAME);
  const secureBootstrapAccount = hasSecureBootstrapAccount(user);

  const steps: SetupFlowStep[] = [
    {
      key: 'store',
      title: 'بيانات المنشأة',
      section: 'core',
      to: '/settings/core?setup=1',
      done: hasNamedStore,
      ctaLabel: 'افتح الإعدادات الأساسية',
      nextLabel: 'حفظ والانتقال للخطوة التالية'
    },
    {
      key: 'branch-location',
      title: SINGLE_STORE_MODE ? 'تعريف نقطة التشغيل' : 'الفرع والمخزن الأساسي',
      section: 'reference',
      to: '/settings/reference?setup=1',
      done: branches.length > 0 && locations.length > 0,
      ctaLabel: SINGLE_STORE_MODE ? 'افتح بيانات المتجر ونقطة التشغيل' : 'افتح الفرع الرئيسي والمخزن الأساسي',
      nextLabel: 'تم، انتقل للخطوة التالية'
    },
    {
      key: 'admin-user',
      title: 'مستخدم الإدارة اليومي',
      section: 'users',
      to: '/settings/users?setup=1',
      done: operationalAdmins.length > 0,
      ctaLabel: 'افتح إدارة المستخدمين',
      nextLabel: 'الانتقال إلى تأمين حساب التثبيت'
    },
    {
      key: 'secure-account',
      title: 'تأمين حساب التثبيت',
      section: 'users',
      to: '/settings/users?setup=1',
      done: secureBootstrapAccount,
      ctaLabel: 'افتح حساب التثبيت',
      nextLabel: 'إنهاء التهيئة'
    }
  ];

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
  const sessionStoreName = useAuthStore((state) => state.storeName);

  const enabled = user?.role === 'super_admin';

  const [branchesQuery, locationsQuery, usersQuery, settingsQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.branches, queryFn: referenceDataApi.branches, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.locations, queryFn: referenceDataApi.locations, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.settingsUsers, queryFn: settingsApi.users, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.settings, queryFn: settingsApi.settings, enabled, staleTime: 60_000 }
    ]
  });

  const flowState = useMemo(() => buildFirstRunSetupFlowState({
    user,
    sessionStoreName,
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || [],
    users: usersQuery.data || [],
    settings: settingsQuery.data,
  }), [branchesQuery.data, locationsQuery.data, sessionStoreName, settingsQuery.data, user, usersQuery.data]);
  const isLoading = enabled && [branchesQuery, locationsQuery, usersQuery, settingsQuery].some((query) => query.isLoading);
  const isError = enabled && [branchesQuery, locationsQuery, usersQuery, settingsQuery].some((query) => query.isError);

  const refresh = async () => {
    if (!enabled) return flowState;
    const [branchesResult, locationsResult, usersResult, settingsResult] = await Promise.all([
      branchesQuery.refetch(),
      locationsQuery.refetch(),
      usersQuery.refetch(),
      settingsQuery.refetch(),
    ]);
    return buildFirstRunSetupFlowState({
      user,
      sessionStoreName,
      branches: branchesResult.data || [],
      locations: locationsResult.data || [],
      users: usersResult.data || [],
      settings: settingsResult.data,
    });
  };

  return {
    ...flowState,
    isLoading,
    isError,
    refresh,
  };
}
