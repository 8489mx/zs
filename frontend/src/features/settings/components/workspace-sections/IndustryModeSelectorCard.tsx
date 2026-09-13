import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BuildingIcon,
  ShipIcon,
  ShoppingBagIcon,
  PackageIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  LayersIcon,
  ToolIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { settingsApi } from '@/features/settings/api/settings.api';
import { useAuthStore } from '@/stores/auth-store';
import type { AppSettings } from '@/types/domain';

interface IndustryModeSelectorCardProps {
  settings?: AppSettings;
  canManageSettings: boolean;
}

type PillarKey = 'contracting' | 'maritime_freight' | 'commerce';
type CommerceSubVertical = 'retail_general' | 'pharmacy' | 'restaurant' | 'manufacturing' | 'maintenance';

interface PillarConfig {
  key: PillarKey;
  labelAr: string;
  badge: string;
  descriptionAr: string;
  icon: typeof BuildingIcon;
  color: string;
  accentBg: string;
  landingRoute: string;
  featuresSummary: string;
}

const PILLARS: PillarConfig[] = [
  {
    key: 'contracting',
    labelAr: 'قطاع المقاولات وإدارة المشاريع',
    badge: 'Contracting ERP',
    descriptionAr: 'إدارة متكاملة للمشاريع الإنشائية، جداول الكميات (BOQ)، الأوامر التغييرية، المستخلصات (IPC)، عقود مقاولي الباطن واليوميات الميدانية.',
    icon: BuildingIcon,
    color: '#0284c7',
    accentBg: '#f0f9ff',
    landingRoute: '/contracting',
    featuresSummary: 'المشاريع • المقايسات • المستخلصات • مقاولو الباطن • الحسابات العامة • الموارد البشرية',
  },
  {
    key: 'maritime_freight',
    labelAr: 'قطاع الشحن البحري واللوجستيات',
    badge: 'Freight Forwarding',
    descriptionAr: 'منظومة الخطوط الملاحية والموانئ، مقارنة أسعار النولون (RFQ)، عروض أسعار العملاء، أوامر تشغيل الشحنات، وتتبع الحاويات وفترات السماح.',
    icon: ShipIcon,
    color: '#0d9488',
    accentBg: '#f0fdfa',
    landingRoute: '/maritime-freight',
    featuresSummary: 'استفسارات الشحن • تسعير النولون • أوامر التشغيل • الحاويات والغرامات • الشجرة المحاسبية',
  },
  {
    key: 'commerce',
    labelAr: 'قطاع التجارة وإدارة الأعمال',
    badge: 'Commerce & Retail',
    descriptionAr: 'منظومة التجارة المتكاملة لنقاط البيع السريعة، المخازن والمستودعات، المشتريات والموردين، مع تخصيصات فرعية دقيقة لطبيعة النشاط.',
    icon: ShoppingBagIcon,
    color: '#170e5e',
    accentBg: '#eef2ff',
    landingRoute: '/',
    featuresSummary: 'نقاط البيع • المخازن والباركود • المشتريات • الحسابات • الخزينة • الفاتورة الإلكترونية',
  },
];

interface SubVerticalConfig {
  key: CommerceSubVertical;
  labelAr: string;
  tag: string;
  descriptionAr: string;
  icon: typeof PackageIcon;
}

const COMMERCE_SUB_VERTICALS: SubVerticalConfig[] = [
  {
    key: 'retail_general',
    labelAr: 'التجزئة والتجارة العامة',
    tag: 'عام وافتراضي',
    descriptionAr: 'محلات التجزئة، الجملة، السوبرماركت، والأنشطة التجارية المتنوعة بمخزون وباركود قياسي.',
    icon: PackageIcon,
  },
  {
    key: 'pharmacy',
    labelAr: 'الصيدليات والمستلزمات الطبية',
    tag: 'FEFO الرقابي',
    descriptionAr: 'تتبع التشغيلات وتواريخ انتهاء الصلاحية، دليل الأدوية والبدائل، الروشتات، وكشكول النواقص.',
    icon: ShieldCheckIcon,
  },
  {
    key: 'restaurant',
    labelAr: 'المطاعم والكافيهات والأغذية',
    tag: 'KDS والمطبخ',
    descriptionAr: 'شاشة المطبخ KDS، الطاولات والصالات، خيارات وإضافات الأصناف، والطلبات السريعة.',
    icon: ReceiptIcon,
  },
  {
    key: 'manufacturing',
    labelAr: 'التصنيع وخطوط الإنتاج الخفيف',
    tag: 'BOM وشجرة المنتج',
    descriptionAr: 'قوائم مكونات الإنتاج (BOM)، أوامر التشغيل، استهلاك المواد الخام، وحساب التكلفة الصناعية.',
    icon: LayersIcon,
  },
  {
    key: 'maintenance',
    labelAr: 'مراكز الصيانة وخدمة الأجهزة',
    tag: 'كروت الصيانة و IMEI',
    descriptionAr: 'استلام الأجهزة، كروت الصيانة والضمان، تتبع أرقام السيريال IMEI، وفحص واستبدال المستعمل.',
    icon: ToolIcon,
  },
];

