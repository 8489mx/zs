import { DataTable } from '@/shared/components/data-table';
import { formatDate } from '@/lib/format';
import type { SaasTenantRow, SaasTenantStatus } from '@/features/saas-admin/api/saas-admin.api';
import { TenantActionsMenu, isPlatformTenantRow } from './TenantActionsMenu';

export function statusLabel(status: SaasTenantStatus): string {
  if (status === 'trial') return 'تجريبية';
  if (status === 'active') return 'مفعلة';
  if (status === 'expired') return 'منتهية';
  if (status === 'suspended') return 'موقوفة';
  return String(status || 'غير معروف');
}

export function statusBadgeClass(status: SaasTenantStatus): string {
  if (status === 'active') return 'tenant-status-pill active';
  if (status === 'trial') return 'tenant-status-pill trial';
  if (status === 'suspended') return 'tenant-status-pill suspended';
  if (status === 'expired') return 'tenant-status-pill expired';
  return 'tenant-status-pill';
}

interface TenantDataTableProps {
  tenants: SaasTenantRow[];
  platformTenantId: string;
  currentTenantId?: string;
  isImpersonating: boolean;
  onImpersonate: (id: string, name: string) => void;
  onShowDetails: (id: string) => void;
  onShowSubscriptions: (row: SaasTenantRow) => void;
  onShareWelcome: (row: SaasTenantRow) => void;
  onRenew: (row: SaasTenantRow) => void;
  onOpenActionHub: (row: SaasTenantRow) => void;
}

export function TenantDataTable({
  tenants,
  platformTenantId,
  currentTenantId,
  isImpersonating,
  onImpersonate,
  onShowDetails,
  onShowSubscriptions,
  onShareWelcome,
  onRenew,
  onOpenActionHub,
}: TenantDataTableProps) {
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

  return (
    <DataTable<SaasTenantRow>
      data={tenants}
      getRowKey={(row) => row.id}
      columns={[
        {
          id: 'company',
          header: 'المنشأة والبيانات',
          sortable: true,
          sortValue: (row) => row.businessName || row.slug,
          render: (row) => {
            const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
            return (
              <div className="tenant-name-cell">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onShowDetails(row.id)}
                    className="tenant-name-link"
                    title="عرض بطاقة تفاصيل المنشأة"
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
                isImpersonating={isImpersonating}
                onImpersonate={onImpersonate}
                onShowDetails={onShowDetails}
                onShowSubscriptions={onShowSubscriptions}
                onShareWelcome={onShareWelcome}
                onRenew={onRenew}
                onOpenActionHub={onOpenActionHub}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
