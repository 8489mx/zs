import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';
import { translateUiText } from '@/lib/auto-translator';
import type { TenantSubscriptionData } from '../../api/tenant-subscription.api';

interface CurrentSubscriptionHeroCardProps {
  tenant: TenantSubscriptionData['tenant'];
  settings?: any;
  subscription?: TenantSubscriptionData['subscription'];
  statusMeta: TenantSubscriptionData['statusMeta'];
  usage: TenantSubscriptionData['usage'];
  onUpgradeClick: () => void;
}

export function CurrentSubscriptionHeroCard({
  tenant,
  settings,
  subscription,
  statusMeta,
  usage,
  onUpgradeClick,
}: CurrentSubscriptionHeroCardProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const vertical = resolveCurrentVertical(tenant, settings);
  const branchesUsageLabel = isEn
    ? (vertical === 'maritime' ? 'Offices: ' : vertical === 'contracting' ? 'Sites: ' : 'Branches: ')
    : (vertical === 'maritime' ? 'المكاتب والمقرات: ' : vertical === 'contracting' ? 'المواقع والمقرات: ' : 'الفروع: ');
  const isTrial = tenant.status === 'trial';
  const rawPlanName = subscription?.planName || (isTrial ? (isEn ? 'Free Trial Period' : 'الفترة التجريبية المجانية') : (isEn ? 'Custom Plan' : 'خطة مخصصة'));
  const planName = isEn ? translateUiText(rawPlanName) : rawPlanName;
  const daysLeft = statusMeta.daysRemaining ?? 0;
  const statusLabel = isTrial
    ? (isEn ? 'Trial Period' : 'فترة تجريبية')
    : statusMeta.isExpired
      ? (isEn ? 'Expired' : 'منتهي')
      : statusMeta.isExpiringSoon
        ? (isEn ? 'Expiring Soon' : 'ينتهي قريباً')
        : (isEn ? 'Active' : 'نشط');
  const expiryFormatted = subscription?.endsAt
    ? new Date(subscription.endsAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG')
    : tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG')
      : null;

  const usersLimit = usage.users.max;
  const usersPercent = usersLimit ? Math.min(100, Math.round((usage.users.current / usersLimit) * 100)) : null;

  const branchesLimit = usage.branches.max;
  const branchesPercent = branchesLimit ? Math.min(100, Math.round((usage.branches.current / branchesLimit) * 100)) : null;

  return (
    <div
      dir={isEn ? 'ltr' : 'rtl'}
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
            {isEn ? 'Organization:' : t('settings.subscription.current_subscription_hero_card.s0', "المنشأة:")} <strong style={{ color: '#0f172a' }}>{tenant.businessName}</strong> ({tenant.slug})
            {expiryFormatted && (
              <span> {isEn ? '• Expires on:' : t('settings.subscription.current_subscription_hero_card.s1', "• ينتهي في:")} <strong style={{ color: daysLeft <= 5 ? '#dc2626' : '#0f172a' }}>{expiryFormatted}</strong> ({daysLeft} {isEn ? 'days left)' : t('settings.subscription.current_subscription_hero_card.s2', "يوم متبقي)")}</span>
            )}
          </div>
        </div>

        {/* Usage limits pills */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px' }}>
            <span style={{ color: '#64748b' }}>{isEn ? 'Users: ' : t('settings.subscription.current_subscription_hero_card.s3', "المستخدمين:")} </span>
            <strong style={{ color: '#0f172a' }}>{usage.users.current}</strong> / {usersLimit ?? (isEn ? 'Unlimited' : t('settings.subscription.current_subscription_hero_card.s4', "غير محدود"))}
            {usersPercent !== null && <span style={{ color: usersPercent >= 90 ? '#dc2626' : '#64748b', marginInlineStart: '4px' }}>({usersPercent}%)</span>}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px' }}>
            <span style={{ color: '#64748b' }}>{branchesUsageLabel}</span>
            <strong style={{ color: '#0f172a' }}>{usage.branches.current}</strong> / {branchesLimit ?? (isEn ? 'Unlimited' : t('settings.subscription.current_subscription_hero_card.s5', "غير محدود"))}
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
        {isEn ? 'Upgrade or Renew Plan Now' : t('settings.subscription.current_subscription_hero_card.s6', "ترقية أو تجديد الباقة الآن")}
      </Button>
    </div>
  );
}
