import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { ApiError } from '@/lib/http';
import { isPlatformAdmin } from '@/app/router/access';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { saasAdminApi, SaasTenantRow, SaasTenantStatus } from '@/features/saas-admin/api/saas-admin.api';
import { UpdateTenantPlanModal } from '../components/UpdateTenantPlanModal';
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
    rowSlug === 'karimzakaria-demo'
  );
}

interface TenantActionsMenuProps {
  row: SaasTenantRow;
  platformTenantId: string;
  currentTenantId?: string;
  onImpersonate: (id: string, name: string) => void;
  isImpersonating: boolean;
  onShowDetails: (id: string) => void;
  onUpgrade: (row: SaasTenantRow) => void;
  onUpdatePlan: (row: SaasTenantRow) => void;
  onRenew: (row: SaasTenantRow) => void;
  onRecordPayment: (row: SaasTenantRow) => void;
  onExtendTrial: (id: string) => void;
  onResetPassword: (row: SaasTenantRow) => void;
  onUnlockOwner: (id: string) => void;
  onSuspend: (id: string) => void;
  onExpire: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

function TenantActionsMenu({
  row,
  platformTenantId,
  currentTenantId,
  onImpersonate,
  isImpersonating,
  onShowDetails,
  onUpgrade,
  onUpdatePlan,
  onRenew,
  onRecordPayment,
  onExtendTrial,
  onResetPassword,
  onUnlockOwner,
  onSuspend,
  onExpire,
  onDelete,
}: TenantActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 230;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      
      let top: number;
      let maxHeight: number;

      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        maxHeight = Math.min(340, Math.max(160, spaceAbove));
        top = Math.max(10, rect.top - maxHeight - 6);
      } else {
        top = rect.bottom + 6;
        maxHeight = Math.min(340, Math.max(160, spaceBelow));
      }
      
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 12) {
        left = window.innerWidth - dropdownWidth - 12;
      }
      if (left < 12) left = 12;

      setDropdownPos({ top, left, maxHeight });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (target.closest('.tenant-actions-portal-dropdown')) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', () => setIsOpen(false), true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setIsOpen(false), true);
    };
  }, [isOpen]);

  if (isPlatform) {
    return (
      <div className="tenant-actions-cell">
        <button
          type="button"
          className="button button-secondary"
          style={{ padding: '5px 9px', fontSize: '12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          onClick={() => onShowDetails(row.id)}
          title="سجل النشاط وتفاصيل النسخة الرئيسية"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>سجل النشاط</span>
        </button>
        <span style={{ fontSize: '11px', color: '#5b21b6', fontWeight: 800, padding: '3px 8px', background: '#f5f3ff', borderRadius: '6px', border: '1px solid #ddd6fe', whiteSpace: 'nowrap' }}>
          نسخة المنصة (محمية)
        </span>
      </div>
    );
  }

  return (
    <div className="tenant-actions-cell">
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

      {/* 2. سجل النشاط والتفاصيل */}
      <button
        type="button"
        className="button button-secondary"
        style={{ padding: '5px 9px', fontSize: '12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        onClick={() => onShowDetails(row.id)}
        title="سجل النشاط وتفاصيل النسخة الكاملة"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>سجل النشاط</span>
      </button>

      {/* 3. إعادة تعيين كلمة المرور */}
      <button
        type="button"
        className="button button-secondary"
        style={{ padding: '5px 9px', fontSize: '12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        onClick={() => onResetPassword(row)}
        title="إعادة تعيين كلمة مرور المالك"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>كلمة المرور</span>
      </button>

      {/* 4. قائمة الإجراءات الإضافية (Portal Dropdown) */}
      <button
        ref={buttonRef}
        type="button"
        className={`tenant-more-btn ${isOpen ? 'is-active' : ''}`}
        onClick={toggleDropdown}
        title="كافة الخيارات والإجراءات"
        aria-label="خيارات إضافية"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
      </button>

      {isOpen && dropdownPos && createPortal(
        <div 
          className="tenant-actions-dropdown tenant-actions-portal-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            maxHeight: `${dropdownPos.maxHeight}px`,
            zIndex: 100000,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="tenant-actions-group-title">الاشتراك والفوترة</div>
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onUpgrade(row); }}
          >
            <span>تفعيل / ترقية الخطة</span>
          </button>
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onUpdatePlan(row); }}
          >
            <span>تعديل الباقة والميزات</span>
          </button>
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onRenew(row); }}
          >
            <span>تجديد الاشتراك</span>
          </button>
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onRecordPayment(row); }}
          >
            <span>تسجيل دفعة مالية</span>
          </button>

          <div className="tenant-actions-divider" />
          <div className="tenant-actions-group-title">إدارة الحساب والتجربة</div>
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onShowDetails(row.id); }}
          >
            <span>سجل النشاط والتفاصيل الكاملة</span>
          </button>
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onResetPassword(row); }}
          >
            <span>إعادة تعيين كلمة المرور</span>
          </button>
          {row.status === 'trial' && (
            <button
              type="button"
              className="tenant-action-item"
              onClick={() => { setIsOpen(false); onExtendTrial(row.id); }}
            >
              <span>تمديد التجربة (+7 أيام)</span>
            </button>
          )}
          <button
            type="button"
            className="tenant-action-item"
            onClick={() => { setIsOpen(false); onUnlockOwner(row.id); }}
          >
            <span>فك قفل حساب المالك</span>
          </button>
          {row.status === 'active' || row.status === 'trial' ? (
            <button
              type="button"
              className="tenant-action-item"
              onClick={() => { setIsOpen(false); onSuspend(row.id); }}
            >
              <span>إيقاف النسخة مؤقتاً</span>
            </button>
          ) : (
            <button
              type="button"
              className="tenant-action-item"
              onClick={() => { setIsOpen(false); onExpire(row.id); }}
            >
              <span>إنهاء الصلاحية</span>
            </button>
          )}

          <div className="tenant-actions-divider" />
          <button
            type="button"
            className="tenant-action-item danger"
            onClick={() => { setIsOpen(false); onDelete(row.id, row.businessName || row.slug); }}
          >
            <span>حذف نهائي للنسخة</span>
          </button>
        </div>,
        document.body
      )}
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [createResult, setCreateResult] = useState<{ username: string; temporaryPassword: string; trialEndsAt: string; tenantSlug?: string; businessName?: string } | null>(null);
  const [ownerResetResult, setOwnerResetResult] = useState<{ tenantName: string; username: string; temporaryPassword: string } | null>(null);
  
  const [resetTenant, setResetTenant] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  
  const [upgradeTenant, setUpgradeTenant] = useState<{ id: string; name?: string } | null>(null);
  const [upgradeDuration, setUpgradeDuration] = useState<number>(1);
  const [upgradePlanId, setUpgradePlanId] = useState<number | ''>('');
  const [upgradePaymentAmount, setUpgradePaymentAmount] = useState<number | ''>('');
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('cash');

  const [updatePlanTenant, setUpdatePlanTenant] = useState<SaasTenantRow | null>(null);

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
    }),
    onSuccess: async (payload) => {
      setCreateResult({
        username: payload.owner.username,
        temporaryPassword: payload.owner.temporaryPassword,
        trialEndsAt: payload.tenant.trialEndsAt || '',
        tenantSlug: payload.tenant.slug,
        businessName: payload.tenant.businessName,
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

  const clearSession = useAuthStore((state) => state.clearSession);

  const impersonateMutation = useMutation({
    mutationFn: (tenantId: string) => saasAdminApi.impersonateTenant(tenantId),
    onSuccess: async (res) => {
      if (res?.originalSessionId) {
        window.localStorage.setItem('zs.impersonationOriginalSession', res.originalSessionId);
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
    <div className="page-stack page-shell saas-tenants-page">
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
        <div className="saas-credentials-card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="saas-credentials-header">
            <span className="saas-credentials-title" style={{ color: '#38bdf8' }}>
              تم إعادة تعيين كلمة مرور المالك بنجاح
            </span>
            <button type="button" className="saas-copy-btn" onClick={() => setOwnerResetResult(null)}>
              إغلاق
            </button>
          </div>
          <div className="saas-credential-row">
            <span className="saas-credential-label">النشاط / النسخة:</span>
            <span className="saas-credential-val" style={{ color: '#f8fafc' }}>{ownerResetResult.tenantName}</span>
          </div>
          <div className="saas-credential-row">
            <span className="saas-credential-label">اسم المستخدم:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="saas-credential-val">{ownerResetResult.username}</span>
              <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(ownerResetResult.username)}>نسخ</button>
            </div>
          </div>
          <div className="saas-credential-row">
            <span className="saas-credential-label">كلمة المرور الجديدة:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="saas-credential-val" style={{ color: '#34d399' }}>{ownerResetResult.temporaryPassword}</span>
              <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(ownerResetResult.temporaryPassword)}>نسخ</button>
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

        <StatsGrid items={stats} />

        <QueryFeedback
          isLoading={tenantsQuery.isLoading}
          isError={tenantsQuery.isError}
          error={tenantsQuery.error}
          isEmpty={!tenants.length}
          loadingText="جاري تحميل قائمة النسخ والمستأجرين..."
          errorTitle={isForbiddenByApi ? 'غير مسموح' : 'تعذر تحميل نسخ العملاء'}
          emptyTitle="لا توجد نسخ مطابقة"
          emptyHint="جرّب تعديل معايير البحث أو أنشئ نسخة تجريبية جديدة."
        >
          <DataTable<SaasTenantRow>
            data={tenants}
            getRowKey={(row) => row.id}
            defaultSort={{ columnId: 'createdAt', direction: 'desc' }}
            columns={[
              {
                id: 'business',
                header: 'النشاط والمعرف',
                sortable: true,
                sortValue: (row) => row.businessName || row.slug,
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  return (
                    <div style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          type="button" 
                          className="tenant-name-btn"
                          onClick={() => setDetailsTenantId(row.id)}
                          title="عرض تفاصيل وسجل النشاط"
                        >
                          {row.businessName || row.slug}
                        </button>
                        {isPlatform && (
                          <span style={{ fontSize: '10.5px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            المنصة الرئيسية
                          </span>
                        )}
                      </div>
                      <div className="tenant-slug-badge">
                        <span>slug:</span>
                        <strong>{row.slug}</strong>
                      </div>
                    </div>
                  );
                },
              },
              {
                id: 'owner',
                header: 'المالك والمستخدم',
                sortable: true,
                sortValue: (row) => row.ownerName,
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  return (
                    <div style={{ minWidth: '120px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{row.ownerName || 'المسؤول'}</strong>
                      <div className="muted small">{isPlatform ? 'حساب المالك الرئيسي' : `@${row.ownerUsername || 'admin'}`}</div>
                    </div>
                  );
                },
              },
              {
                id: 'phone',
                header: 'بيانات الاتصال',
                sortable: true,
                sortValue: (row) => row.ownerPhone,
                render: (row) => (
                  <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', direction: 'ltr', textAlign: 'right' }}>
                      {row.ownerPhone || '-'}
                    </span>
                    {row.ownerEmail && (
                      <span className="muted small" style={{ direction: 'ltr', textAlign: 'right', fontSize: '11px' }}>
                        {row.ownerEmail}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                id: 'billing',
                header: 'الاشتراك والباقة',
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return (
                      <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="tenant-plan-badge" style={{ background: '#f5f3ff', color: '#6b21a8', border: '1px solid #ddd6fe', fontWeight: 800 }}>
                          حساب المؤسس (وصول شامل)
                        </span>
                        <span className="muted small" style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>
                          ● نسخة المالك غير خاضعة لباقات
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="tenant-plan-badge">{row.planName || 'بدون باقة'}</span>
                      <span className="muted small" style={{ fontSize: '11px' }}>
                        {row.subscriptionStatus === 'active' ? '● اشتراك نشط' : row.subscriptionStatus === 'past_due' ? '● فترة سماح' : row.subscriptionStatus || '-'}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: 'dates',
                header: 'صلاحية الاشتراك',
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return (
                      <div style={{ minWidth: '130px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                          مدى الحياة (دائم) ∞
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {row.subscriptionEndDate ? `ينتهي: ${formatDate(row.subscriptionEndDate)}` : '-'}
                      </span>
                      {row.graceEndDate && (
                        <span className="muted small" style={{ color: '#d97706', fontSize: '11px' }}>
                          سماح لغاية: {formatDate(row.graceEndDate)}
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                id: 'status',
                header: 'الحالة',
                sortable: true,
                sortValue: (row) => row.status,
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return (
                      <span className="tenant-status-pill active" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', color: '#6d28d9', fontWeight: 800 }}>
                        النسخة الرئيسية
                      </span>
                    );
                  }
                  return (
                    <span className={statusBadgeClass(row.status)}>
                      {statusLabel(row.status)}
                    </span>
                  );
                },
              },
              {
                id: 'trial',
                header: 'انتهاء التجربة',
                sortable: true,
                sortValue: (row) => row.trialEndsAt || '',
                render: (row) => {
                  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
                  if (isPlatform) {
                    return <span className="muted small">-</span>;
                  }
                  const days = row.trialDaysRemaining;
                  const isTrial = row.status === 'trial';
                  return (
                    <div style={{ minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12px' }}>{row.trialEndsAt ? formatDate(row.trialEndsAt) : '-'}</span>
                      {isTrial && days != null && (
                        <span className={`tenant-trial-badge ${days > 5 ? 'healthy' : days > 0 ? 'warning' : 'danger'}`}>
                          {days > 0 ? `باقي ${days} يوم` : 'منتهية'}
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                id: 'actions',
                header: 'الإجراءات',
                render: (row) => (
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
                    onUpgrade={(r) => {
                      setUpgradeTenant({ id: r.id, name: r.businessName || r.slug });
                      setUpgradePlanId('');
                      setUpgradePaymentAmount('');
                    }}
                    onUpdatePlan={(r) => setUpdatePlanTenant(r)}
                    onRenew={(r) => {
                      setRenewTenant({ id: r.id, name: r.businessName || r.slug });
                      setRenewPlanId('');
                      setRenewPaymentAmount('');
                    }}
                    onRecordPayment={(r) => {
                      setRecordPaymentTenant({ id: r.id, name: r.businessName || r.slug });
                      setPaymentAmount('');
                      setPaymentReference('');
                    }}
                    onExtendTrial={(id) => extendTrialMutation.mutate({ tenantId: id, days: 7 })}
                    onResetPassword={(r) => {
                      setResetTenant({ id: r.id, name: r.businessName || r.slug });
                      setResetPassword('');
                    }}
                    onUnlockOwner={(id) => tenantActionMutation.mutate({ action: 'unlockOwner', tenantId: id })}
                    onSuspend={(id) => {
                      if (window.confirm('هل تريد إيقاف هذه النسخة مؤقتاً؟ لن يتمكن المستخدمون من الدخول حتى إعادة التفعيل.')) {
                        tenantActionMutation.mutate({ action: 'suspend', tenantId: id });
                      }
                    }}
                    onExpire={(id) => tenantActionMutation.mutate({ action: 'expire', tenantId: id })}
                    onDelete={(id, name) => {
                      if (window.confirm(`هل أنت متأكد تماماً من حذف نسخة (${name}) بجميع قواعد بياناتها وسجلاتها؟\nلا يمكن التراجع عن هذا الإجراء!`)) {
                        tenantActionMutation.mutate({ action: 'delete', tenantId: id });
                      }
                    }}
                  />
                ),
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>

      {/* ========================================================
          CREATE TRIAL TENANT MODAL
          ======================================================== */}
      {isCreateOpen && (
        <DialogShell
          open={isCreateOpen}
          onClose={() => { setIsCreateOpen(false); setCreateResult(null); }}
          width="760px"
          ariaLabel="إنشاء نسخة تجريبية جديدة"
        >
          <div className="dialog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  إنشاء نسخة تجريبية جديدة
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  إدخال بيانات المنشأة والمالك لتوليد نسخة سحابية فورية بحساب كامل الصلاحيات.
                </p>
              </div>
              <button
                type="button"
                className="dialog-shell-close-btn"
                onClick={() => { setIsCreateOpen(false); setCreateResult(null); }}
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            {createResult ? (
              <div className="saas-credentials-card">
                <div className="saas-credentials-header">
                  <span className="saas-credentials-title">
                    تم إنشاء النسخة السحابية بنجاح
                  </span>
                </div>
                <div className="saas-credential-row">
                  <span className="saas-credential-label">اسم المنشأة:</span>
                  <strong className="saas-credential-val" style={{ color: '#fef08a' }}>{createResult.businessName || createResult.tenantSlug}</strong>
                </div>
                <div className="saas-credential-row">
                  <span className="saas-credential-label">المعرف السحابي (Slug):</span>
                  <span className="saas-credential-val">{createResult.tenantSlug}</span>
                </div>
                <div className="saas-credential-row">
                  <span className="saas-credential-label">اسم المستخدم للمالك:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="saas-credential-val">{createResult.username}</span>
                    <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.username)}>نسخ</button>
                  </div>
                </div>
                <div className="saas-credential-row">
                  <span className="saas-credential-label">كلمة المرور المؤقتة:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="saas-credential-val" style={{ color: '#34d399' }}>{createResult.temporaryPassword}</span>
                    <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.temporaryPassword)}>نسخ</button>
                  </div>
                </div>
                <div className="saas-credential-row">
                  <span className="saas-credential-label">تاريخ انتهاء التجربة:</span>
                  <span className="saas-credential-val">{formatDate(createResult.trialEndsAt)}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="button"
                    style={{
                      flex: 1,
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setIsCreateOpen(false);
                      setCreateResult(null);
                    }}
                  >
                    تم ونسخ البيانات ✓
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
                  <div className="saas-modal-grid-2">
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
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Field label="نوع النشاط / المجال">
                      <input
                        type="text"
                        value={createForm.activityType}
                        onChange={(e) => setCreateForm((s) => ({ ...s, activityType: e.target.value }))}
                        placeholder="مثال: بقالة، صيدلية، محل ملابس، مطعم، إلكترونيات..."
                      />
                    </Field>
                  </div>
                </div>

                {/* 2. بيانات المالك والدخول */}
                <div className="saas-modal-card">
                  <div className="saas-modal-card-title">
                    <span>2. بيانات المالك وحساب الإدارة</span>
                  </div>
                  <div className="saas-modal-grid-2">
                    <Field label="اسم المالك *">
                      <input
                        type="text"
                        required
                        value={createForm.ownerName}
                        onChange={(e) => setCreateForm((s) => ({ ...s, ownerName: e.target.value }))}
                        placeholder="مثال: أحمد محمود"
                      />
                    </Field>
                    <Field label="رقم هاتف المالك *">
                      <input
                        type="text"
                        required
                        value={createForm.ownerPhone}
                        onChange={(e) => setCreateForm((s) => ({ ...s, ownerPhone: e.target.value }))}
                        placeholder="مثال: 01012345678"
                        dir="ltr"
                      />
                    </Field>
                  </div>
                  <div className="saas-modal-grid-3" style={{ marginTop: '10px' }}>
                    <Field label="البريد الإلكتروني (اختياري)">
                      <input
                        type="email"
                        value={createForm.ownerEmail}
                        onChange={(e) => setCreateForm((s) => ({ ...s, ownerEmail: e.target.value }))}
                        placeholder="owner@example.com"
                        dir="ltr"
                      />
                    </Field>
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

                {/* 3. إعدادات التجربة والمتابعة */}
                <div className="saas-modal-card">
                  <div className="saas-modal-card-title">
                    <span>3. إعدادات التجربة والمتابعة</span>
                  </div>
                  <div className="saas-modal-grid-3">
                    <Field label="مدة التجربة (أيام)">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={createForm.days}
                        onChange={(e) => setCreateForm((s) => ({ ...s, days: e.target.value }))}
                      />
                    </Field>
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
                  <div style={{ marginTop: '10px' }}>
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="button"
                    style={{
                      background: 'linear-gradient(135deg, #170c5c 0%, #312e81 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '10px 24px',
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
          width="500px"
          ariaLabel="تفعيل أو ترقية الخطة"
        >
          <div className="dialog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تفعيل / ترقية الاشتراك
              </h3>
              <button type="button" className="dialog-shell-close-btn" onClick={() => setUpgradeTenant(null)}>✕</button>
            </div>
            <p className="muted small" style={{ marginBottom: '14px' }}>
              النسخة: <strong>{upgradeTenant.name}</strong>
            </p>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="button button-secondary" onClick={() => setUpgradeTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  style={{ background: '#10b981', color: '#ffffff', border: 'none' }}
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
          width="500px"
          ariaLabel="تجديد الاشتراك"
        >
          <div className="dialog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تجديد اشتراك النسخة
              </h3>
              <button type="button" className="dialog-shell-close-btn" onClick={() => setRenewTenant(null)}>✕</button>
            </div>
            <p className="muted small" style={{ marginBottom: '14px' }}>
              النسخة: <strong>{renewTenant.name}</strong>
            </p>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="button button-secondary" onClick={() => setRenewTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  style={{ background: '#2563eb', color: '#ffffff' }}
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
          width="500px"
          ariaLabel="تسجيل دفعة يدوية"
        >
          <div className="dialog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تسجيل دفعة مالية يدوية
              </h3>
              <button type="button" className="dialog-shell-close-btn" onClick={() => setRecordPaymentTenant(null)}>✕</button>
            </div>
            <p className="muted small" style={{ marginBottom: '14px' }}>
              النسخة: <strong>{recordPaymentTenant.name}</strong>
            </p>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="button button-secondary" onClick={() => setRecordPaymentTenant(null)}>إلغاء</button>
                <button
                  type="button"
                  className="button"
                  style={{ background: '#059669', color: '#ffffff' }}
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
    </div>
  );
}
