import { CheckIcon, XIcon } from '@/shared/components/icons/AppIcons';
import type { ResolvedPricing } from '../../api/tenant-subscription.api';

/**
 * مصفوفة مقارنة مستويات الباقة — مبنية على ما يرسله الخادم وحده.
 *
 * كانت هذه المصفوفة تعدّ نحو عشر مجموعات ميزات **لكل الباقات** بأسماء مكتوبة في
 * الكود، فمنشأة مقاولات ترى أن المنظومة تضم مطاعم وصيدليات وملابس — مخالفة مباشرة
 * لـ PRICE-P2 و PRICE-S1 (البند C11). الآن لا تُعرض إلا مجموعات نطاق المنشأة نفسها.
 */
export function DetailedPlanFeaturesMatrix({ pricing }: { pricing: ResolvedPricing }) {
  const { levels } = pricing;
  if (levels.length === 0) return null;

  // اتحاد المجموعات بترتيب ظهورها في المستويات من الأدنى للأعلى
  const groupNames: string[] = [];
  for (const level of levels) {
    for (const group of level.featureGroups) {
      if (!groupNames.includes(group.name)) groupNames.push(group.name);
    }
  }

  const itemsOfGroup = (groupName: string): string[] => {
    for (const level of levels) {
      const found = level.featureGroups.find((g) => g.name === groupName);
      if (found) return found.items;
    }
    return [];
  };

  const levelHasItem = (levelIndex: number, groupName: string): boolean =>
    levels[levelIndex].featureGroups.some((g) => g.name === groupName);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginTop: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
        مقارنة تفصيلية بين مستويات {pricing.product.name}
      </h3>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
        ما يضيفه كل مستوى على الذي قبله.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start', padding: '10px 12px', color: '#475569', fontWeight: 800, borderBottom: '2px solid #e2e8f0' }}>
                المجموعة
              </th>
              {levels.map((level) => (
                <th
                  key={level.id}
                  style={{ textAlign: 'center', padding: '10px 12px', color: '#170e5e', fontWeight: 800, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}
                >
                  {level.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupNames.map((groupName) => (
              <tr key={groupName}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{groupName}</div>
                  <div style={{ color: '#64748b', fontSize: '11.5px', lineHeight: 1.7 }}>
                    {itemsOfGroup(groupName).join(' · ')}
                  </div>
                </td>
                {levels.map((level, idx) => (
                  <td
                    key={level.id}
                    style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', verticalAlign: 'top' }}
                  >
                    {levelHasItem(idx, groupName) ? (
                      <span style={{ color: '#059669', display: 'inline-flex' }}>
                        <CheckIcon size={16} strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', display: 'inline-flex' }}>
                        <XIcon size={14} />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pricing.floors.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
            طوابق تُضاف على المستويين الأول والثاني
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {pricing.floors.map((floor) => (
              <div
                key={floor.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>{floor.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap' }}>
                  {floor.contactForPrice
                    ? 'اتصل بنا'
                    : floor.pricingRule
                      ? floor.pricingRule
                      : `${(floor.monthly ?? 0).toLocaleString('ar-EG')} ${levels[0].currency} / شهر`}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '10px 0 0' }}>
            الطوابق المعلَّمة مضمّنة تلقائياً في المستوى الأعلى.
          </p>
        </div>
      )}
    </div>
  );
}
