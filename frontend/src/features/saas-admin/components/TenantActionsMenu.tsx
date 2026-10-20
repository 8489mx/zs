import { useTranslation } from 'react-i18next';
import type { SaasTenantRow } from '@/features/saas-admin/api/saas-admin.api';

export function isPlatformTenantRow(row: SaasTenantRow, platformTenantId: string, _currentTenantId?: string): boolean {
  const rowId = String(row.id || '').trim();
  const rowSlug = String(row.slug || '').trim().toLowerCase();
  const cleanPlatformId = String(platformTenantId || 'zs').trim();
  return (
    rowId === 'zs' ||
    rowId === cleanPlatformId ||
    rowSlug === 'zs'
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

export function TenantActionsMenu({
  row,
  platformTenantId,
  currentTenantId,
  onImpersonate,
  isImpersonating,
  onShowSubscriptions: _onShowSubscriptions,
  onRenew: _onRenew,
  onOpenActionHub,
}: TenantActionsMenuProps) {
  const { t } = useTranslation();
  const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);

  if (isPlatform) {
    return (
      <div className="tenant-actions-cell">
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, padding: '3px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
          {t('saas_admin.tenant_actions_menu.s0', "نسخة المنصة (محمية)")}
        </span>
      </div>
    );
  }

  return (
    <div className="tenant-actions-cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      {/* 1. تصفح النسخة كمالك */}
      <button
        type="button"
        className="tenant-browse-btn"
        onClick={() => onImpersonate(row.id, row.businessName || row.slug)}
        disabled={isImpersonating}
        title={t('saas_admin.tenant_actions_menu.s1', "تسجيل الدخول وتصفح النسخة كمالك")}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 11px',
          background: '#f8fafc',
          color: '#170e5e',
          borderRadius: '7px',
          border: '1px solid #c7d2fe',
          fontSize: '12px',
          fontWeight: 700,
          cursor: isImpersonating ? 'not-allowed' : 'pointer',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          if (!isImpersonating) {
            e.currentTarget.style.background = '#170e5e';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = '#170e5e';
          }
        }}
        onMouseLeave={(e) => {
          if (!isImpersonating) {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.color = '#170e5e';
            e.currentTarget.style.borderColor = '#c7d2fe';
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
        <span>{isImpersonating ? t('saas_admin.tenant_actions_menu.s2', "جاري الدخول...") : t('saas_admin.tenant_actions_menu.s3', "تصفح")}</span>
      </button>

      {/* 2. فتح مركز إجراءات المشترك */}
      <button
        type="button"
        className="tenant-action-hub-btn"
        onClick={() => onOpenActionHub(row)}
        title={t('saas_admin.tenant_actions_menu.s8', "فتح مركز الإجراءات والخيارات الكاملة")}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 11px',
          background: '#ffffff',
          color: '#475569',
          borderRadius: '7px',
          border: '1px solid #e2e8f0',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.color = '#0f172a';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.color = '#475569';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"/>
          <line x1="4" y1="10" x2="4" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12" y2="3"/>
          <line x1="20" y1="21" x2="20" y2="16"/>
          <line x1="20" y1="12" x2="20" y2="3"/>
          <line x1="1" y1="14" x2="7" y2="14"/>
          <line x1="9" y1="8" x2="15" y2="8"/>
          <line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
        <span>إجراءات المشترك</span>
      </button>
    </div>
  );
}
