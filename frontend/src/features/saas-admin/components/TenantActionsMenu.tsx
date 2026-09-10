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

      {/* 4. فتح مركز الإجراءات الكامل */}
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
