import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/components/data-table';
import { Field } from '@/shared/ui/field';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { StatsGrid } from '@/shared/components/stats-grid';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';
import { ApiError, setLocalSessionFallback } from '@/lib/http';
import { isPlatformAdmin } from '@/app/router/access';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { saasAdminApi, SaasTenantRow, SaasTenantStatus } from '@/features/saas-admin/api/saas-admin.api';
import { UpdateTenantPlanModal } from '../components/UpdateTenantPlanModal';
import { TenantDetailsModal } from '../components/TenantDetailsModal';
import { TenantSubscriptionsModal } from '../components/TenantSubscriptionsModal';
import { TenantWelcomeShareModal } from '../components/TenantWelcomeShareModal';
import { TenantActionHubModal } from '../components/TenantActionHubModal';

type TenantActionKey = 'activate' | 'suspend' | 'expire' | 'unlockOwner' | 'delete';
type SaasTenantsResponse = { tenants: SaasTenantRow[] };

function statusLabel(status: SaasTenantStatus): string {
  if (status === 'trial') return 'تجريبية';
  if (status === 'active') return 'مفعلة';
  if (status === 'expired') return 'منتهية';
  if (status === 'suspended') return 'موقوفة';
  return String(status || 'غير معروف');
}

function statusBadgeClass(status: SaasTenantStatus): string {
  if (status === 'active') return 'tenant-status-pill active';
  if (status === 'trial') return 'tenant-status-pill trial';
  if (status === 'suspended') return 'tenant-status-pill suspended';
  if (status === 'expired') return 'tenant-status-pill expired';
  return 'tenant-status-pill';
}

function isPlatformTenantRow(row: SaasTenantRow, platformTenantId: string, currentTenantId?: string): boolean {
  const rowId = String(row.id || '').trim();
  const rowSlug = String(row.slug || '').trim().toLowerCase();
  return (
    rowId === 'default' ||
    rowId === platformTenantId ||
    (Boolean(currentTenantId) && rowId === currentTenantId) ||
    rowSlug === 'default' ||
    rowSlug === 'zsystems' ||
    rowSlug === 'platform'
  );
}

interface TenantActionsMenuProps {
  row: SaasTenantRow;
  platformTenantId: string;
  currentTenantId?: string;
  onImpersonate: (id: string, name: string) => void;
  isImpersonating: boolean;
  onShowDetails: (id: string) => void;
  onShowSubscriptions: (row: SaasTenantRow) => void;
  onShareWelcome: (row: SaasTenantRow) => void;
  onRenew: (row: SaasTenantRow) => void;
  onOpenActionHub: (row: SaasTenantRow) => void;
}

function TenantActionsMenu({
  row,
  platformTenantId,
  currentTenantId,
  onImpersonate,
  isImpersonating,
  onShowSubscriptions,
  onRenew,
  onOpenActionHub,
}: TenantActionsMenuProps) {
  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);

  if (isPlatform) {
    return (
      <div className="tenant-actions-cell">
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, padding: '3px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
          نسخة المنصة (محمية)
        </span>
      </div>
    );
  }

  return (
    <div className="tenant-actions-cell" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {/* 1. تصفح النسخة كمالك */}
      <button
        type="button"
        className="tenant-browse-btn"
        onClick={() => onImpersonate(row.id, row.businessName || row.slug)}
        disabled={isImpersonating}
        title="تسجيل الدخول وتصفح النسخة كمالك"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
        <span>{isImpersonating ? 'جاري الدخول...' : 'تصفح'}</span>
      </button>

      {/* 2. تجديد الاشتراك السريع */}
      <button
        type="button"
        className="tenant-renew-btn"
        onClick={() => onRenew(row)}
        title="تجديد أو ترقية اشتراك النسخة"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
        <span>تجديد</span>
      </button>

      {/* 3. سجل الاشتراكات والمدفوعات */}
      <button
        type="button"
        className="tenant-subscriptions-btn"
        onClick={() => onShowSubscriptions(row)}
        title="عرض سجل فترات الاشتراك وطباعة الإيصالات"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>الاشتراكات</span>
      </button>

      {/* 4. زر فتح مركز الإجراءات الكامل (Action Hub Modal) */}
      <button
        type="button"
        className="tenant-more-btn"
        onClick={() => onOpenActionHub(row)}
        title="فتح مركز الإجراءات والخيارات الكاملة"
        aria-label="خيارات إضافية"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
      </button>
    </div>
  );
}

