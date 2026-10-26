import { useTranslation } from 'react-i18next';
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
  GlobeIcon,
  TruckIcon,
  TagIcon,
  SlidersIcon,
  DropletIcon,
} from '@/shared/components/icons/AppIcons';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { settingsApi } from '@/features/settings/api/settings.api';
import { authApi } from '@/shared/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import type { AppSettings } from '@/types/domain';

interface IndustryModeSelectorCardProps {
  settings?: AppSettings;
  canManageSettings: boolean;
}

type PillarKey = 'contracting' | 'maritime_freight' | 'manufacturing' | 'commerce';
type CommerceSubVertical =
  | 'retail_general'
  | 'pharmacy'
  | 'restaurant'
  | 'maintenance'
  | 'import_export'
  | 'auto_parts'
  | 'clothing'
  | 'warehousing'
  | 'wholesale_van'
  | 'perfumes';

interface PillarConfig {
  key: PillarKey;
  labelAr: string;
  labelEn: string;
  badge: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: typeof BuildingIcon;
  color: string;
  accentBg: string;
  landingRoute: string;
  featuresSummary: string;
  featuresSummaryEn: string;
}

const PILLARS: PillarConfig[] = [
  {
    key: 'contracting',
    labelAr: 'قطاع المقاولات وإدارة المشاريع',
    labelEn: 'Contracting & Project Management',
    badge: 'Contracting ERP',
    descriptionAr: 'إدارة متكاملة للمشاريع الإنشائية، جداول الكميات (BOQ)، الأوامر التغييرية، المستخلصات (IPC)، عقود مقاولي الباطن واليوميات الميدانية.',
    descriptionEn: 'Integrated management of construction projects, Bills of Quantities (BOQ), change orders, interim payment certificates (IPC), subcontractor contracts, and field daily logs.',
    icon: BuildingIcon,
    color: '#0284c7',
    accentBg: '#f0f9ff',
    landingRoute: '/contracting',
    featuresSummary: 'المشاريع • المقايسات • المستخلصات • مقاولو الباطن • الحسابات العامة • الموارد البشرية',
    featuresSummaryEn: 'Projects • BOQ • IPCs • Subcontractors • General Accounting • HR',
  },
  {
    key: 'maritime_freight',
    labelAr: 'قطاع الشحن البحري واللوجستيات',
    labelEn: 'Maritime Freight & Logistics',
    badge: 'Freight Forwarding',
    descriptionAr: 'منظومة الخطوط الملاحية والموانئ، مقارنة أسعار النولون (RFQ)، عروض أسعار العملاء، أوامر تشغيل الشحنات، وتتبع الحاويات وفترات السماح.',
    descriptionEn: 'Shipping lines & ports system, freight rate comparisons (RFQ), customer quotations, shipment operation orders, and container demurrage tracking.',
    icon: ShipIcon,
    color: '#0d9488',
    accentBg: '#f0fdfa',
    landingRoute: '/maritime',
    featuresSummary: 'استفسارات الشحن • تسعير النولون • أوامر التشغيل • الحاويات والغرامات • الشجرة المحاسبية',
    featuresSummaryEn: 'Freight Inquiries • Ocean Freight RFQ • Operation Orders • Containers & Demurrage • Chart of Accounts',
  },
  {
    key: 'manufacturing',
    labelAr: 'قطاع التصنيع والإنتاج الصناعي',
    labelEn: 'Manufacturing & Industrial Production',
    badge: 'Industrial Production',
    descriptionAr: 'منظومة المصانع وإدارة خطوط الإنتاج، أوامر التشغيل، قوائم المكونات (BOM)، تكاليف الإنتاج ومخازن المواد الخام والمنتج التام.',
    descriptionEn: 'Factory system and production line management, work orders, bills of materials (BOM), production costing, raw materials and finished goods warehouses.',
    icon: LayersIcon,
    color: '#4338ca',
    accentBg: '#e0e7ff',
    landingRoute: '/manufacturing/work-orders',
    featuresSummary: 'أوامر الإنتاج • قوائم المكونات BOM • مخازن المواد الخام • مراكز التكلفة • مشتريات التوريد • CRM',
    featuresSummaryEn: 'Work Orders • BOM • Raw Material Warehouses • Cost Centers • Supply Procurement • CRM',
  },
  {
    key: 'commerce',
    labelAr: 'قطاع التجارة وإدارة الأعمال',
    labelEn: 'Commerce & Retail Business',
    badge: 'Commerce & Retail',
    descriptionAr: 'منظومة التجارة المتكاملة لنقاط البيع السريعة، المخازن والمستودعات، المشتريات والموردين، مع تخصيصات فرعية دقيقة لطبيعة النشاط.',
    descriptionEn: 'Integrated commerce system for fast POS, warehouses & inventory, purchasing & suppliers, with sub-vertical configurations tailored to your business.',
    icon: ShoppingBagIcon,
    color: '#170e5e',
    accentBg: '#eef2ff',
    landingRoute: '/',
    featuresSummary: 'نقاط البيع • المخازن والباركود • المشتريات • الحسابات • الخزينة • الفاتورة الإلكترونية',
    featuresSummaryEn: 'POS • Warehouses & Barcode • Purchasing • Accounting • Treasury • E-Invoicing',
  },
];

