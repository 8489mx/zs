import { CheckIcon, XIcon, InfoIcon } from '@/shared/components/icons/AppIcons';
import { getCurrencySymbol } from '@/lib/currencies';
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

  // حساب نسب الأعمدة: تقريب أعمدة المقارنة من بعضها بنسب متراصة ومريحة
  const levelCount = levels.length;
  const totalLevelsWidth = levelCount <= 3 ? 36 : 42;
  const levelColPercent = levelCount > 0 ? `${(totalLevelsWidth / levelCount).toFixed(1)}%` : '12%';
  const firstColPercent = levelCount > 0 ? `${(100 - (totalLevelsWidth / levelCount) * levelCount).toFixed(1)}%` : '64%';

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* 1. Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          مقارنة تفصيلية بين مستويات {pricing.product.name}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          ما يضيفه كل مستوى على الذي قبله لمساعدتك في اختيار الباقة الأنسب لاحتياجاتك التشغيلية.
        </p>
      </div>

      {/* 2. Zero-Scroll Comparison Table */}
      <div style={{ width: '100%', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
            fontSize: '12.5px',
            whiteSpace: 'normal',
          }}
        >
          <colgroup>
            <col style={{ width: firstColPercent }} />
            {levels.map((level) => (
              <col key={level.id} style={{ width: levelColPercent }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th
                style={{
                  textAlign: 'start',
                  padding: '16px 20px',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '13px',
                  borderBottom: '2px solid #e2e8f0',
                  borderTopRightRadius: '11px',
                  whiteSpace: 'normal',
                }}
              >
                المجموعة وبيان الميزات
              </th>
              {levels.map((level, idx) => {
                const isLast = idx === levels.length - 1;
                const isMiddle = levels.length === 3 && idx === 1;
                return (
                  <th
                    key={level.id}
                    style={{
                      textAlign: 'center',
                      padding: '14px 10px',
                      borderBottom: '2px solid #e2e8f0',
                      borderTopLeftRadius: isLast ? '11px' : undefined,
                      whiteSpace: 'normal',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        marginBottom: '4px',
                        whiteSpace: 'normal',
                      }}
                    >
                      {level.name}
                    </div>
                    {isLast ? (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '1px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        الأشمل والأعلى
                      </span>
                    ) : isMiddle ? (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '1px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        الأكثر توازناً
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: '#64748b',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '1px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        الأساس
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groupNames.map((groupName, rIdx) => {
              const isEven = rIdx % 2 === 1;
              const items = itemsOfGroup(groupName);
              return (
                <tr
                  key={groupName}
                  style={{
                    background: isEven ? '#fafbfc' : '#ffffff',
                  }}
                >
                  <td
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid #f1f5f9',
                      verticalAlign: 'top',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        color: '#0f172a',
                        fontSize: '13px',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'normal',
                      }}
                    >
                      <span
                        style={{
                          width: '3px',
                          height: '13px',
                          backgroundColor: '#170e5e',
                          borderRadius: '2px',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span>{groupName}</span>
                    </div>
                    <div
                      style={{
                        color: '#64748b',
                        fontSize: '11.5px',
                        lineHeight: 1.65,
                        textAlign: 'start',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        paddingInlineStart: '9px',
                      }}
                    >
                      {items.join(' · ')}
                    </div>
                  </td>
                  {levels.map((level, idx) => {
                    const hasItem = levelHasItem(idx, groupName);
                    return (
                      <td
                        key={level.id}
                        style={{
                          padding: '14px 10px',
                          borderBottom: '1px solid #f1f5f9',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          whiteSpace: 'normal',
                        }}
                      >
                        {hasItem ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              boxShadow: '0 1px 2px rgba(5, 150, 105, 0.06)',
                            }}
                            title={`مشمول في ${level.name}`}
                          >
                            <CheckIcon size={15} strokeWidth={2.8} />
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              background: '#f8fafc',
                              color: '#94a3b8',
                              border: '1px solid #e2e8f0',
                            }}
                            title={`غير مشمول في ${level.name}`}
                          >
                            <XIcon size={12} strokeWidth={2.2} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Floors & Addons Section */}
      {pricing.floors.length > 0 && (
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              طوابق وإضافات مخصصة (تُضاف على المستويين الأول والثاني)
            </h4>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              باقات ووحدات وظيفية متقدمة يمكنك إضافتها لاشتراكك، مع العلم أنها مضمّنة تلقائياً في المستوى الشامل (الأعلى).
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '14px',
            }}
          >
            {pricing.floors.map((floor) => {
              const isIncludedInHighest = Boolean(floor.includedFromLevel);
              const includedLevel = isIncludedInHighest
                ? levels.find((l) => l.id === floor.includedFromLevel)
                : null;
              const currencyLabel = getCurrencySymbol(levels[0]?.currency);

              return (
                <div
                  key={floor.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '94px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Top row: Floor Name */}
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#1e293b',
                        lineHeight: '1.45',
                        wordBreak: 'break-word',
                      }}
                    >
                      {floor.name}
                    </div>
                  </div>

                  {/* Bottom row: Status badge on right, Price badge on left */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Status badge */}
                    <div>
                      {includedLevel ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#047857',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            padding: '2px 8px',
                          }}
                        >
                          <CheckIcon size={12} strokeWidth={2.5} />
                          <span>مضمّن في {includedLevel.name}</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#64748b',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '2px 8px',
                          }}
                        >
                          طابق إضافي اختياري
                        </span>
                      )}
                    </div>

                    {/* Price Badge */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {floor.contactForPrice ? (
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap' }}>
                          تواصل للتسعير
                        </span>
                      ) : floor.pricingRule ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#170e5e', whiteSpace: 'nowrap' }}>
                          {floor.pricingRule}
                        </span>
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#170e5e' }}>
                            {Number(floor.monthly ?? 0).toLocaleString('en-US')}
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                            {currencyLabel}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ شهرياً</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <InfoIcon size={15} color="#64748b" />
            <span>
              كافة الطوابق الموسومة بـ «مضمّن في...» تكون مفعّلة تلقائياً بدون أي تكلفة إضافية عند ترقية الاشتراك للمستوى الشامل.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
