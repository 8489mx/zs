import { Button } from '@/shared/ui/button';
import type { TenantSubscriptionData } from '../../api/tenant-subscription.api';

interface CurrentSubscriptionHeroCardProps {
  tenant: TenantSubscriptionData['tenant'];
  subscription?: TenantSubscriptionData['subscription'];
  statusMeta: TenantSubscriptionData['statusMeta'];
  usage: TenantSubscriptionData['usage'];
  onUpgradeClick: () => void;
}

export function CurrentSubscriptionHeroCard({
  tenant,
  subscription,
  statusMeta,
  usage,
  onUpgradeClick,
}: CurrentSubscriptionHeroCardProps) {
  const isTrial = tenant.status === 'trial';
  const planName = subscription?.planName || (isTrial ? 'الفترة التجريبية المجانية' : 'خطة مخصصة');
  const daysLeft = statusMeta.daysRemaining ?? 0;
  const statusLabel = isTrial
    ? 'فترة تجريبية'
    : statusMeta.isExpired
      ? 'منتهي'
      : statusMeta.isExpiringSoon
        ? 'ينتهي قريباً'
        : 'نشط';
  const expiryFormatted = subscription?.endsAt
    ? new Date(subscription.endsAt).toLocaleDateString('ar-EG')
    : tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt).toLocaleDateString('ar-EG')
      : null;

  const usersLimit = usage.users.max;
  const usersPercent = usersLimit ? Math.min(100, Math.round((usage.users.current / usersLimit) * 100)) : null;

  const branchesLimit = usage.branches.max;
  const branchesPercent = branchesLimit ? Math.min(100, Math.round((usage.branches.current / branchesLimit) * 100)) : null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
              {planName}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: isTrial ? '#fff7ed' : '#ecfdf5',
                color: isTrial ? '#c2410c' : '#047857',
                border: `1px solid ${isTrial ? '#fed7aa' : '#a7f3d0'}`,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            المنشأة: <strong style={{ color: '#0f172a' }}>{tenant.businessName}</strong> ({tenant.slug})
            {expiryFormatted && (
              <span> • ينتهي في: <strong style={{ color: daysLeft <= 5 ? '#dc2626' : '#0f172a' }}>{expiryFormatted}</strong> ({daysLeft} يوم متبقي)</span>
            )}
          </div>
        </div>

        {/* Usage limits pills */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px' }}>
            <span style={{ color: '#64748b' }}>المستخدمين: </span>
            <strong style={{ color: '#0f172a' }}>{usage.users.current}</strong> / {usersLimit ?? 'غير محدود'}
            {usersPercent !== null && <span style={{ color: usersPercent >= 90 ? '#dc2626' : '#64748b', marginInlineStart: '4px' }}>({usersPercent}%)</span>}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px' }}>
            <span style={{ color: '#64748b' }}>الفروع: </span>
            <strong style={{ color: '#0f172a' }}>{usage.branches.current}</strong> / {branchesLimit ?? 'غير محدود'}
            {branchesPercent !== null && <span style={{ color: branchesPercent >= 90 ? '#dc2626' : '#64748b', marginInlineStart: '4px' }}>({branchesPercent}%)</span>}
          </div>
        </div>
      </div>

      <Button
        onClick={onUpgradeClick}
        style={{
          backgroundColor: '#170e5e',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '12px',
          padding: '8px 18px',
          borderRadius: '8px',
        }}
      >
        ترقية أو تجديد الباقة الآن
      </Button>
    </div>
  );
}