interface SubVerticalConfig {
  key: CommerceSubVertical;
  labelAr: string;
  labelEn: string;
  tag: string;
  tagEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: typeof PackageIcon;
}

const PRIMARY_COMMERCE_SUB_VERTICALS: SubVerticalConfig[] = [
  {
    key: 'retail_general',
    labelAr: 'التجزئة والتجارة العامة',
    labelEn: 'Retail & General Trade',
    tag: 'عام وافتراضي',
    tagEn: 'Default & General',
    descriptionAr: 'محلات التجزئة، الجملة، السوبرماركت، والأنشطة التجارية المتنوعة بمخزون وباركود قياسي.',
    descriptionEn: 'Retail shops, wholesale, supermarkets, and diverse commercial activities with standard stock & barcodes.',
    icon: PackageIcon,
  },
  {
    key: 'clothing',
    labelAr: 'الملابس والأزياء والأحذية',
    labelEn: 'Fashion, Apparel & Footwear',
    tag: 'مصفوفة المقاسات والألوان',
    tagEn: 'Size & Color Matrix',
    descriptionAr: 'إدارة المقاسات والألوان المتعددة للأصناف، توليد باركود الفاشون، وتصنيفات الموديلات والمواسم.',
    descriptionEn: 'Multi-variant size and color matrices, fashion barcode generation, seasonal styles and collections.',
    icon: TagIcon,
  },
  {
    key: 'warehousing',
    labelAr: 'إدارة المخازن والمستودعات والتحويلات',
    labelEn: 'Warehouse & Inventory Management',
    tag: 'مستودعات وتحويلات وجرد',
    tagEn: 'Warehouses & Transfers',
    descriptionAr: 'المستودعات المركزية والفرعية، التحويلات بين الفروع وتتبع بضاعة الطريق، أذونات الصرف والإضافة، الجرد ونواقص المخزون بدون كاشير.',
    descriptionEn: 'Central and branch warehouses, inter-branch transfers, issue/receipt vouchers, audits and safety stock without POS.',
    icon: LayersIcon,
  },
  {
    key: 'wholesale_van',
    labelAr: 'تجارة وتوزيع الجملة وأسطول الفان',
    labelEn: 'Wholesale & Van Fleet Sales',
    tag: 'مخازن وسيارات ومناديب',
    tagEn: 'Warehouses, Vans & Reps',
    descriptionAr: 'شركات التوزيع، تجارة الجملة، أسطول سيارات الفان، خطوط السير، والمخازن المتنقلة مع إلغاء نقاط البيع والكاشير.',
    descriptionEn: 'Distribution companies, wholesale trade, van sales fleet, delivery routes, and mobile warehouses.',
    icon: TruckIcon,
  },
  {
    key: 'import_export',
    labelAr: 'الاستيراد والتجارة الدولية',
    labelEn: 'Import & International Trade',
    tag: 'شحنات وجمارك وشركاء',
    tagEn: 'Shipments & Customs',
    descriptionAr: 'إدارة الشحنات والحاويات الجمركية، مديونية المصانع والموردين الخارجيين، وأرباح الشركاء الممولين.',
    descriptionEn: 'Customs shipments, overseas factory & vendor payables, and investor/financier profit shares.',
    icon: GlobeIcon,
  },
  {
    key: 'pharmacy',
    labelAr: 'الصيدليات والمستلزمات الطبية',
    labelEn: 'Pharmacies & Medical Supplies',
    tag: 'FEFO الرقابي',
    tagEn: 'FEFO Regulatory',
    descriptionAr: 'تتبع التشغيلات وتواريخ انتهاء الصلاحية، دليل الأدوية والبدائل، الروشتات، وكشكول النواقص.',
    descriptionEn: 'Batch tracking and expiry dates, drug dictionary & alternatives, prescriptions, and shortage register.',
    icon: ShieldCheckIcon,
  },
  {
    key: 'restaurant',
    labelAr: 'المطاعم والكافيهات والأغذية',
    labelEn: 'Restaurants, Cafes & Food Services',
    tag: 'KDS والمطبخ',
    tagEn: 'KDS & Kitchen',
    descriptionAr: 'شاشة المطبخ KDS، الطاولات والصالات، خيارات وإضافات الأصناف، والطلبات السريعة.',
    descriptionEn: 'Kitchen Display System (KDS), dining tables, item variations & modifiers, and fast takeaway orders.',
    icon: ReceiptIcon,
  },
  {
    key: 'maintenance',
    labelAr: 'مراكز الصيانة وخدمة الأجهزة',
    labelEn: 'Service & Device Repair Centers',
    tag: 'كروت الصيانة و IMEI',
    tagEn: 'Repair Cards & IMEI',
    descriptionAr: 'استلام الأجهزة، كروت الصيانة والضمان، تتبع أرقام السيريال IMEI، وفحص واستبدال المستعمل.',
    descriptionEn: 'Device intake, repair cards & warranty, IMEI serial tracking, and device trade-in valuation.',
    icon: ToolIcon,
  },
  {
    key: 'perfumes',
    labelAr: 'العطور ومستحضرات التجميل والتركيبات',
    labelEn: 'Perfumes, Cosmetics & Fragrances',
    tag: 'تركيبات وسعات وعطور',
    tagEn: 'Fragrances & Blending',
    descriptionAr: 'تركيبات العطور والزيوت الخام، أحجام وسعات الزجاجات (مل)، مجموعات الهدايا، وكاشير التجزئة السريع.',
    descriptionEn: 'Custom fragrance blending, raw oils, bottle sizes (ml), gift sets, and fast retail barcode POS.',
    icon: DropletIcon,
  },
];

