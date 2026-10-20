import { useTranslation } from 'react-i18next';
import { DataTable } from '@/shared/components/data-table';
import { formatDate } from '@/lib/format';
import type { SaasTenantRow, SaasTenantStatus } from '@/features/saas-admin/api/saas-admin.api';
import { getSystemVertical } from '@/shared/verticals/vertical-catalog';
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
  const { t } = useTranslation();
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
          header: t('saas_admin.tenant_data_table.s0', "المنشأة والبيانات"),
          sortable: true,
          sortValue: (row) => row.businessName || row.slug,
          render: (row) => {
            const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
            const vertical = getSystemVertical(row.activityType);
            const displayName = row.businessName || row.slug;
            const initialChar = (row.businessName || row.slug || '?').trim().charAt(0).toUpperCase();

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* 1. الأيقونة / الأفاتار المؤسسي لتثبيت المحاذاة */}
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: isPlatform ? '#170e5e' : '#f8fafc',
                    border: `1px solid ${isPlatform ? '#170e5e' : '#e2e8f0'}`,
                    color: isPlatform ? '#ffffff' : '#170e5e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    flexShrink: 0,
                    boxShadow: isPlatform ? '0 1px 3px rgba(23, 14, 94, 0.25)' : 'none',
                    userSelect: 'none',
                  }}
                  title={displayName}
                >
                  {isPlatform ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  ) : (
                    initialChar
                  )}
                </div>

                {/* 2. اسم المنشأة والشارة والمعرّف */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => onShowDetails(row.id)}
                      className="tenant-name-link"
                      title={t('saas_admin.tenant_data_table.s1', "عرض بطاقة تفاصيل المنشأة")}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        margin: 0,
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        cursor: 'pointer',
                        textAlign: 'start',
                        display: 'inline-block',
                        lineHeight: 1.3,
                        outline: 'none',
                      }}
                    >
                      {displayName}
                    </button>

                    {isPlatform ? (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('saas_admin.tenant_data_table.s2', "المنصة المركزية")}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '10.5px',
                          background: '#eef2ff',
                          color: '#3730a3',
                          border: '1px solid #c7d2fe',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                        title={vertical.label + (vertical.description ? ` — ${vertical.description}` : '')}
                      >
                        {vertical.badge || vertical.label}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                    <span style={{ color: '#94a3b8' }}>المعرّف:</span>
                    <span style={{ fontFamily: 'monospace', color: '#475569', direction: 'ltr' }}>
                      {row.slug}
                    </span>
                  </div>
                </div>
              </div>
            );
          },
        },
        {
          id: 'owner',
          header: t('saas_admin.tenant_data_table.s3', "المالك والاتصال"),
          align: 'center',
          sortable: true,
          sortValue: (row) => row.ownerName,
          render: (row) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                {row.ownerName || t('saas_admin.tenant_data_table.s4', "المسؤول")}
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
                    marginTop: '2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11px',
                    color: '#64748b',
                  }}
                  title={t('saas_admin.tenant_data_table.s5', "اسم المستخدم لتسجيل الدخول")}
                >
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>{t('saas_admin.tenant_data_table.s6', "يوزر:")}</span>
                  <code style={{ fontFamily: 'monospace', color: '#475569', direction: 'ltr', background: 'transparent', border: 'none', padding: 0 }}>{row.ownerUsername}</code>
                </div>
              ) : null}
            </div>
          ),
        },
        {
          id: 'billing',
          header: t('saas_admin.tenant_data_table.s7', "الباقة"),
          align: 'center',
          render: (row) => {
            const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
            if (isPlatform) {
              return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className="tenant-plan-badge" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '11px' }}>
                    {t('saas_admin.tenant_data_table.s8', "حساب المؤسس")}
                  </span>
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span className="tenant-plan-badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}>
                  {row.planName || t('saas_admin.tenant_data_table.s9', "بدون باقة")}
                </span>
              </div>
            );
          },
        },
        {
          id: 'validity',
          header: t('saas_admin.tenant_data_table.s10', "الصلاحية"),
          align: 'center',
          sortable: true,
          sortValue: (row) => row.subscriptionEndDate || row.trialEndsAt || '',
          render: (row) => {
            const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
            if (isPlatform) {
              return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                    {t('saas_admin.tenant_data_table.s11', "دائم ∞")}
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
                      {days > 0 ? `باقي ${days} يوم` : t('saas_admin.tenant_data_table.s12', "منتهية")}
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
                    {t('saas_admin.tenant_data_table.s13', "منتهي الصلاحية")}
                  </span>
                ) : expiring ? (
                  <span className="tenant-status-pill expiring-soon" style={{ fontSize: '10px', padding: '1px 5px' }}>
                    {t('saas_admin.tenant_data_table.s14', "ينتهي خلال")} {days} {t('saas_admin.tenant_data_table.s15', "أيام")}
                  </span>
                ) : days !== null && days > 7 ? (
                  <span className="muted small" style={{ color: '#15803d', fontSize: '10.5px' }}>
                    {t('saas_admin.tenant_data_table.s16', "● متبقي")} {days} {t('saas_admin.tenant_data_table.s17', "يوم")}
                  </span>
                ) : null}
              </div>
            );
          },
        },
        {
          id: 'status',
          header: t('saas_admin.tenant_data_table.s18', "الحالة"),
          align: 'center',
          sortable: true,
          sortValue: (row) => row.status,
          render: (row) => {
            const isPlatform = isPlatformTenantRow(row, platformTenantId, currentTenantId);
            if (isPlatform) {
              return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className="tenant-status-pill active" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', color: '#6d28d9', fontWeight: 800 }}>
                    {t('saas_admin.tenant_data_table.s19', "الرئيسية")}
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
          header: t('saas_admin.tenant_data_table.s20', "الإجراءات"),
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
