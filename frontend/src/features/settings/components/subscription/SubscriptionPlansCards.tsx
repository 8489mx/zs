import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { UsersIcon, BuildingIcon } from '@/shared/components/icons/AppIcons';
import { getCurrencySymbol } from '@/lib/currencies';
import { translateUiText } from '@/lib/auto-translator';
import { PlanFeatureItem } from './PlanFeatureItem';
import type { ResolvedPricing, ResolvedPricingLevel } from '../../api/tenant-subscription.api';

interface SubscriptionPlansCardsProps {
  pricing: ResolvedPricing;
  isAnnual: boolean;
  planIdForLevel: (levelId: string) => number | null;
  onSelectPlan: (plan: { id: number; name: string; price: number; currency: string; levelId: string }) => void;
  currentLevelId?: string | null;
}

function CapacityPills({ limits, productId, isEn }: { limits: ResolvedPricingLevel['limits']; productId?: string; isEn: boolean }) {
  const describe = (n: number | null | undefined) => (n == null ? (isEn ? 'Unlimited' : 'بلا حد') : String(n));
  const pills: Array<{ icon: 'users' | 'building'; text: string }> = [];

  const isMaritime = productId === 'maritime';
  const isContracting = productId === 'contracting';

  if (limits.users !== undefined) pills.push({ icon: 'users', text: isEn ? `${describe(limits.users)} Users` : `${describe(limits.users)} مستخدم` });
  if (!isMaritime && limits.branches !== undefined) pills.push({ icon: 'building', text: isEn ? `${describe(limits.branches)} Branches` : `${describe(limits.branches)} فرع` });
  if (!isMaritime && !isContracting && limits.posTerminals != null) pills.push({ icon: 'building', text: isEn ? `${limits.posTerminals} Terminals` : `${limits.posTerminals} طرفية` });
  if (isContracting && limits.activeProjects != null) pills.push({ icon: 'building', text: isEn ? `${limits.activeProjects} Active Projects` : `${limits.activeProjects} مشروع نشط` });
  if (isMaritime && limits.containersPerMonth != null) pills.push({ icon: 'building', text: isEn ? `${limits.containersPerMonth} Containers/Mo` : `${limits.containersPerMonth} حاوية/شهر` });
  if (limits.multiCompany) pills.push({ icon: 'building', text: isEn ? 'Multi-Company' : 'تعدد الشركات' });

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {pills.map((p, idx) => (
        <span
          key={idx}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#475569',
          }}
        >
          {p.icon === 'users' ? <UsersIcon size={12} color="#64748b" /> : <BuildingIcon size={12} color="#64748b" />}
          <span>{p.text}</span>
        </span>
      ))}
    </div>
  );
}

export function SubscriptionPlansCards({
  pricing,
  isAnnual,
  planIdForLevel,
  onSelectPlan,
  currentLevelId,
}: SubscriptionPlansCardsProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const showAnnual = pricing.quoteAnnuallyOnly || isAnnual;
  const periodLabel = showAnnual ? (isEn ? 'yr' : 'سنة') : (isEn ? 'mo' : 'شهر');
  const featuredIndex = Math.min(1, pricing.levels.length - 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
      {pricing.levels.map((level, idx) => {
        const isFeatured = idx === featuredIndex;
        const isCurrent = currentLevelId === level.id;
        const amount = showAnnual ? level.annual : level.monthly;
        const planId = planIdForLevel(level.id);
        const productName = isEn ? translateUiText(pricing.product.name) : pricing.product.name;
        const levelName = isEn ? translateUiText(level.name) : level.name;

        return (
          <div
            key={level.id}
            style={{
              background: '#ffffff',
              border: isFeatured ? '2px solid #170e5e' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: isFeatured ? '0 4px 16px rgba(23, 14, 94, 0.09)' : '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {isCurrent && (
              <span
                style={{
                  position: 'absolute',
                  top: '-11px',
                  right: isEn ? 'auto' : '16px',
                  left: isEn ? '16px' : 'auto',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 10px',
                  borderRadius: '10px',
                }}
              >
                {isEn ? 'Current Plan' : t('settings.subscription.subscription_plans_cards.s0', "باقتك الحالية")}
              </span>
            )}

            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: isFeatured ? '#170e5e' : '#64748b' }}>
                {productName}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: isFeatured ? '#170e5e' : '#0f172a', margin: '4px 0 10px' }}>
                {levelName}
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>
                  {Number(amount).toLocaleString('en-US')}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>
                  {getCurrencySymbol(level.currency)} / {periodLabel}
                </span>
              </div>

              <CapacityPills limits={level.limits} productId={pricing.product.id} isEn={isEn} />

              {level.sectorFeatures.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#170e5e', marginBottom: '8px' }}>
                    {isEn ? 'Tailored for Your Vertical' : t('settings.subscription.subscription_plans_cards.s1', "مخصص لنشاطك")}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    {level.sectorFeatures.map((feat, i) => (
                      <PlanFeatureItem key={i}>{isEn ? translateUiText(feat) : feat}</PlanFeatureItem>
                    ))}
                  </div>
                </div>
              )}

              {level.featureGroups.map((group) => (
                <div key={group.name} style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
                    {isEn ? translateUiText(group.name) : group.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    {group.items.map((feat, i) => (
                      <PlanFeatureItem key={i}>{isEn ? translateUiText(feat) : feat}</PlanFeatureItem>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant={isFeatured ? 'primary' : 'secondary'}
              disabled={isCurrent || planId == null}
              onClick={() => {
                if (planId == null) return;
                onSelectPlan({ id: planId, name: level.name, price: amount, currency: level.currency, levelId: level.id });
              }}
              style={{ width: '100%', fontWeight: 700, fontSize: '12.5px', marginTop: '6px' }}
            >
              {isCurrent
                ? (isEn ? 'Current Plan' : t('settings.subscription.subscription_plans_cards.s2', "باقتك الحالية"))
                : planId == null
                  ? (isEn ? 'Contact Us' : t('settings.subscription.subscription_plans_cards.s3', "تواصل معنا"))
                  : (isEn ? `Select ${levelName}` : `اختيار ${level.name}`)}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
