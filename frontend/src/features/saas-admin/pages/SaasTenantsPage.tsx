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
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';
import { ApiError } from '@/lib/http';
import { isPlatformAdmin } from '@/app/router/access';
import { saasAdminApi, SaasTenantRow, SaasTenantStatus } from '@/features/saas-admin/api/saas-admin.api';
import { TenantDetailsModal } from '../components/TenantDetailsModal';

type TenantActionKey = 'activate' | 'suspend' | 'expire' | 'unlockOwner' | 'delete';
type SaasTenantsResponse = { tenants: SaasTenantRow[] };

function statusLabel(status: SaasTenantStatus): string {
  if (status === 'trial') return 'تجريبية';
  if (status === 'active') return 'مفعلة';
  if (status === 'expired') return 'منتهية';
  if (status === 'suspended') return 'موقوفة';
  return String(status || 'غير معروف');
}

function statusClass(status: SaasTenantStatus): string {
  if (status === 'active') return 'pill success';
  if (status === 'trial') return 'pill warning';
  if (status === 'suspended') return 'pill danger';
  if (status === 'expired') return 'pill muted';
  return 'pill';
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [createResult, setCreateResult] = useState<{ username: string; temporaryPassword: string; trialEndsAt: string } | null>(null);
  const [ownerResetResult, setOwnerResetResult] = useState<{ tenantName: string; username: string; temporaryPassword: string } | null>(null);
  
  const [resetTenant, setResetTenant] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  
  const [upgradeTenant, setUpgradeTenant] = useState<{ id: string } | null>(null);
  const [upgradeDuration, setUpgradeDuration] = useState<number>(1);
  const [upgradePlanId, setUpgradePlanId] = useState<number | ''>('');
  const [upgradePaymentAmount, setUpgradePaymentAmount] = useState<number | ''>('');
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('cash');

  const [renewTenant, setRenewTenant] = useState<{ id: string } | null>(null);
  const [renewDuration, setRenewDuration] = useState<number>(1);
  const [renewPlanId, setRenewPlanId] = useState<number | ''>('');
  const [renewPaymentAmount, setRenewPaymentAmount] = useState<number | ''>('');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash');

  const [recordPaymentTenant, setRecordPaymentTenant] = useState<{ id: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentCurrency, setPaymentCurrency] = useState('EGP');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');

  const [detailsTenantId, setDetailsTenantId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => saasAdminApi.listPlans(),
    enabled: canAccess,
  });
  const plans = plansQuery.data || [];
  
  const [createForm, setCreateForm] = useState({
    slug: '',
    businessName: '',
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
  });

  const tenantsQuery = useQuery<SaasTenantsResponse>({
    queryKey: ['saas-admin-tenants', status, search],
    queryFn: () => saasAdminApi.tenants({
      status: status === 'all' ? undefined : status,
      search: search.trim() || undefined,
    }),
    enabled: canAccess,
  });

  const tenants: SaasTenantRow[] = tenantsQuery.data?.tenants ?? [];
  const isForbiddenByApi = tenantsQuery.error instanceof ApiError && tenantsQuery.error.status === 403;

  const stats = useMemo(() => {
    const total = tenants.length;
    const trial = tenants.filter((row) => row.status === 'trial').length;
    const active = tenants.filter((row) => row.status === 'active').length;
    const blocked = tenants.filter((row) => row.status === 'expired' || row.status === 'suspended').length;
    return [
      { key: 'total', label: 'إجمالي النسخ', value: total },
      { key: 'trial', label: 'تجريبية', value: trial },
      { key: 'active', label: 'مفعلة', value: active },
      { key: 'blocked', label: 'منتهية/موقوفة', value: blocked },
    ];
  }, [tenants]);

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
    mutationFn: (input: { tenantId: string; durationMonths: number; planId: number; paymentAmount?: number; paymentMethod?: string }) => 
      saasAdminApi.renewTenant(input.tenantId, input),
    onSuccess: async () => {
      setFeedback('تم تجديد الاشتراك بنجاح.');
      await invalidateTenants();
      setRenewTenant(null);
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تجديد الاشتراك.')),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (input: { tenantId: string; amount: number; currency: string; method: string; reference?: string }) => 
      saasAdminApi.recordPayment(input.tenantId, input),
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
      saasAdminApi.resetOwnerPassword(input.tenantId, input.newPassword).then((res) => ({ ...res, tenantName: input.tenantName })),
    onSuccess: async (payload) => {
      setOwnerResetResult({
        tenantName: payload.tenantName,
        username: payload.owner.username,
        temporaryPassword: payload.owner.temporaryPassword,
      });
      setFeedback('تمت إعادة كلمة مرور مالك النسخة بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر إعادة كلمة مرور مالك النسخة.')),
  });

  const createTrialMutation = useMutation({
    mutationFn: () => saasAdminApi.createTrialTenant({
      slug: createForm.slug,
      businessName: createForm.businessName,
      ownerName: createForm.ownerName,
      ownerPhone: createForm.ownerPhone,
      ownerEmail: createForm.ownerEmail || undefined,
      activityType: createForm.activityType || undefined,
      username: createForm.username,
      password: createForm.password || undefined,
      days: Number(createForm.days || 14),
      source: createForm.source || undefined,
      campaign: createForm.campaign || undefined,
      notes: createForm.notes || undefined,
    }),
    onSuccess: async (payload) => {
      setCreateResult({
        username: payload.owner.username,
        temporaryPassword: payload.owner.temporaryPassword,
        trialEndsAt: payload.tenant.trialEndsAt || '',
      });
      setFeedback('تم إنشاء النسخة التجريبية بنجاح.');
      setCreateForm({
        slug: '',
        businessName: '',
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
      });
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر إنشاء النسخة التجريبية.')),
  });

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="page-stack page-shell">
      <PageHeader
        title="إدارة نسخ العملاء"
        description="إنشاء ومتابعة النسخ التجريبية والفعالة."
        badge={<span className="nav-pill">SaaS Admin</span>}
        actions={<button type="button" className="button" onClick={() => { setIsCreateOpen(true); setCreateResult(null); }}>إنشاء نسخة تجريبية</button>}
      />

      {feedback ? <div className={isForbiddenByApi ? 'warning-box' : 'success-box'}>{feedback}</div> : null}
      {isForbiddenByApi ? <div className="warning-box">هذه الصفحة مخصّصة لإدارة المنصة فقط.</div> : null}
      {ownerResetResult ? (
        <div className="warning-box">
          <div><strong>تم إعادة كلمة مرور مالك النسخة</strong></div>
          <div>النسخة: <strong>{ownerResetResult.tenantName}</strong></div>
          <div>اسم المستخدم: <strong>{ownerResetResult.username}</strong></div>
          <div>كلمة المرور المؤقتة: <strong>{ownerResetResult.temporaryPassword}</strong></div>
          <div className="muted small">تظهر كلمة المرور مرة واحدة فقط. انسخها الآن.</div>
        </div>
      ) : null}

      <FormSection title="نسخ العملاء">
        <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث بالاسم أو slug أو المالك أو الهاتف">
          <Field label="الحالة">
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">الكل</option>
              <option value="trial">تجريبية</option>
              <option value="active">مفعلة</option>
              <option value="expired">منتهية</option>
              <option value="suspended">موقوفة</option>
            </select>
          </Field>
        </SearchToolbar>

        <StatsGrid items={stats} />

        <QueryFeedback
          isLoading={tenantsQuery.isLoading}
          isError={tenantsQuery.isError}
          error={tenantsQuery.error}
          isEmpty={!tenants.length}
          loadingText="جاري تحميل النسخ..."
          errorTitle={isForbiddenByApi ? 'غير مسموح' : 'تعذر تحميل نسخ العملاء'}
          emptyTitle="لا توجد نسخ مطابقة"
          emptyHint="جرّب تعديل الفلتر أو أنشئ نسخة تجريبية جديدة."
        >
          <DataTable<SaasTenantRow>
            data={tenants}
            getRowKey={(row) => row.id}
            defaultSort={{ columnId: 'createdAt', direction: 'desc' }}
            columns={[
              {
                id: 'business',
                header: 'النشاط',
                sortable: true,
                sortValue: (row) => row.businessName,
                render: (row) => (
                  <button type="button" className="text-blue-600 hover:underline font-bold" onClick={() => setDetailsTenantId(row.id)}>
                    {row.businessName || row.slug}
                  </button>
                ),
              },
              {
                id: 'owner',
                header: 'المالك',
                sortable: true,
                sortValue: (row) => row.ownerName,
                render: (row) => <span>{row.ownerName}</span>,
              },
              {
                id: 'username',
                header: 'المستخدم',
                sortable: true,
                sortValue: (row) => row.ownerUsername,
                render: (row) => <span>{row.ownerUsername}</span>,
              },
              {
                id: 'phone',
                header: 'الموبايل',
                sortable: true,
                sortValue: (row) => row.ownerPhone,
                render: (row) => <span>{row.ownerPhone}</span>,
              },
              {
                id: 'email',
                header: 'البريد الإلكتروني',
                sortable: true,
                sortValue: (row) => row.ownerEmail,
                render: (row) => <span>{row.ownerEmail || '-'}</span>,
              },
              {
                id: 'billing',
                header: 'الاشتراك الحالي',
                render: (row) => (
                  <div className="stack gap-4">
                    <strong>{row.planName || 'بدون خطة'}</strong>
                    <span className="muted small">{row.subscriptionStatus === 'active' ? 'مفعل' : row.subscriptionStatus === 'past_due' ? 'فترة سماح' : row.subscriptionStatus || '-'}</span>
                  </div>
                ),
              },
              {
                id: 'dates',
                header: 'صلاحية الاشتراك',
                render: (row) => (
                  <div className="stack gap-4">
                    <span className="small">{row.subscriptionEndDate ? `ينتهي: ${formatDate(row.subscriptionEndDate)}` : '-'}</span>
                    <span className="muted small">{row.graceEndDate ? `سماح لغاية: ${formatDate(row.graceEndDate)}` : ''}</span>
                  </div>
                ),
              },
              {
                id: 'status',
                header: 'الحالة',
                sortable: true,
                sortValue: (row) => row.status,
                render: (row) => <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>,
              },
              {
                id: 'trial',
                header: 'انتهاء التجربة',
                sortable: true,
                sortValue: (row) => row.trialEndsAt || '',
                render: (row) => (
                  <div className="stack gap-4">
                    <span>{row.trialEndsAt ? formatDate(row.trialEndsAt) : '-'}</span>
                    <span className="muted small">{row.trialDaysRemaining == null ? '-' : `${row.trialDaysRemaining} يوم`}</span>
                  </div>
                ),
              },
              {
                id: 'actions',
                header: 'إجراءات',
                render: (row) => {
                  const isPlatformTenantRow = String(row.id || '').trim() === platformTenantId;
                  if (isPlatformTenantRow) {
                    return <span className="muted small">نسخة المنصة</span>;
                  }
                  return (
                    <div className="actions compact-actions">
                      <button type="button" className="button button-secondary" onClick={() => setUpgradeTenant({ id: row.id })}>تفعيل / ترقية</button>
                      <button type="button" className="button button-secondary" onClick={() => setRenewTenant({ id: row.id })}>تجديد الاشتراك</button>
                      <button type="button" className="button button-secondary" onClick={() => setRecordPaymentTenant({ id: row.id })}>تسجيل دفعة</button>
                      <button type="button" className="button button-secondary" onClick={() => tenantActionMutation.mutate({ action: 'suspend', tenantId: row.id })}>إيقاف</button>
                      <button type="button" className="button button-secondary" onClick={() => tenantActionMutation.mutate({ action: 'expire', tenantId: row.id })}>إنهاء</button>
                      <button type="button" className="button button-secondary" onClick={() => extendTrialMutation.mutate({ tenantId: row.id, days: 7 })}>+7 أيام</button>
                      <button type="button" className="button button-secondary" onClick={() => tenantActionMutation.mutate({ action: 'unlockOwner', tenantId: row.id })}>فك قفل المالك</button>
                      <button type="button" className="button button-secondary" onClick={() => {
                        setResetTenant({ id: row.id, name: row.businessName });
                        setResetPassword('');
                      }}>إعادة كلمة المرور</button>
                      <button type="button" className="button button-danger" onClick={() => {
                        if (window.confirm('هل أنت متأكد من حذف هذا العميل بجميع بياناته بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسح كل شيء!')) {
                          tenantActionMutation.mutate({ action: 'delete', tenantId: row.id });
                        }
                      }}>حذف نهائي</button>
                    </div>
                  );
                },
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>

      {isCreateOpen ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="إنشاء نسخة تجريبية">
            <FormSection title="إنشاء نسخة تجريبية" actions={<button type="button" className="button button-secondary" onClick={() => setIsCreateOpen(false)}>إغلاق</button>}>
              <div className="grid-2">
                <Field label="المعرف (Slug - إنجليزي فقط)"><input value={createForm.slug} onChange={(event) => setCreateForm((s) => ({ ...s, slug: event.target.value }))} placeholder="أحرف إنجليزية وأرقام" dir="ltr" /></Field>
                <Field label="اسم النشاط"><input value={createForm.businessName} onChange={(event) => setCreateForm((s) => ({ ...s, businessName: event.target.value }))} /></Field>
                <Field label="اسم المالك"><input value={createForm.ownerName} onChange={(event) => setCreateForm((s) => ({ ...s, ownerName: event.target.value }))} /></Field>
                <Field label="هاتف المالك"><input value={createForm.ownerPhone} onChange={(event) => setCreateForm((s) => ({ ...s, ownerPhone: event.target.value }))} /></Field>
                <Field label="البريد الإلكتروني"><input value={createForm.ownerEmail} onChange={(event) => setCreateForm((s) => ({ ...s, ownerEmail: event.target.value }))} /></Field>
                <Field label="نوع النشاط"><input value={createForm.activityType} onChange={(event) => setCreateForm((s) => ({ ...s, activityType: event.target.value }))} /></Field>
                <Field label="اسم المستخدم"><input value={createForm.username} onChange={(event) => setCreateForm((s) => ({ ...s, username: event.target.value }))} /></Field>
                <Field label="كلمة المرور (اختياري)"><input value={createForm.password} onChange={(event) => setCreateForm((s) => ({ ...s, password: event.target.value }))} /></Field>
                <Field label="أيام التجربة"><input type="number" min={1} max={365} value={createForm.days} onChange={(event) => setCreateForm((s) => ({ ...s, days: event.target.value }))} /></Field>
                <Field label="المصدر"><input value={createForm.source} onChange={(event) => setCreateForm((s) => ({ ...s, source: event.target.value }))} /></Field>
                <Field label="الحملة"><input value={createForm.campaign} onChange={(event) => setCreateForm((s) => ({ ...s, campaign: event.target.value }))} /></Field>
                <Field label="ملاحظات"><input value={createForm.notes} onChange={(event) => setCreateForm((s) => ({ ...s, notes: event.target.value }))} /></Field>
              </div>
              <div className="actions">
                <button type="button" className="button" onClick={() => createTrialMutation.mutate()} disabled={createTrialMutation.isPending}>
                  {createTrialMutation.isPending ? 'جارٍ الإنشاء...' : 'إنشاء النسخة'}
                </button>
              </div>
              {createResult ? (
                <div className="warning-box">
                  <div><strong>تم إنشاء النسخة بنجاح</strong></div>
                  <div>اسم المستخدم: <strong>{createResult.username}</strong></div>
                  <div>كلمة المرور المؤقتة: <strong>{createResult.temporaryPassword}</strong></div>
                  <div>تنتهي التجربة: <strong>{formatDate(createResult.trialEndsAt)}</strong></div>
                  <div className="muted small">تظهر كلمة المرور مرة واحدة فقط. انسخها الآن.</div>
                </div>
              ) : null}
            </FormSection>
          </div>
        </div>
      ) : null}
      {resetTenant ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="إعادة كلمة المرور">
            <FormSection title={`إعادة كلمة المرور لنسخة: ${resetTenant.name}`} actions={<button type="button" className="button button-secondary" onClick={() => setResetTenant(null)}>إغلاق</button>}>
              <div className="stack gap-12">
                <p>اترك الحقل فارغاً لتوليد كلمة مرور عشوائية قوية، أو أدخل كلمة مرور مخصصة.</p>
                <Field label="كلمة المرور الجديدة (اختياري)">
                  <input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} dir="ltr" />
                </Field>
                <div className="actions">
                  <button type="button" className="button" onClick={() => {
                    resetOwnerPasswordMutation.mutate({ tenantId: resetTenant.id, tenantName: resetTenant.name, newPassword: resetPassword });
                    setResetTenant(null);
                  }} disabled={resetOwnerPasswordMutation.isPending}>
                    تأكيد وإعادة التعيين
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      ) : null}

      {upgradeTenant ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="ترقية النسخة">
            <FormSection title="تفعيل / ترقية النسخة" actions={<button type="button" className="button button-secondary" onClick={() => setUpgradeTenant(null)}>إغلاق</button>}>
              <div className="stack gap-12">
                <Field label="الخطة">
                  <select value={upgradePlanId} onChange={(e) => setUpgradePlanId(Number(e.target.value) || '')}>
                    <option value="">-- اختر الخطة --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price} {p.currency})</option>
                    ))}
                  </select>
                </Field>
                <Field label="مدة الاشتراك">
                  <select value={upgradeDuration} onChange={(e) => setUpgradeDuration(Number(e.target.value))}>
                    <option value={1}>شهر واحد</option>
                    <option value={3}>3 أشهر</option>
                    <option value={6}>6 أشهر</option>
                    <option value={12}>سنة واحدة</option>
                    <option value={60}>5 سنوات (مدى الحياة)</option>
                  </select>
                </Field>
                <Field label="المبلغ المدفوع (اختياري)">
                  <input type="number" min="0" value={upgradePaymentAmount} onChange={(e) => setUpgradePaymentAmount(Number(e.target.value))} />
                </Field>
                <Field label="طريقة الدفع">
                  <select value={upgradePaymentMethod} onChange={(e) => setUpgradePaymentMethod(e.target.value)}>
                    <option value="cash">نقدي</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="card">بطاقة</option>
                  </select>
                </Field>
                <div className="actions">
                  <button type="button" className="button" onClick={() => {
                    tenantActionMutation.mutate({ 
                      action: 'activate', 
                      tenantId: upgradeTenant.id, 
                      durationMonths: upgradeDuration,
                      planId: upgradePlanId ? Number(upgradePlanId) : undefined,
                      paymentAmount: upgradePaymentAmount ? Number(upgradePaymentAmount) : undefined,
                      paymentMethod: upgradePaymentMethod,
                    });
                    setUpgradeTenant(null);
                  }} disabled={tenantActionMutation.isPending || !upgradePlanId}>
                    تأكيد التفعيل
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      ) : null}

      {renewTenant ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="تجديد الاشتراك">
            <FormSection title="تجديد اشتراك النسخة" actions={<button type="button" className="button button-secondary" onClick={() => setRenewTenant(null)}>إغلاق</button>}>
              <div className="stack gap-12">
                <Field label="الخطة">
                  <select value={renewPlanId} onChange={(e) => setRenewPlanId(Number(e.target.value) || '')}>
                    <option value="">-- اختر الخطة --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price} {p.currency})</option>
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
                <Field label="المبلغ المدفوع (اختياري)">
                  <input type="number" min="0" value={renewPaymentAmount} onChange={(e) => setRenewPaymentAmount(Number(e.target.value))} />
                </Field>
                <Field label="طريقة الدفع">
                  <select value={renewPaymentMethod} onChange={(e) => setRenewPaymentMethod(e.target.value)}>
                    <option value="cash">نقدي</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="card">بطاقة</option>
                  </select>
                </Field>
                <div className="actions">
                  <button type="button" className="button" onClick={() => {
                    renewMutation.mutate({ 
                      tenantId: renewTenant.id, 
                      durationMonths: renewDuration,
                      planId: Number(renewPlanId),
                      paymentAmount: renewPaymentAmount ? Number(renewPaymentAmount) : undefined,
                      paymentMethod: renewPaymentMethod,
                    });
                  }} disabled={renewMutation.isPending || !renewPlanId}>
                    تأكيد التجديد
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      ) : null}

      {recordPaymentTenant ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="تسجيل دفعة">
            <FormSection title="تسجيل دفعة يدوية" actions={<button type="button" className="button button-secondary" onClick={() => setRecordPaymentTenant(null)}>إغلاق</button>}>
              <div className="stack gap-12">
                <Field label="المبلغ">
                  <input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
                </Field>
                <Field label="العملة">
                  <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value)}>
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="SAR">SAR</option>
                  </select>
                </Field>
                <Field label="طريقة الدفع">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">نقدي</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="card">بطاقة</option>
                  </select>
                </Field>
                <Field label="رقم المرجع (اختياري)">
                  <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                </Field>
                <div className="actions">
                  <button type="button" className="button" onClick={() => {
                    recordPaymentMutation.mutate({ 
                      tenantId: recordPaymentTenant.id, 
                      amount: Number(paymentAmount),
                      currency: paymentCurrency,
                      method: paymentMethod,
                      reference: paymentReference,
                    });
                  }} disabled={recordPaymentMutation.isPending || !paymentAmount}>
                    تسجيل الدفعة
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      ) : null}

      <TenantDetailsModal tenantId={detailsTenantId} onClose={() => setDetailsTenantId(null)} />

    </div>
  );
}
