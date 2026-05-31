import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
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

type TenantActionKey = 'activate' | 'suspend' | 'expire';
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
    mutationFn: async (input: { action: TenantActionKey; tenantId: string }) => {
      if (input.action === 'activate') return saasAdminApi.activateTenant(input.tenantId);
      if (input.action === 'suspend') return saasAdminApi.suspendTenant(input.tenantId);
      return saasAdminApi.expireTenant(input.tenantId);
    },
    onSuccess: async () => {
      setFeedback('تم تحديث حالة النسخة بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تحديث حالة النسخة.')),
  });

  const extendTrialMutation = useMutation({
    mutationFn: (input: { tenantId: string; days: number }) => saasAdminApi.extendTrial(input.tenantId, input.days),
    onSuccess: async () => {
      setFeedback('تم تمديد الفترة التجريبية بنجاح.');
      await invalidateTenants();
    },
    onError: (error) => setFeedback(getFriendlyApiErrorMessage(error, 'تعذر تمديد الفترة التجريبية.')),
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

      <Card title="نسخ العملاء">
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
                sortValue: (row) => `${row.businessName} ${row.slug}`,
                render: (row) => (
                  <div className="stack gap-6">
                    <strong>{row.businessName}</strong>
                    <span className="muted small">{row.slug}</span>
                  </div>
                ),
              },
              {
                id: 'owner',
                header: 'المالك',
                sortable: true,
                sortValue: (row) => `${row.ownerName} ${row.ownerPhone}`,
                render: (row) => (
                  <div className="stack gap-4">
                    <span>{row.ownerName}</span>
                    <span className="muted small">{row.ownerPhone}</span>
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
                      <button type="button" className="button button-secondary" onClick={() => tenantActionMutation.mutate({ action: 'activate', tenantId: row.id })}>تفعيل</button>
                      <button type="button" className="button button-secondary" onClick={() => tenantActionMutation.mutate({ action: 'suspend', tenantId: row.id })}>إيقاف</button>
                      <button type="button" className="button button-secondary" onClick={() => tenantActionMutation.mutate({ action: 'expire', tenantId: row.id })}>إنهاء</button>
                      <button type="button" className="button button-secondary" onClick={() => extendTrialMutation.mutate({ tenantId: row.id, days: 7 })}>+7 أيام</button>
                    </div>
                  );
                },
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      {isCreateOpen ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="إنشاء نسخة تجريبية">
            <Card title="إنشاء نسخة تجريبية" actions={<button type="button" className="button button-secondary" onClick={() => setIsCreateOpen(false)}>إغلاق</button>}>
              <div className="grid-2">
                <Field label="Slug"><input value={createForm.slug} onChange={(event) => setCreateForm((s) => ({ ...s, slug: event.target.value }))} /></Field>
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
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
