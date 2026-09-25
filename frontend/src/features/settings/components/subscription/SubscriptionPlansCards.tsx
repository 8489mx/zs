import { Button } from '@/shared/ui/button';
import { UsersIcon, BuildingIcon } from '@/shared/components/icons/AppIcons';
import { PlanFeatureItem } from './PlanFeatureItem';
import type { ResolvedPricing, ResolvedPricingLevel } from '../../api/tenant-subscription.api';

/**
 * بطاقات مستويات الباقة — مبنية بالكامل على ما يرسله الخادم.
 *
 * كانت هذه الشاشة أربع بطاقات ثابتة (basic/pro/ultimate/omnichannel) بأسعار من
 * `REGIONAL_PRICING` في الواجهة وقوائم ميزات مكتوبة في الكود. المشاكل التي أُصلحت:
 *  · البند C7: جدول أسعار مكتوب في الواجهة بأرقام قديمة.
 *  · البند C8: منتقي عملات يختاره العميل فيرى سعر بلد آخر.
 *  · البند C9: السعر المعروض من الواجهة والمحصَّل من قاعدة البيانات — مصدران.
 *  · PRICE-S1: عرض باقات وميزات قطاعات أخرى لمنشأة لا تخصها.
 *
 * الآن: مستويات نطاق المنشأة وحدها، بأسعار بلدها وحده، وميزاتها من الكتالوج.
 */
interface SubscriptionPlansCardsProps {
  pricing: ResolvedPricing;
  isAnnual: boolean;
  /** معرّف الباقة في `saas_plans` مقابل كل مستوى — للترقية والدفع */
  planIdForLevel: (levelId: string) => number | null;
  onSelectPlan: (plan: { id: number; name: string; price: number; currency: string; levelId: string }) => void;
  /** المستوى المشترك فيه حالياً، لتعطيل زره */
  currentLevelId?: string | null;
}

function CapacityPills({ limits }: { limits: ResolvedPricingLevel['limits'] }) {
  const describe = (n: number | null | undefined) => (n == null ? 'بلا حد' : String(n));
  const pills: Array<{ icon: 'users' | 'building'; text: string }> = [];

  if (limits.users !== undefined) pills.push({ icon: 'users', text: `${describe(limits.users)} مستخدم` });
  if (limits.branches !== undefined) pills.push({ icon: 'building', text: `${describe(limits.branches)} فرع` });
  if (limits.posTerminals != null) pills.push({ icon: 'building', text: `${limits.posTerminals} طرفية` });
  if (limits.activeProjects != null) pills.push({ icon: 'building', text: `${limits.activeProjects} مشروع نشط` });
  if (limits.containersPerMonth != null) pills.push({ icon: 'building', text: `${limits.containersPerMonth} حاوية/شهر` });
  if (limits.multiCompany) pills.push({ icon: 'building', text: 'تعدد الشركات' });

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
  // المقاولات والشحن تُعرض بالسنوي فقط — الرقم الشهري يُدرك كبرنامج والسنوي كمنظومة (PRICE-S4)
  const showAnnual = pricing.quoteAnnuallyOnly || isAnnual;
  const periodLabel = showAnnual ? 'سنة' : 'شهر';
  // المستوى الأوسط هو المرشَّح: لا "الأكثر طلباً" مكتوبة على باقة بعينها في الكود
  const featuredIndex = Math.min(1, pricing.levels.length - 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
      {pricing.levels.map((level, idx) => {
        const isFeatured = idx === featuredIndex;
        const isCurrent = currentLevelId === level.id;
        const amount = showAnnual ? level.annual : level.monthly;
        const planId = planIdForLevel(level.id);

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
                  right: '16px',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 10px',
                  borderRadius: '10px',
                }}
              >
                باقتك الحالية
              </span>
            )}

            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: isFeatured ? '#170e5e' : '#64748b' }}>
                {pricing.product.name}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: isFeatured ? '#170e5e' : '#0f172a', margin: '4px 0 10px' }}>
                {level.name}
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>
                  {amount.toLocaleString('ar-EG')}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>
                  {level.currency} / {periodLabel}
                </span>
              </div>

              <CapacityPills limits={level.limits} />

              {level.sectorFeatures.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#170e5e', marginBottom: '8px' }}>
                    مخصص لنشاطك
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    {level.sectorFeatures.map((feat, i) => (
                      <PlanFeatureItem key={i}>{feat}</PlanFeatureItem>
                    ))}
                  </div>
                </div>
              )}

              {level.featureGroups.map((group) => (
                <div key={group.name} style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
                    {group.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    {group.items.map((feat, i) => (
                      <PlanFeatureItem key={i}>{feat}</PlanFeatureItem>
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
              {isCurrent ? 'باقتك الحالية' : planId == null ? 'تواصل معنا' : `اختيار ${level.name}`}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