export function SaasTenantsPage() {
  const user = useAuthStore((state) => state.user);
  const canAccess: boolean = Boolean(isPlatformAdmin(user));
  const configuredPlatformTenantId = String(import.meta.env?.VITE_PLATFORM_TENANT_ID || '').trim();
  const currentTenantId = String(user?.tenantId || '').trim();
  const platformTenantId = configuredPlatformTenantId || currentTenantId || 'default';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'trial' | 'active' | 'expired' | 'suspended'>('all');
  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'trial' | 'expiring_soon' | 'blocked'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [createResult, setCreateResult] = useState<{ username: string; temporaryPassword: string; trialEndsAt: string; tenantSlug?: string; businessName?: string; fullTenant?: SaasTenantRow } | null>(null);
  const [ownerResetResult, setOwnerResetResult] = useState<{ tenantName: string; username: string; temporaryPassword: string } | null>(null);
  
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
  
  const [createForm, setCreateForm] = useState({
    slug: '',
    businessName: '',
    branchName: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    activityType: '',
    username: '',
    password: '',
    days: '14',
    source: '',
    campaign: '',
    notes: '',
    featurePlanId: 'plan_ultimate',
  });

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
      setFeedback('تمت إعادة كلمة مرور مالك النسخة بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر إعادة كلمة مرور مالك النسخة.')),
  });

  const createTrialMutation = useMutation({
    mutationFn: () => saasAdminApi.createTrialTenant({
      slug: createForm.slug.trim(),
      businessName: createForm.businessName.trim(),
      branchName: createForm.branchName?.trim() || undefined,
      ownerName: createForm.ownerName.trim(),
      ownerPhone: createForm.ownerPhone.trim(),
      ownerEmail: createForm.ownerEmail?.trim() || undefined,
      activityType: createForm.activityType?.trim() || undefined,
      username: createForm.username.trim() || 'admin',
      password: createForm.password || undefined,
      days: Number(createForm.days || 14),
      source: createForm.source || undefined,
      campaign: createForm.campaign || undefined,
      notes: createForm.notes || undefined,
      featurePlanId: createForm.featurePlanId || 'plan_ultimate',
    }),
    onSuccess: async (payload) => {
      const fullTenantWithDetails: SaasTenantRow = {
        ...payload.tenant,
        ownerUsername: payload.owner.username,
        planName: payload.tenant.planName || (createForm.featurePlanId === 'plan_ultimate' ? 'المتكاملة' : createForm.featurePlanId === 'plan_pro' ? 'المتقدمة' : 'الأساسية'),
      } as any;
      setCreateResult({
        username: payload.owner.username,
        temporaryPassword: payload.owner.temporaryPassword,
        trialEndsAt: payload.tenant.trialEndsAt || '',
        tenantSlug: payload.tenant.slug,
        businessName: payload.tenant.businessName,
        fullTenant: fullTenantWithDetails,
      });
      setFeedback('تم إنشاء النسخة التجريبية بنجاح.');
      setCreateForm({
        slug: '',
        businessName: '',
        branchName: '',
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
        activityType: '',
        username: '',
        password: '',
        days: '14',
        source: '',
        campaign: '',
        notes: '',
        featurePlanId: 'plan_ultimate',
      });
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر إنشاء النسخة التجريبية.')),
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

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="page-stack page-shell saas-tenants-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="إدارة النسخ والمستأجرين"
          description="لوحة التحكم المركزية لإنشاء ومتابعة واشتراكات نسخ العملاء السحابية."
        badge={<span className="nav-pill" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>SaaS Admin</span>}
        actions={
          <button 
            type="button" 
            className="button"
            style={{
              background: 'linear-gradient(135deg, #170c5c 0%, #312e81 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontWeight: 800,
            }}
            onClick={() => { setIsCreateOpen(true); setCreateResult(null); }}
          >
            <span>+</span>
            <span>إنشاء نسخة تجريبية</span>
          </button>
        }
      />

      {feedback ? <div className={isForbiddenByApi ? 'warning-box' : 'success-box'}>{feedback}</div> : null}
      {isForbiddenByApi ? <div className="warning-box">هذه الصفحة مخصّصة لإدارة المنصة فقط.</div> : null}

      {ownerResetResult ? (
        <div className="saas-credentials-luxury-card">
          <div className="saas-credentials-hero">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="saas-credentials-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                    تم إعادة تعيين كلمة مرور المالك بنجاح
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    المنشأة: <strong style={{ color: '#0f172a' }}>{ownerResetResult.tenantName}</strong>
                  </div>
                </div>
              </div>
              <button type="button" className="saas-close-action-btn" onClick={() => setOwnerResetResult(null)}>
                إغلاق ✕
              </button>
            </div>
          </div>

          <div className="saas-credentials-grid">
            <div className="saas-credential-box">
              <span className="saas-credential-label">اسم المستخدم</span>
              <div className="saas-credential-content">
                <code className="saas-credential-code">{ownerResetResult.username}</code>
                <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(ownerResetResult.username)}>نسخ</button>
              </div>
            </div>

            <div className="saas-credential-box">
              <span className="saas-credential-label">كلمة المرور الجديدة</span>
              <div className="saas-credential-content">
                <code className="saas-credential-code password-highlight">{ownerResetResult.temporaryPassword}</code>
                <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(ownerResetResult.temporaryPassword)}>نسخ كلمة المرور</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <FormSection title="نسخ العملاء المسجلة">
        <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث بالاسم أو slug أو المالك أو رقم الهاتف...">
          <Field label="فلترة حسب الحالة">
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">جميع الحالات (الكل)</option>
              <option value="trial">تجريبية (Trial)</option>
              <option value="active">مفعلة (Active)</option>
              <option value="expired">منتهية (Expired)</option>
              <option value="suspended">موقوفة (Suspended)</option>
            </select>
          </Field>
        </SearchToolbar>

        <StatsGrid items={stats} className="stats-grid compact-grid saas-stats-grid-5" />

        {/* Quick Filter Tabs */}
        <div className="saas-filter-tabs">
          <button
            type="button"
            className={`saas-filter-tab-btn ${tabFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setTabFilter('all')}
          >
            <span>جميع النسخ</span>
            <span className="saas-filter-badge">{allTenants.length}</span>
          </button>
          <button
            type="button"
            className={`saas-filter-tab-btn ${tabFilter === 'active' ? 'is-active' : ''}`}
            onClick={() => setTabFilter('active')}
          >
            <span>مفعلة (نشطة)</span>
            <span className="saas-filter-badge">{allTenants.filter((r) => r.status === 'active').length}</span>
          </button>
          <button
            type="button"
            className={`saas-filter-tab-btn ${tabFilter === 'trial' ? 'is-active' : ''}`}
            onClick={() => setTabFilter('trial')}
          >
            <span>تجريبية</span>
            <span className="saas-filter-badge">{allTenants.filter((r) => r.status === 'trial').length}</span>
          </button>
          <button
            type="button"
            className={`saas-filter-tab-btn ${tabFilter === 'expiring_soon' ? 'is-active' : ''}`}
            onClick={() => setTabFilter('expiring_soon')}
            style={tabFilter !== 'expiring_soon' ? { borderColor: '#fed7aa', color: '#c2410c' } : {}}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>تنتهي قريباً (≤ 7 أيام)</span>
            <span className="saas-filter-badge" style={{ background: '#ffedd5', color: '#9a3412' }}>
              {allTenants.filter((r) => isExpiringSoon(r)).length}
            </span>
          </button>
          <button
            type="button"
            className={`saas-filter-tab-btn ${tabFilter === 'blocked' ? 'is-active' : ''}`}
            onClick={() => setTabFilter('blocked')}
          >
            <span>منتهية / موقوفة</span>
            <span className="saas-filter-badge">
              {allTenants.filter((r) => r.status === 'expired' || r.status === 'suspended' || isExpiredSub(r)).length}
            </span>
          </button>
        </div>

        <QueryFeedback
          isLoading={tenantsQuery.isLoading}
          isError={tenantsQuery.isError}
          error={tenantsQuery.error}
          isEmpty={!filteredTenants.length}
          loadingText="جاري تحميل قائمة النسخ والمستأجرين..."
          errorTitle={isForbiddenByApi ? 'غير مسموح' : 'تعذر تحميل نسخ العملاء'}
          emptyTitle="لا توجد نسخ مطابقة"
          emptyHint="جرّب تعديل معايير البحث أو أنشئ نسخة تجريبية جديدة."
        >
          <DataTable<SaasTenantRow>
            data={filteredTenants}
            getRowKey={(row) => row.id}
            defaultSort={{ columnId: 'createdAt', direction: 'desc' }}
            columns={[
              {
                id: 'business',
                header: 'النشاط والمعرف',
                align: 'center',
                sortable: true,
                sortValue: (row) => row.businessName || row.slug,
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          type="button" 
                          className="tenant-name-btn"
                          onClick={() => setDetailsTenantId(row.id)}
                          title="عرض تفاصيل وسجل النشاط"
                        >
                          {row.businessName || row.slug}
                        </button>
                        {isPlatform && (
                          <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            المنصة
                          </span>
                        )}
                      </div>
                      <div className="tenant-slug-badge" style={{ marginTop: '2px' }}>
                        <span>slug:</span>
                        <strong>{row.slug}</strong>
                      </div>
                    </div>
                  );
                },
              },
              {
                id: 'owner',
                header: 'المالك والاتصال',
                align: 'center',
                sortable: true,
                sortValue: (row) => row.ownerName,
                render: (row) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                      {row.ownerName || 'المسؤول'}
                    </strong>
                    {row.ownerPhone ? (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', direction: 'ltr', display: 'inline-block', marginTop: '1px' }}>
                        {row.ownerPhone}
                      </span>
                    ) : (
                      <span className="muted small">-</span>
                    )}
                    {row.ownerUsername ? (
                      <div
                        style={{
                          marginTop: '3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          color: '#170e5e',
                          fontWeight: 700,
                        }}
                        title="اسم المستخدم لتسجيل الدخول"
                      >
                        <span style={{ color: '#64748b', fontSize: '10px' }}>يوزر:</span>
                        <code style={{ fontFamily: 'monospace', direction: 'ltr' }}>{row.ownerUsername}</code>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: 'billing',
                header: 'الباقة',
                align: 'center',
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span className="tenant-plan-badge" style={{ background: '#f5f3ff', color: '#6b21a8', border: '1px solid #ddd6fe', fontWeight: 800, fontSize: '11px' }}>
                          حساب المؤسس
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className="tenant-plan-badge">
                        {row.planName || 'بدون باقة'}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: 'validity',
                header: 'الصلاحية',
                align: 'center',
                sortable: true,
                sortValue: (row) => row.subscriptionEndDate || row.trialEndsAt || '',
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                          دائم ∞
                        </span>
                      </div>
                    );
                  }
                  
                  const isTrial = row.status === 'trial';
                  if (isTrial) {
                    const days = row.trialDaysRemaining;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11.5px', color: '#475569' }}>
                          {row.trialEndsAt ? <bdi dir="ltr">{formatDate(row.trialEndsAt)}</bdi> : '-'}
                        </span>
                        {days != null && (
                          <span className={`tenant-trial-badge ${days > 5 ? 'healthy' : days > 0 ? 'warning' : 'danger'}`}>
                            {days > 0 ? `باقي ${days} يوم` : 'منتهية'}
                          </span>
                        )}
                      </div>
                    );
                  }

                  const days = getDaysRemaining(row.subscriptionEndDate);
                  const expiring = isExpiringSoon(row);
                  const expired = isExpiredSub(row);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                        {row.subscriptionEndDate ? (
                          <bdi dir="ltr">{formatDate(row.subscriptionEndDate)}</bdi>
                        ) : '-'}
                      </span>
                      {expired ? (
                        <span className="tenant-status-pill expired" style={{ fontSize: '10px', padding: '1px 5px' }}>
                          منتهي الصلاحية
                        </span>
                      ) : expiring ? (
                        <span className="tenant-status-pill expiring-soon" style={{ fontSize: '10px', padding: '1px 5px' }}>
                          ينتهي خلال {days} أيام
                        </span>
                      ) : days !== null && days > 7 ? (
                        <span className="muted small" style={{ color: '#15803d', fontSize: '10.5px' }}>
                          ● متبقي {days} يوم
                        </span>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                id: 'status',
                header: 'الحالة',
                align: 'center',
                sortable: true,
                sortValue: (row) => row.status,
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span className="tenant-status-pill active" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', color: '#6d28d9', fontWeight: 800 }}>
                          الرئيسية
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className={statusBadgeClass(row.status)}>
                        {statusLabel(row.status)}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: 'actions',
                header: 'الإجراءات',
                align: 'center',
                render: (row) => (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <TenantActionsMenu
                      row={row}
                      platformTenantId={platformTenantId}
                      currentTenantId={currentTenantId}
                      isImpersonating={impersonateMutation.isPending}
                      onImpersonate={(id, name) => {
                        if (window.confirm(`هل تريد تسجيل الدخول وتصفح نسخة (${name}) كمالك؟`)) {
                          impersonateMutation.mutate(id);
                        }
                      }}
                      onShowDetails={(id) => setDetailsTenantId(id)}
                      onShowSubscriptions={(r) => setSubscriptionsTenant(r)}
                      onShareWelcome={(r) => setWelcomeShareTenant({ tenant: r })}
                      onRenew={(r) => {
                        setRenewTenant({ id: r.id, name: r.businessName || r.slug });
                        setRenewPlanId('');
                        setRenewPaymentAmount('');
                      }}
                      onOpenActionHub={(r) => setActionHubTenant(r)}
                    />
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>
      </main>

      {/* ========================================================
          CREATE TRIAL TENANT MODAL
          ======================================================== */}
      {isCreateOpen && (
        <DialogShell
          open={isCreateOpen}
          onClose={() => { setIsCreateOpen(false); setCreateResult(null); }}
          width="840px"
          shellClassName="saas-create-modal-shell"
          ariaLabel="إنشاء نسخة تجريبية جديدة"
        >
          <div className="dialog-card saas-compact-dialog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  إنشاء نسخة تجريبية جديدة
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                  إدخال بيانات المنشأة والمالك لتوليد نسخة سحابية فورية بحساب كامل الصلاحيات.
                </p>
              </div>
              <button
                type="button"
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
                onClick={() => { setIsCreateOpen(false); setCreateResult(null); }}
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            {createResult ? (
              <div className="saas-credentials-luxury-card">
                {/* 1. Header with Success Badge and Business Title */}
                <div className="saas-credentials-hero">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="saas-credentials-icon-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                          تم تجهيز النسخة السحابية بنجاح
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                          المنشأة: <strong style={{ color: '#0f172a' }}>{createResult.businessName || createResult.tenantSlug}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="tenant-status-pill trial" style={{ fontSize: '11px', padding: '3px 10px', fontWeight: 800 }}>
                      تجريبي • 14 يوماً
                    </span>
                  </div>
                </div>

                {/* 2. Credentials Grid */}
                <div className="saas-credentials-grid">
                  {/* Slug */}
                  <div className="saas-credential-box">
                    <span className="saas-credential-label">المعرف السحابي (Slug)</span>
                    <div className="saas-credential-content">
                      <code className="saas-credential-code">{createResult.tenantSlug}</code>
                      <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.tenantSlug || '')}>نسخ</button>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="saas-credential-box">
                    <span className="saas-credential-label">اسم مستخدم المالك (Super Admin)</span>
                    <div className="saas-credential-content">
                      <code className="saas-credential-code">{createResult.username}</code>
                      <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.username || '')}>نسخ</button>
                    </div>
                  </div>

                  {/* Temporary Password */}
                  <div className="saas-credential-box" style={{ gridColumn: 'span 2' }}>
                    <span className="saas-credential-label">كلمة المرور المؤقتة (Temporary Password)</span>
                    <div className="saas-credential-content">
                      <code className="saas-credential-code password-highlight">{createResult.temporaryPassword}</code>
                      <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.temporaryPassword || '')}>نسخ كلمة المرور</button>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="saas-credential-box" style={{ gridColumn: 'span 2' }}>
                    <span className="saas-credential-label">تاريخ انتهاء الفترة التجريبية</span>
                    <div className="saas-credential-content">
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                        {formatDate(createResult.trialEndsAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Action Bar */}
                <div className="saas-credentials-actions">
                  {createResult.fullTenant && (
                    <button
                      type="button"
                      className="saas-whatsapp-action-btn"
                      onClick={() => {
                        setWelcomeShareTenant({
                          tenant: {
                            ...createResult.fullTenant!,
                            ownerUsername: createResult.username,
                          },
                          temporaryPassword: createResult.temporaryPassword,
                          username: createResult.username,
                        });
                        setIsCreateOpen(false);
                        setCreateResult(null);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>مشاركة رسالة الترحيب عبر واتساب</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="saas-copy-all-btn"
                    onClick={() => {
                      const allText = `بيانات الدخول للنسخة السحابية:\nاسم المنشأة: ${createResult.businessName || createResult.tenantSlug}\nالمعرف: ${createResult.tenantSlug}\nاسم المستخدم: ${createResult.username}\nكلمة المرور المؤقتة: ${createResult.temporaryPassword}\nصلاحية التجربة حتى: ${formatDate(createResult.trialEndsAt)}`;
                      copyToClipboard(allText);
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>نسخ كامل البيانات</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="saas-close-action-btn"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setCreateResult(null);
                    }}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); createTrialMutation.mutate(); }}>
                {/* 1. النشاط التجاري */}
                <div className="saas-modal-card">
                  <div className="saas-modal-card-title">
                    <span>1. بيانات النشاط التجاري</span>
                  </div>
                  <div className="saas-modal-grid-3">
                    <Field label="اسم النشاط / المحل *">
                      <input
                        type="text"
                        required
                        value={createForm.businessName}
                        onChange={(e) => setCreateForm((s) => ({ ...s, businessName: e.target.value }))}
                        placeholder="مثال: سوبر ماركت النور"
                      />
                    </Field>
                    <Field label="المعرف السحابي (Slug - إنجليزي فقط) *">
                      <input
                        type="text"
                        required
                        value={createForm.slug}
                        onChange={(e) => setCreateForm((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                        placeholder="مثال: al-nour-market"
                        dir="ltr"
                      />
                    </Field>
                    <Field label="نوع النشاط / المجال">
                      <input
                        type="text"
                        value={createForm.activityType}
                        onChange={(e) => setCreateForm((s) => ({ ...s, activityType: e.target.value }))}
                        placeholder="مثال: سوبر ماركت، صيدلية، مطعم..."
                      />
                    </Field>
                    <Field label="اسم الفرع الأولي (اختياري)">
                      <input
                        type="text"
                        value={createForm.branchName}
                        onChange={(e) => setCreateForm((s) => ({ ...s, branchName: e.target.value }))}
                        placeholder="مثال: فرع التعاونيات (افتراضي: الفرع الرئيسي)"
                      />
                    </Field>
                  </div>
                </div>

                {/* 2. بيانات المالك والدخول */}
                <div className="saas-modal-card">
                  <div className="saas-modal-card-title">
                    <span>2. بيانات المالك وحساب الإدارة</span>
                  </div>
                  <div className="saas-modal-grid-3">
                    <Field label="اسم المالك *">
                      <input
                        type="text"
                        required
                        value={createForm.ownerName}
                        onChange={(e) => setCreateForm((s) => ({ ...s, ownerName: e.target.value }))}
                        placeholder="مثال: محمد أحمد"
                      />
                    </Field>
                    <Field label="رقم هاتف المالك *">
                      <input
                        type="text"
                        required
                        value={createForm.ownerPhone}
                        onChange={(e) => setCreateForm((s) => ({ ...s, ownerPhone: e.target.value }))}
                        placeholder="مثال: 01018017523"
                        dir="auto"
                      />
                    </Field>
                    <Field label="البريد الإلكتروني (اختياري)">
                      <input
                        type="email"
                        value={createForm.ownerEmail}
                        onChange={(e) => setCreateForm((s) => ({ ...s, ownerEmail: e.target.value }))}
                        placeholder="owner@example.com"
                        dir="ltr"
                      />
                    </Field>
                  </div>
                  <div className="saas-modal-grid-2" style={{ marginTop: '6px' }}>
                    <Field label="اسم المستخدم">
                      <input
                        type="text"
                        value={createForm.username}
                        onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))}
                        placeholder="افتراضي: admin"
                        dir="ltr"
                      />
                    </Field>
                    <Field label="كلمة المرور">
                      <input
                        type="text"
                        value={createForm.password}
                        onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                        placeholder="فارغ = توليد تلقائي"
                        dir="ltr"
                      />
                    </Field>
                  </div>
                </div>

                {/* 3 & 4. باقة التجربة والمتابعة */}
                <div className="saas-modal-dual-cards">
                  <div className="saas-modal-card">
                    <div className="saas-modal-card-title">
                      <span>3. باقة التجربة والميزات</span>
                    </div>
                    <Field label="خطة الميزات المفعلة للنسخة *">
                      <select
                        value={createForm.featurePlanId}
                        onChange={(e) => setCreateForm((s) => ({ ...s, featurePlanId: e.target.value }))}
                        style={{ fontWeight: 700, width: '100%' }}
                      >
                        <option value="plan_ultimate">المتكاملة (الباقة الشاملة - كافة الميزات)</option>
                        <option value="plan_pro">الاحترافية (المبيعات، المخازن، الحسابات)</option>
                        <option value="plan_basic">الأساسية (نقطة البيع، الكاشير، المخزون)</option>
                        {featurePlans
                          .filter((p: any) => !['plan_ultimate', 'plan_pro', 'plan_basic'].includes(p.id))
                          .map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                          ))}
                      </select>
                    </Field>
                    <div style={{ marginTop: '6px' }}>
                      <Field label="مدة التجربة (أيام)">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={createForm.days}
                          onChange={(e) => setCreateForm((s) => ({ ...s, days: e.target.value }))}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="saas-modal-card">
                    <div className="saas-modal-card-title">
                      <span>4. إعدادات التجربة والمتابعة</span>
                    </div>
                    <div className="saas-modal-grid-2">
                      <Field label="المصدر / القناة">
                        <input
                          type="text"
                          value={createForm.source}
                          onChange={(e) => setCreateForm((s) => ({ ...s, source: e.target.value }))}
                          placeholder="مثال: فيسبوك، إحالة عميل..."
                        />
                      </Field>
                      <Field label="اسم الحملة الإعلانية">
                        <input
                          type="text"
                          value={createForm.campaign}
                          onChange={(e) => setCreateForm((s) => ({ ...s, campaign: e.target.value }))}
                          placeholder="اختياري"
                        />
                      </Field>
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <Field label="ملاحظات إضافية">
                        <input
                          type="text"
                          value={createForm.notes}
                          onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
                          placeholder="أي ملاحظات خاصة بالتسجيل أو المتابعة"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsCreateOpen(false)}
                    style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="button"
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '8px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                    disabled={createTrialMutation.isPending || !createForm.businessName || !createForm.slug || !createForm.ownerPhone}
                  >
                    {createTrialMutation.isPending ? 'جاري إنشاء النسخة...' : 'إنشاء النسخة التجريبية'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </DialogShell>
      )}

      {/* ========================================================
          RESET OWNER PASSWORD MODAL
          ======================================================== */}
      {resetTenant && (
        <DialogShell
          open={Boolean(resetTenant)}
          onClose={() => setResetTenant(null)}
          width="480px"
          ariaLabel="إعادة تعيين كلمة مرور المالك"
        >
          <div className="dialog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                إعادة كلمة مرور مالك النسخة
              </h3>
              <button type="button" className="dialog-shell-close-btn" onClick={() => setResetTenant(null)}>✕</button>
            </div>
            <p className="muted small" style={{ marginBottom: '14px' }}>
              النسخة المستهدفة: <strong>{resetTenant.name}</strong>
            </p>
            <div className="stack gap-12">
              <Field label="كلمة المرور الجديدة (اختياري)">
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="اترك فارغاً لتوليد كلمة مرور عشوائية أو اكتب أي كلمة مرور"
                  dir="ltr"
                />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="button button-secondary" onClick={() => setResetTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    resetOwnerPasswordMutation.mutate({ tenantId: resetTenant.id, tenantName: resetTenant.name, newPassword: resetPassword });
                    setResetTenant(null);
                  }}
                  disabled={resetOwnerPasswordMutation.isPending}
                >
                  تأكيد وإعادة التعيين
                </button>
              </div>
            </div>
          </div>
        </DialogShell>
      )}

      {/* ========================================================
          UPGRADE / ACTIVATE TENANT MODAL
          ======================================================== */}
      {upgradeTenant && (
        <DialogShell
          open={Boolean(upgradeTenant)}
          onClose={() => setUpgradeTenant(null)}
          width="520px"
          ariaLabel="تفعيل أو ترقية الخطة"
        >
          <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    تفعيل / ترقية الاشتراك
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    النسخة: <strong style={{ color: '#0f172a' }}>{upgradeTenant.name}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="dialog-shell-close-btn"
                onClick={() => setUpgradeTenant(null)}
                style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div className="stack gap-12">
              <Field label="الخطة / الباقة المستهدفة *">
                <select value={upgradePlanId} onChange={(e) => setUpgradePlanId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- اختر الباقة --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="مدة الاشتراك">
                <select value={upgradeDuration} onChange={(e) => setUpgradeDuration(Number(e.target.value))}>
                  <option value={1}>شهر واحد</option>
                  <option value={3}>3 أشهر</option>
                  <option value={6}>6 أشهر</option>
                  <option value={12}>سنة واحدة</option>
                  <option value={60}>5 سنوات (شامل / مدى الحياة)</option>
                </select>
              </Field>
              <div className="saas-modal-grid-2">
                <Field label="المبلغ المدفوع (اختياري)">
                  <input
                    type="number"
                    min="0"
                    value={upgradePaymentAmount}
                    onChange={(e) => setUpgradePaymentAmount(Number(e.target.value))}
                    placeholder="المبلغ المحصل"
                  />
                </Field>
                <Field label="طريقة الدفع">
                  <select value={upgradePaymentMethod} onChange={(e) => setUpgradePaymentMethod(e.target.value)}>
                    <option value="cash">نقدي (Cash)</option>
                    <option value="transfer">تحويل بنكي / فودافون كاش</option>
                    <option value="card">بطاقة دفع (Card)</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="button button-secondary" onClick={() => setUpgradeTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}
                  onClick={() => {
                    tenantActionMutation.mutate({ 
                      action: 'activate', 
                      tenantId: upgradeTenant.id, 
                      durationMonths: upgradeDuration,
                      planId: upgradePlanId || undefined,
                      paymentAmount: upgradePaymentAmount ? Number(upgradePaymentAmount) : undefined,
                      paymentMethod: upgradePaymentMethod,
                    });
                    setUpgradeTenant(null);
                  }}
                  disabled={tenantActionMutation.isPending || !upgradePlanId}
                >
                  تأكيد التفعيل والترقية
                </button>
              </div>
            </div>
          </div>
        </DialogShell>
      )}

      {/* ========================================================
          RENEW SUBSCRIPTION MODAL
          ======================================================== */}
      {renewTenant && (
        <DialogShell
          open={Boolean(renewTenant)}
          onClose={() => setRenewTenant(null)}
          width="520px"
          ariaLabel="تجديد الاشتراك"
        >
          <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    تجديد اشتراك النسخة
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    المنشأة: <strong style={{ color: '#0f172a' }}>{renewTenant.name}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="dialog-shell-close-btn"
                onClick={() => setRenewTenant(null)}
                style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div className="stack gap-12">
              <Field label="الخطة / الباقة *">
                <select value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- اختر الباقة للتجديد --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="مدة التجديد (أشهر)">
                <select value={renewDuration} onChange={(e) => setRenewDuration(Number(e.target.value))}>
                  <option value={1}>شهر واحد</option>
                  <option value={3}>3 أشهر</option>
                  <option value={6}>6 أشهر</option>
                  <option value={12}>سنة واحدة</option>
                </select>
              </Field>
              <div className="saas-modal-grid-2">
                <Field label="المبلغ المدفوع (اختياري)">
                  <input
                    type="number"
                    min="0"
                    value={renewPaymentAmount}
                    onChange={(e) => setRenewPaymentAmount(Number(e.target.value))}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="طريقة الدفع">
                  <select value={renewPaymentMethod} onChange={(e) => setRenewPaymentMethod(e.target.value)}>
                    <option value="cash">نقدي</option>
                    <option value="transfer">تحويل بنكي / محفظة</option>
                    <option value="card">بطاقة</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="button button-secondary" onClick={() => setRenewTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}
                  onClick={() => {
                    renewMutation.mutate({ 
                      tenantId: renewTenant.id, 
                      durationMonths: renewDuration,
                      planId: Number(renewPlanId),
                      paymentAmount: renewPaymentAmount ? Number(renewPaymentAmount) : undefined,
                      paymentMethod: renewPaymentMethod,
                    });
                    setRenewTenant(null);
                  }}
                  disabled={renewMutation.isPending || !renewPlanId}
                >
                  تأكيد التجديد
                </button>
              </div>
            </div>
          </div>
        </DialogShell>
      )}

      {/* ========================================================
          RECORD MANUAL PAYMENT MODAL
          ======================================================== */}
      {recordPaymentTenant && (
        <DialogShell
          open={Boolean(recordPaymentTenant)}
          onClose={() => setRecordPaymentTenant(null)}
          width="520px"
          ariaLabel="تسجيل دفعة يدوية"
        >
          <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    تسجيل دفعة مالية يدوية
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    النسخة: <strong style={{ color: '#0f172a' }}>{recordPaymentTenant.name}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="dialog-shell-close-btn"
                onClick={() => setRecordPaymentTenant(null)}
                style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div className="stack gap-12">
              <div className="saas-modal-grid-2">
                <Field label="المبلغ *">
                  <input
                    type="number"
                    min="0"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="العملة">
                  <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value)}>
                    <option value="EGP">EGP (جنيه)</option>
                    <option value="USD">USD (دولار)</option>
                    <option value="SAR">SAR (ريال)</option>
                  </select>
                </Field>
              </div>
              <Field label="طريقة الدفع">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">نقدي (Cash)</option>
                  <option value="transfer">تحويل بنكي / محفظة إلكترونية</option>
                  <option value="card">بطاقة ائتمان (Card)</option>
                </select>
              </Field>
              <Field label="رقم المرجع / الإيصال (اختياري)">
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="رقم الحوالة أو الإيصال"
                />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="button button-secondary" onClick={() => setRecordPaymentTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}
                  onClick={() => {
                    recordPaymentMutation.mutate({ 
                      tenantId: recordPaymentTenant.id, 
                      amount: Number(paymentAmount),
                      currency: paymentCurrency,
                      method: paymentMethod,
                      reference: paymentReference,
                    });
                  }}
                  disabled={recordPaymentMutation.isPending || !paymentAmount}
                >
                  حفظ الدفعة
                </button>
              </div>
            </div>
          </div>
        </DialogShell>
      )}

      {detailsTenantId && <TenantDetailsModal tenantId={detailsTenantId} onClose={() => setDetailsTenantId(null)} />}

      {updatePlanTenant && (
        <UpdateTenantPlanModal 
          tenant={updatePlanTenant} 
          onClose={() => setUpdatePlanTenant(null)} 
          onSuccess={(msg) => { setFeedback(msg); setUpdatePlanTenant(null); }} 
        />
      )}

      {subscriptionsTenant && (
        <TenantSubscriptionsModal
          tenant={subscriptionsTenant}
          onClose={() => setSubscriptionsTenant(null)}
          onRenew={(r) => {
            setSubscriptionsTenant(null);
            setRenewTenant({ id: r.id, name: r.businessName || r.slug });
            setRenewPlanId('');
            setRenewPaymentAmount('');
          }}
          onRecordPayment={(r) => {
            setSubscriptionsTenant(null);
            setRecordPaymentTenant({ id: r.id, name: r.businessName || r.slug });
            setPaymentAmount('');
            setPaymentReference('');
          }}
        />
      )}

      {welcomeShareTenant && (
        <TenantWelcomeShareModal
          tenant={welcomeShareTenant.tenant}
          temporaryPassword={welcomeShareTenant.temporaryPassword}
          username={welcomeShareTenant.username}
          onClose={() => setWelcomeShareTenant(null)}
        />
      )}

      {actionHubTenant && (
        <TenantActionHubModal
          tenant={actionHubTenant}
          platformTenantId={platformTenantId}
          currentTenantId={currentTenantId}
          onClose={() => setActionHubTenant(null)}
          onImpersonate={(id, name) => {
            setActionHubTenant(null);
            if (window.confirm(`هل تريد تسجيل الدخول وتصفح نسخة (${name}) كمالك؟`)) {
              impersonateMutation.mutate(id);
            }
          }}
          onShowDetails={(id) => {
            setActionHubTenant(null);
            setDetailsTenantId(id);
          }}
          onShowSubscriptions={(r) => {
            setActionHubTenant(null);
            setSubscriptionsTenant(r);
          }}
          onShareWelcome={(r) => {
            setActionHubTenant(null);
            setWelcomeShareTenant({ tenant: r });
          }}
          onUpgrade={(r) => {
            setActionHubTenant(null);
            setUpgradeTenant({ id: r.id, name: r.businessName || r.slug });
            setUpgradePlanId('');
            setUpgradePaymentAmount('');
          }}
          onUpdatePlan={(r) => {
            setActionHubTenant(null);
            setUpdatePlanTenant(r);
          }}
          onRenew={(r) => {
            setActionHubTenant(null);
            setRenewTenant({ id: r.id, name: r.businessName || r.slug });
            setRenewPlanId('');
            setRenewPaymentAmount('');
          }}
          onRecordPayment={(r) => {
            setActionHubTenant(null);
            setRecordPaymentTenant({ id: r.id, name: r.businessName || r.slug });
            setPaymentAmount('');
            setPaymentReference('');
          }}
          onExtendTrial={(id) => {
            setActionHubTenant(null);
            extendTrialMutation.mutate({ tenantId: id, days: 7 });
          }}
          onResetPassword={(r) => {
            setActionHubTenant(null);
            setResetTenant({ id: r.id, name: r.businessName || r.slug });
            setResetPassword('');
          }}
          onUnlockOwner={(id) => {
            setActionHubTenant(null);
            tenantActionMutation.mutate({ action: 'unlockOwner', tenantId: id });
          }}
          onSuspend={(id) => {
            setActionHubTenant(null);
            if (window.confirm('هل تريد إيقاف هذه النسخة مؤقتاً؟ لن يتمكن المستخدمون من الدخول حتى إعادة التفعيل.')) {
              tenantActionMutation.mutate({ action: 'suspend', tenantId: id });
            }
          }}
          onExpire={(id) => {
            setActionHubTenant(null);
            tenantActionMutation.mutate({ action: 'expire', tenantId: id });
          }}
          onDelete={(id, name) => {
            setActionHubTenant(null);
            if (window.confirm(`هل أنت متأكد تماماً من حذف نسخة (${name}) بجميع قواعد بياناتها وسجلاتها؟\nلا يمكن التراجع عن هذا الإجراء!`)) {
              tenantActionMutation.mutate({ action: 'delete', tenantId: id });
            }
          }}
        />
      )}
    </div>
  );
}
