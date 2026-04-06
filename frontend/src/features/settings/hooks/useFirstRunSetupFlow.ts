import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { referenceDataApi } from '@/services/reference-data.api';
import { settingsApi } from '@/features/settings/api/settings.api';
import { useAuthStore } from '@/stores/auth-store';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export type SetupStepKey = 'store' | 'branch-location' | 'admin-user';
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

export function useFirstRunSetupFlow() {
  const user = useAuthStore((state) => state.user);
  const sessionStoreName = useAuthStore((state) => state.storeName);

  const enabled = user?.role === 'admin';

  const [branchesQuery, locationsQuery, usersQuery, settingsQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.branches, queryFn: referenceDataApi.branches, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.locations, queryFn: referenceDataApi.locations, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.settingsUsers, queryFn: settingsApi.users, enabled, staleTime: 60_000 },
      { queryKey: queryKeys.settings, queryFn: settingsApi.settings, enabled, staleTime: 60_000 }
    ]
  });

  const steps = useMemo<SetupFlowStep[]>(() => {
    const branches = branchesQuery.data || [];
    const locations = locationsQuery.data || [];
    const users = usersQuery.data || [];
    const settings = settingsQuery.data;
    const operationalAdmins = users.filter((candidate) => candidate.isActive !== false && candidate.role === 'admin');
    const resolvedStoreName = String(settings?.storeName || sessionStoreName || '').trim();
    const hasNamedStore = Boolean(resolvedStoreName && resolvedStoreName !== 'Z Systems');

    return [
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
        nextLabel: 'إنهاء التهيئة'
      }
    ];
  }, [branchesQuery.data, locationsQuery.data, sessionStoreName, settingsQuery.data, usersQuery.data]);

  const currentStepIndex = steps.findIndex((step) => !step.done);
  const completedCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const nextStep = currentStepIndex >= 0 ? steps[currentStepIndex + 1] || null : null;
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] || null : null;
  const isComplete = currentStep === null;
  const isLoading = enabled && [branchesQuery, locationsQuery, usersQuery, settingsQuery].some((query) => query.isLoading);
  const isError = enabled && [branchesQuery, locationsQuery, usersQuery, settingsQuery].some((query) => query.isError);

  return {
    enabled,
    steps,
    currentStep,
    nextStep,
    previousStep,
    currentStepIndex,
    completedCount,
    totalCount,
    isComplete,
    isLoading,
    isError
  };
}