const EXTENDED_COMMERCE_SUB_VERTICALS: SubVerticalConfig[] = [
  {
    key: 'auto_parts',
    labelAr: 'قطع غيار السيارات والمعدات',
    labelEn: 'Auto Parts & Machinery',
    tag: 'أرقام OEM وتوافق السيارات',
    tagEn: 'OEM Numbers & Fitment',
    descriptionAr: 'دليل قطع الغيار، أرقام القطع الأصلية OEM، وتوافق موديلات وماركات وسنوات صنع المركبات.',
    descriptionEn: 'Parts directory, OEM numbers, vehicle make/model/year compatibility and cross-reference.',
    icon: TruckIcon,
  },
];

const ALL_COMMERCE_SUB_VERTICALS: SubVerticalConfig[] = [
  ...PRIMARY_COMMERCE_SUB_VERTICALS,
  ...EXTENDED_COMMERCE_SUB_VERTICALS,
];

const COMMERCE_SUB_VERTICALS = ALL_COMMERCE_SUB_VERTICALS;

export function IndustryModeSelectorCard({ settings, canManageSettings }: IndustryModeSelectorCardProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const queryClient = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const updateSessionMeta = useAuthStore((s) => s.updateSessionMeta);

  const [, startTransition] = useTransition();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Active state derived from tenant context or settings fallback
  const currentActivityType = String(
    tenant?.activityType || settings?.activityType || settings?.businessIndustry || 'retail_general',
  ).trim().toLowerCase();

  const isCurrentSubExtended = ['auto_parts', 'autoparts'].includes(currentActivityType);
  const [showAllSubVerticals, setShowAllSubVerticals] = useState(() => isCurrentSubExtended);

  const currentPillar: PillarKey =
    currentActivityType === 'contracting'
      ? 'contracting'
      : currentActivityType === 'maritime_freight' || currentActivityType === 'maritime'
      ? 'maritime_freight'
      : currentActivityType === 'manufacturing' || currentActivityType === 'production'
      ? 'manufacturing'
      : 'commerce';

  const currentSubVertical: CommerceSubVertical =
    currentActivityType === 'warehousing' || currentActivityType === 'warehouse' || currentActivityType === 'مخازن' || currentActivityType === 'مستودع' || currentActivityType === 'wms'
      ? 'warehousing'
      : currentActivityType === 'wholesale_van' || currentActivityType === 'wholesale' || currentActivityType === 'distribution' || currentActivityType === 'توزيع' || currentActivityType === 'فان'
      ? 'wholesale_van'
      : currentActivityType === 'pharmacy'
      ? 'pharmacy'
      : currentActivityType === 'restaurant'
      ? 'restaurant'
      : currentActivityType === 'maintenance' || currentActivityType === 'electronics'
      ? 'maintenance'
      : currentActivityType === 'import_export' || currentActivityType === 'import'
      ? 'import_export'
      : currentActivityType === 'auto_parts' || currentActivityType === 'autoparts'
      ? 'auto_parts'
      : currentActivityType === 'clothing' || currentActivityType === 'fashion'
      ? 'clothing'
      : currentActivityType === 'perfumes' || currentActivityType === 'cosmetics' || currentActivityType === 'fragrances' || currentActivityType === 'عطور'
      ? 'perfumes'
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

          authApi.me().then((meRes) => {
            if (meRes?.tenant) {
              updateSessionMeta({ tenant: meRes.tenant });
            }
          }).catch(() => undefined);

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
              {t('settings.workspace_sections.industry_mode_selector_card.s0', "نمط المنظومة ونشاط المنشأة التشغيلي")}
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
              {t('settings.workspace_sections.industry_mode_selector_card.s1', "عزل قطاعي شامل")}
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
            {t('settings.workspace_sections.industry_mode_selector_card.s2', "اختر القطاع الرئيسي وطبيعة العمل لتهيئة القوائم، شاشات التشغيل، والمعاملات المالية تلقائياً.")}
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
            {t('settings.workspace_sections.industry_mode_selector_card.s3', "النمط الحالي:")} <strong style={{ color: '#170e5e' }}>{isEn ? (PILLARS.find((p) => p.key === currentPillar)?.labelEn || PILLARS.find((p) => p.key === currentPillar)?.labelAr) : PILLARS.find((p) => p.key === currentPillar)?.labelAr}</strong>
            {currentPillar === 'commerce' && (
              <span style={{ color: '#047857' }}>
                {' '}
                ({isEn ? (COMMERCE_SUB_VERTICALS.find((v) => v.key === currentSubVertical)?.labelEn || COMMERCE_SUB_VERTICALS.find((v) => v.key === currentSubVertical)?.labelAr) : COMMERCE_SUB_VERTICALS.find((v) => v.key === currentSubVertical)?.labelAr})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 4 Core Pillars Grid */}
      <style>{`
        .industry-pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 960px) {
          .industry-pillars-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 540px) {
          .industry-pillars-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="industry-pillars-grid">
        {PILLARS.map((pillar) => {
          const isPillarActive = currentPillar === pillar.key;
          const Icon = pillar.icon;
          const isTargetUpdating = updatingKey === pillar.key;

          return (
            <div
              key={pillar.key}
              onClick={() => {
                if (pillar.key === 'commerce') {
                  if (!isPillarActive) {
                    const targetSub = currentSubVertical || 'retail_general';
                    const targetLabel = COMMERCE_SUB_VERTICALS.find((s) => s.key === targetSub)?.labelAr || t('settings.workspace_sections.industry_mode_selector_card.s4', "التجزئة والتجارة العامة");
                    handleSelectMode(targetSub, `قطاع التجارة - ${targetLabel}`);
                  }
                } else {
                  handleSelectMode(pillar.key, pillar.labelAr);
                }
              }}
              style={{
                position: 'relative',
                padding: '14px 14px',
                borderRadius: '12px',
                border: isPillarActive ? `2px solid ${pillar.color}` : '1px solid #e2e8f0',
                background: isPillarActive ? pillar.accentBg : '#ffffff',
                cursor: canManageSettings ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minHeight: '210px',
                boxShadow: isPillarActive ? `0 4px 12px ${pillar.color}15` : 'none',
              }}
            >
              {/* Pillar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: isPillarActive ? pillar.color : '#f1f5f9',
                      color: isPillarActive ? '#ffffff' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800, display: 'block', lineHeight: 1.25 }}>
                      {isEn ? pillar.labelEn : pillar.labelAr}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{pillar.badge}</span>
                  </div>
                </div>

                {isPillarActive && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: pillar.color,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: `1px solid ${pillar.color}40`,
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircleIcon size={12} color={pillar.color} />
                    {t('settings.workspace_sections.industry_mode_selector_card.s5', "مفعل")}
                  </span>
                )}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#475569',
                  margin: 0,
                  lineHeight: 1.5,
                  textAlign: 'justify',
                  textJustify: 'inter-word',
                }}
              >
                {isEn ? pillar.descriptionEn : pillar.descriptionAr}
              </p>

              {/* Features Pill Footer */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px dashed #cbd5e1',
                  fontSize: '0.69rem',
                  color: '#64748b',
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                {isEn ? pillar.featuresSummaryEn : pillar.featuresSummary}
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
                  {t('settings.workspace_sections.industry_mode_selector_card.s6', "جاري تحويل النمط...")}
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
                {t('settings.workspace_sections.industry_mode_selector_card.s7', "التخصص الفرعي لقطاع التجارة")} ({showAllSubVerticals ? `${ALL_COMMERCE_SUB_VERTICALS.length} ${t('settings.workspace_sections.industry_mode_selector_card.s8', "تخصصات متاحة")}` : `${PRIMARY_COMMERCE_SUB_VERTICALS.length} ${t('settings.workspace_sections.industry_mode_selector_card.s9', "تخصصات رئيسية")}`})
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                {t('settings.workspace_sections.industry_mode_selector_card.s10', "حدد التخصص الدقيق لنشاطك لتفعيل الأدوات المتخصصة دون تداخل مع الأنشطة الأخرى:")}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAllSubVerticals((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: showAllSubVerticals ? '#eef2ff' : '#ffffff',
                color: showAllSubVerticals ? '#170e5e' : '#475569',
                border: showAllSubVerticals ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                transition: 'all 0.15s ease',
              }}
            >
              <SlidersIcon size={14} color={showAllSubVerticals ? '#170e5e' : '#475569'} />
              <span>{showAllSubVerticals ? t('settings.workspace_sections.industry_mode_selector_card.s11', "إخفاء الأنشطة الإضافية") : `${t('settings.workspace_sections.industry_mode_selector_card.s12', "عرض باقي التخصصات والأنشطة")} (${EXTENDED_COMMERCE_SUB_VERTICALS.length})`}</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {[
              ...PRIMARY_COMMERCE_SUB_VERTICALS,
              ...(showAllSubVerticals ? EXTENDED_COMMERCE_SUB_VERTICALS : []),
            ].map((sub) => {
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
                        {isEn ? sub.labelEn : sub.labelAr}
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
                    {isEn ? sub.descriptionEn : sub.descriptionAr}
                  </p>

                  <span
                    style={{
                      fontSize: '0.67rem',
                      color: isSubActive ? '#170e5e' : '#64748b',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    {isEn ? sub.tagEn : sub.tag}
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
                      {t('settings.workspace_sections.industry_mode_selector_card.s13', "جارٍ التفعيل...")}
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
          <strong>{t('settings.workspace_sections.industry_mode_selector_card.s14', "ملاحظة أمان:")}</strong> {t('settings.workspace_sections.industry_mode_selector_card.s15', "تغيير نمط المنظومة يعيد ضبط واجهات القوائم والصلاحيات التشغيلية دون حذف أي بيانات سابقة. تظل كافة الفواتير والقيود المحاسبية ومشاريعك محفوظة بأمان تام في قاعدة البيانات.")}
        </span>
      </div>
    </div>
  );
}