export function IndustryModeSelectorCard({ settings, canManageSettings }: IndustryModeSelectorCardProps) {
  const queryClient = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const updateSessionMeta = useAuthStore((s) => s.updateSessionMeta);

  const [, startTransition] = useTransition();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Active state derived from tenant context or settings fallback
  const currentActivityType = String(
    tenant?.activityType || settings?.activityType || settings?.businessIndustry || 'retail_general',
  ).trim().toLowerCase();

  const currentPillar: PillarKey =
    currentActivityType === 'contracting'
      ? 'contracting'
      : currentActivityType === 'maritime_freight' || currentActivityType === 'maritime'
      ? 'maritime_freight'
      : 'commerce';

  const currentSubVertical: CommerceSubVertical =
    currentActivityType === 'pharmacy'
      ? 'pharmacy'
      : currentActivityType === 'restaurant'
      ? 'restaurant'
      : currentActivityType === 'manufacturing'
      ? 'manufacturing'
      : currentActivityType === 'maintenance' || currentActivityType === 'electronics'
      ? 'maintenance'
      : 'retail_general';

  const handleSelectMode = async (targetActivityType: string, labelAr: string) => {
    if (!canManageSettings) {
      toast.warning('صلاحية تعديل نمط المنظومة مخصصة للمدير العام أو إدارة المنشأة فقط.');
      return;
    }

    if (targetActivityType === currentActivityType) {
      toast.info(`المنظومة مهيأة بالفعل على نمط: ${labelAr}`);
      return;
    }

    const confirmed = await systemConfirm({
      title: 'تأكيد تغيير نمط المنظومة والنشاط',
      message: `هل أنت متأكد من التحويل إلى نمط [${labelAr}]؟ سيتم تحديث القوائم الجانبية، الموديولات الفعالة، وشاشات العمل فوراً لتناسب هذا النشاط.`,
      confirmText: 'تأكيد التحويل',
      cancelText: 'إلغاء',
      variant: 'primary',
    });

    if (!confirmed) return;

    setUpdatingKey(targetActivityType);
    startTransition(async () => {
      try {
        const res = await settingsApi.setActivityProfile(targetActivityType);
        if (res.ok) {
          // Immediately update auth store session context
          if (tenant) {
            updateSessionMeta({
              tenant: {
                ...tenant,
                activityType: res.activityType,
                pillar: res.pillar,
              },
            });
          }

          // Immediately patch settings in React Query cache so the entire app updates with 0ms lag
          queryClient.setQueriesData({ queryKey: ['settings'] }, (old: any) => {
            if (!old) return old;
            return {
              ...old,
              activityType: res.activityType,
              businessIndustry: res.activityType,
              ...(res.settingsPatch || {}),
            };
          });

          // Invalidate settings and auth query caches
          await queryClient.invalidateQueries({ queryKey: ['settings'] });
          await queryClient.invalidateQueries({ queryKey: ['auth'] });

          toast.success(res.message || `تم تفعيل نمط [${labelAr}] بنجاح`);
        }
      } catch (err: any) {
        toast.error(err?.message || 'تعذر تغيير نمط المنظومة');
      } finally {
        setUpdatingKey(null);
      }
    });
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 900 }}>
              نمط المنظومة ونشاط المنشأة التشغيلي
            </strong>
            <span
              style={{
                fontSize: '0.72rem',
                background: '#eef2ff',
                color: '#170e5e',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 800,
              }}
            >
              عزل قطاعي شامل
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
            اختر القطاع الرئيسي وطبيعة العمل لتهيئة القوائم، شاشات التشغيل، والمعاملات المالية تلقائياً.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.74rem',
              color: '#475569',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: 700,
            }}
          >
            النمط الحالي: <strong style={{ color: '#170e5e' }}>{PILLARS.find((p) => p.key === currentPillar)?.labelAr}</strong>
            {currentPillar === 'commerce' && (
              <span style={{ color: '#047857' }}>
                {' '}
                ({COMMERCE_SUB_VERTICALS.find((v) => v.key === currentSubVertical)?.labelAr})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 3 Core Pillars Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '14px',
        }}
      >
        {PILLARS.map((pillar) => {
          const isPillarActive = currentPillar === pillar.key;
          const Icon = pillar.icon;
          const isTargetUpdating = updatingKey === pillar.key;

          return (
            <div
              key={pillar.key}
              onClick={() => {
                if (pillar.key === 'commerce') {
                  // If switching from contracting/maritime to commerce, default to current subVertical or retail_general
                  if (!isPillarActive) {
                    handleSelectMode(currentSubVertical, `قطاع التجارة - ${COMMERCE_SUB_VERTICALS.find(s => s.key === currentSubVertical)?.labelAr}`);
                  }
                } else {
                  handleSelectMode(pillar.key, pillar.labelAr);
                }
              }}
              style={{
                position: 'relative',
                padding: '16px 18px',
                borderRadius: '12px',
                border: isPillarActive ? `2px solid ${pillar.color}` : '1px solid #e2e8f0',
                background: isPillarActive ? pillar.accentBg : '#ffffff',
                cursor: canManageSettings ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: isPillarActive ? `0 4px 12px ${pillar.color}15` : 'none',
              }}
            >
              {/* Pillar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: isPillarActive ? pillar.color : '#f1f5f9',
                      color: isPillarActive ? '#ffffff' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                      {pillar.labelAr}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{pillar.badge}</span>
                  </div>
                </div>

                {isPillarActive && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: pillar.color,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${pillar.color}40`,
                    }}
                  >
                    <CheckCircleIcon size={13} color={pillar.color} />
                    مفعل
                  </span>
                )}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#475569',
                  margin: 0,
                  lineHeight: 1.5,
                  textAlign: 'justify',
                  textJustify: 'inter-word',
                }}
              >
                {pillar.descriptionAr}
              </p>

              {/* Features Pill Footer */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px dashed #cbd5e1',
                  fontSize: '0.71rem',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                {pillar.featuresSummary}
              </div>

              {isTargetUpdating && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#170e5e',
                  }}
                >
                  جاري تحويل النمط...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sub-verticals selector for Commerce Pillar */}
      {currentPillar === 'commerce' && (
        <div
          style={{
            marginTop: '6px',
            padding: '16px 18px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                التخصص الفرعي لقطاع التجارة (5 تخصصات متوافقة)
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                حدد التخصص الدقيق لنشاطك لتفعيل الأدوات المتخصصة (مثل أرقام التشغيلات، شاشات المطبخ، أو شجرة التصنيع):
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {COMMERCE_SUB_VERTICALS.map((sub) => {
              const isSubActive = currentSubVertical === sub.key;
              const SubIcon = sub.icon;
              const isSubUpdating = updatingKey === sub.key;

              return (
                <div
                  key={sub.key}
                  onClick={() => handleSelectMode(sub.key, sub.labelAr)}
                  style={{
                    position: 'relative',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSubActive ? '2px solid #170e5e' : '1px solid #cbd5e1',
                    background: isSubActive ? '#ffffff' : '#ffffff',
                    cursor: canManageSettings ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSubActive ? '0 2px 8px rgba(23, 14, 94, 0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isSubActive ? '#170e5e' : '#f1f5f9',
                          color: isSubActive ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SubIcon size={15} />
                      </div>
                      <strong style={{ fontSize: '0.82rem', color: isSubActive ? '#170e5e' : '#0f172a', fontWeight: 800 }}>
                        {sub.labelAr}
                      </strong>
                    </div>

                    {isSubActive && <CheckCircleIcon size={14} color="#170e5e" />}
                  </div>

                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      margin: 0,
                      lineHeight: 1.4,
                      textAlign: 'justify',
                    }}
                  >
                    {sub.descriptionAr}
                  </p>

                  <span
                    style={{
                      fontSize: '0.67rem',
                      color: isSubActive ? '#170e5e' : '#64748b',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    {sub.tag}
                  </span>

                  {isSubUpdating && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: '#170e5e',
                      }}
                    >
                      جارٍ التفعيل...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Safety Notice */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.76rem',
          color: '#475569',
        }}
      >
        <AlertCircleIcon size={16} color="#64748b" />
        <span>
          <strong>ملاحظة أمان:</strong> تغيير نمط المنظومة يعيد ضبط واجهات القوائم والصلاحيات التشغيلية دون حذف أي بيانات سابقة. تظل كافة الفواتير والقيود المحاسبية ومشاريعك محفوظة بأمان تام في قاعدة البيانات.
        </span>
      </div>
    </div>
  );
}
