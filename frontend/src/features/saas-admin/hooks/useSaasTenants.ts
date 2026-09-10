import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';
import { ApiError, setLocalSessionFallback } from '@/lib/http';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { isPlatformAdmin } from '@/app/router/access';
import { saasAdminApi, SaasTenantRow } from '@/features/saas-admin/api/saas-admin.api';

export type TenantActionKey = 'activate' | 'suspend' | 'expire' | 'unlockOwner' | 'delete';
export type SaasTenantsResponse = { tenants: SaasTenantRow[] };

export function useSaasTenants() {
  const user = useAuthStore((state) => state.user);
  const canAccess: boolean = Boolean(isPlatformAdmin(user));
  const configuredPlatformTenantId = String(import.meta.env?.VITE_PLATFORM_TENANT_ID || '').trim();
  const currentTenantId = String(user?.tenantId || '').trim();
  const platformTenantId = configuredPlatformTenantId || currentTenantId || 'zs';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'trial' | 'active' | 'expired' | 'suspended'>('all');
  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'trial' | 'expiring_soon' | 'blocked'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [ownerResetResult, setOwnerResetResult] = useState<{ tenantName: string; username: string; temporaryPassword: string } | null>(null);

  // Modal target states
  const [resetTenant, setResetTenant] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const [upgradeTenant, setUpgradeTenant] = useState<{ id: string; name?: string } | null>(null);
  const [upgradeDuration, setUpgradeDuration] = useState<number>(1);
  const [upgradePlanId, setUpgradePlanId] = useState<number | ''>('');
  const [upgradePaymentAmount, setUpgradePaymentAmount] = useState<number | ''>('');
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('cash');

  const [updatePlanTenant, setUpdatePlanTenant] = useState<SaasTenantRow | null>(null);
  const [subscriptionsTenant, setSubscriptionsTenant] = useState<SaasTenantRow | null>(null);
  const [welcomeShareTenant, setWelcomeShareTenant] = useState<{ tenant: SaasTenantRow; temporaryPassword?: string; username?: string } | null>(null);
  const [editingSlugTenant, setEditingSlugTenant] = useState<SaasTenantRow | null>(null);

  const [renewTenant, setRenewTenant] = useState<{ id: string; name?: string } | null>(null);
  const [renewDuration, setRenewDuration] = useState<number>(1);
  const [renewPlanId, setRenewPlanId] = useState<number | ''>('');
  const [renewPaymentAmount, setRenewPaymentAmount] = useState<number | ''>('');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash');

  const [recordPaymentTenant, setRecordPaymentTenant] = useState<{ id: string; name?: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentCurrency, setPaymentCurrency] = useState('EGP');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');

  const [detailsTenantId, setDetailsTenantId] = useState<string | null>(null);
  const [actionHubTenant, setActionHubTenant] = useState<SaasTenantRow | null>(null);
  const [seedDemoTenant, setSeedDemoTenant] = useState<SaasTenantRow | null>(null);
  const [wipeDataTenant, setWipeDataTenant] = useState<SaasTenantRow | null>(null);

  // Queries
  const plansQuery = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => saasAdminApi.listPlans(),
    enabled: canAccess,
  });
  const plans = plansQuery.data || [];

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: () => saasAdminApi.listFeaturePlans(),
    enabled: canAccess,
  });
  const featurePlans = featurePlansQuery.data || [];

  const tenantsQuery = useQuery<SaasTenantsResponse>({
    queryKey: ['saas-admin-tenants', status, search],
    queryFn: () => saasAdminApi.tenants({
      status: status === 'all' ? undefined : status,
      search: search.trim() || undefined,
    }),
    enabled: canAccess,
  });

  const allTenants: SaasTenantRow[] = tenantsQuery.data?.tenants ?? [];
  const isForbiddenByApi = tenantsQuery.error instanceof ApiError && tenantsQuery.error.status === 403;

  const now = new Date();

  const getDaysRemaining = (endDateStr: string | null) => {
    if (!endDateStr) return null;
    const diff = new Date(endDateStr).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isExpiringSoon = (row: SaasTenantRow) => {
    if (row.status !== 'active' || !row.subscriptionEndDate) return false;
    const days = getDaysRemaining(row.subscriptionEndDate);
    return days !== null && days >= 0 && days <= 7;
  };

  const isExpiredSub = (row: SaasTenantRow) => {
    if (!row.subscriptionEndDate) return false;
    const days = getDaysRemaining(row.subscriptionEndDate);
    return days !== null && days < 0;
  };

  const filteredTenants = useMemo(() => {
    if (tabFilter === 'all') return allTenants;
    if (tabFilter === 'active') return allTenants.filter((r) => r.status === 'active');
    if (tabFilter === 'trial') return allTenants.filter((r) => r.status === 'trial');
    if (tabFilter === 'expiring_soon') return allTenants.filter((r) => isExpiringSoon(r));
    if (tabFilter === 'blocked') return allTenants.filter((r) => r.status === 'expired' || r.status === 'suspended' || isExpiredSub(r));
    return allTenants;
  }, [allTenants, tabFilter]);

  const stats = useMemo(() => {
    const total = allTenants.length;
    const trial = allTenants.filter((row) => row.status === 'trial').length;
    const active = allTenants.filter((row) => row.status === 'active').length;
    const expiringSoonCount = allTenants.filter((row) => isExpiringSoon(row)).length;
    const blocked = allTenants.filter((row) => row.status === 'expired' || row.status === 'suspended' || isExpiredSub(row)).length;
    return [
      { key: 'total', label: 'إجمالي النسخ', value: total },
      { key: 'active', label: 'مفعلة (نشطة)', value: active },
      { key: 'trial', label: 'تجريبية', value: trial },
      { key: 'expiring', label: 'تنتهي قريباً (≤ 7 أيام)', value: expiringSoonCount },
      { key: 'blocked', label: 'منتهية / موقوفة', value: blocked },
    ];
  }, [allTenants]);

  const invalidateTenants = () => queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });

  // Mutations
  const tenantActionMutation = useMutation({
    mutationFn: async (input: { action: TenantActionKey; tenantId: string; durationMonths?: number; planId?: number; paymentAmount?: number; paymentMethod?: string }) => {
      if (input.action === 'activate') return saasAdminApi.activateTenant(input.tenantId, {
        durationMonths: input.durationMonths,
        planId: input.planId,
        paymentAmount: input.paymentAmount,
        paymentMethod: input.paymentMethod,
      });
      if (input.action === 'suspend') return saasAdminApi.suspendTenant(input.tenantId);
      if (input.action === 'unlockOwner') return saasAdminApi.unlockOwner(input.tenantId);
      if (input.action === 'delete') return saasAdminApi.deleteTenant(input.tenantId);
      return saasAdminApi.expireTenant(input.tenantId);
    },
    onSuccess: async () => {
      setFeedback('تم تحديث حالة النسخة بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تحديث حالة النسخة.')),
  });

  const renewMutation = useMutation({
    mutationFn: ({ tenantId, ...payload }: { tenantId: string; durationMonths: number; planId: number; paymentAmount?: number; paymentMethod?: string }) => 
      saasAdminApi.renewTenant(tenantId, payload),
    onSuccess: async () => {
      setFeedback('تم تجديد الاشتراك بنجاح.');
      await invalidateTenants();
      setRenewTenant(null);
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تجديد الاشتراك.')),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ tenantId, ...payload }: { tenantId: string; amount: number; currency: string; method: string; reference?: string }) => 
      saasAdminApi.recordPayment(tenantId, payload),
    onSuccess: async () => {
      setFeedback('تم تسجيل الدفعة بنجاح.');
      await invalidateTenants();
      setRecordPaymentTenant(null);
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تسجيل الدفعة.')),
  });

  const extendTrialMutation = useMutation({
    mutationFn: (input: { tenantId: string; days: number }) => saasAdminApi.extendTrial(input.tenantId, input.days),
    onSuccess: async () => {
      setFeedback('تم تمديد الفترة التجريبية بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تمديد الفترة التجريبية.')),
  });

  const resetOwnerPasswordMutation = useMutation({
    mutationFn: (input: { tenantId: string; tenantName: string; newPassword?: string }) =>
      saasAdminApi.resetOwnerPassword(input.tenantId, input.newPassword).then((res: any) => ({ ...res, tenantName: input.tenantName })),
    onSuccess: async (payload: any) => {
      const username = String(payload?.username || payload?.owner?.username || '');
      const temporaryPassword = String(payload?.password || payload?.temporaryPassword || payload?.owner?.temporaryPassword || '');
      setOwnerResetResult({
        tenantName: payload.tenantName,
        username,
        temporaryPassword,
      });
      setFeedback('تمت إعادة تعيين كلمة مرور مالك النسخة بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر إعادة تعيين كلمة مرور مالك النسخة.')),
  });

  const clearSession = useAuthStore((state) => state.clearSession);

  const impersonateMutation = useMutation({
    mutationFn: (tenantId: string) => saasAdminApi.impersonateTenant(tenantId),
    onSuccess: async (res) => {
      if (res?.originalSessionId) {
        window.localStorage.setItem('zs.impersonationOriginalSession', res.originalSessionId);
      }
      if (res?.sessionId) {
        setLocalSessionFallback(res.sessionId);
      }
      await resetAuthenticatedClient(queryClient, clearSession);
      window.location.href = '/';
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر الدخول كمالك للنسخة.')),
  });

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setFeedback('تم نسخ النص إلى الحافظة بنجاح.');
    }
  };

  return {
    canAccess,
    platformTenantId,
    currentTenantId,
    search,
    setSearch,
    status,
    setStatus,
    tabFilter,
    setTabFilter,
    isCreateOpen,
    setIsCreateOpen,
    feedback,
    setFeedback,
    ownerResetResult,
    setOwnerResetResult,
    copyToClipboard,
    plans,
    featurePlans,
    tenantsQuery,
    allTenants,
    filteredTenants,
    stats,
    isExpiringSoon,
    isForbiddenByApi,
    // Mutations
    tenantActionMutation,
    renewMutation,
    recordPaymentMutation,
    extendTrialMutation,
    resetOwnerPasswordMutation,
    impersonateMutation,
    // Modals state & handlers
    resetTenant,
    setResetTenant,
    resetPassword,
    setResetPassword,
    upgradeTenant,
    setUpgradeTenant,
    upgradeDuration,
    setUpgradeDuration,
    upgradePlanId,
    setUpgradePlanId,
    upgradePaymentAmount,
    setUpgradePaymentAmount,
    upgradePaymentMethod,
    setUpgradePaymentMethod,
    updatePlanTenant,
    setUpdatePlanTenant,
    subscriptionsTenant,
    setSubscriptionsTenant,
    welcomeShareTenant,
    setWelcomeShareTenant,
    editingSlugTenant,
    setEditingSlugTenant,
    renewTenant,
    setRenewTenant,
    renewDuration,
    setRenewDuration,
    renewPlanId,
    setRenewPlanId,
    renewPaymentAmount,
    setRenewPaymentAmount,
    renewPaymentMethod,
    setRenewPaymentMethod,
    recordPaymentTenant,
    setRecordPaymentTenant,
    paymentAmount,
    setPaymentAmount,
    paymentCurrency,
    setPaymentCurrency,
    paymentMethod,
    setPaymentMethod,
    paymentReference,
    setPaymentReference,
    detailsTenantId,
    setDetailsTenantId,
    actionHubTenant,
    setActionHubTenant,
    seedDemoTenant,
    setSeedDemoTenant,
    wipeDataTenant,
    setWipeDataTenant,
  };
}
