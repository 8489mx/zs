import { Button } from '@/shared/ui/button';
import { UsersIcon, BuildingIcon } from '@/shared/components/icons/AppIcons';
import { PlanFeatureItem } from './pricing-data';

interface SubscriptionPlansCardsProps {
  activeCurrency: string;
  isAnnual: boolean;
  onSelectPlan: (plan: { id: number; name: string; price: number; currency: string }) => void;
  basicPlanObj: any;
  proPlanObj: any;
  enterprisePlanObj: any;
  omnichannelPlanObj: any;
  basicPrice: number;
  proPrice: number;
  enterprisePrice: number;
  omnichannelPrice: number;
  unit: string;
}

const BASIC_FEATURES = [
  'كاشير بيع سريع بالباركود (POS Workspace)',
  'محرك البيع بدون إنترنت (Offline-First) والمزامنة',
  'كتالوج الأصناف والتصنيفات والباركود والأوزان',
  'دعم باركود الميزان للأجبان واللحوم والسلع الموزونة',
  'ورديات الكاشير وجلسات النقدية ومصروفات الدرج',
  'عروض الوجبات المجمعة وحزم التوفير (Combo)',
  'طباعة الإيصالات والفواتير الحرارية وباركود QR',
];

const PRO_EXTRA_FEATURES = [
  'فواتير المشتريات وتكلفة البضاعة ومرتجع الشراء',
  'سجل وحسابات الموردين وسندات الصرف والمديونيات',
  'المخازن والمستودعات والتحويلات وأذون الصرف والجرد',
  'موديول الخدمات والمصنعيات وحساب عمولات الفنيين',
  'لوحة التحكم التنفيذية ومؤشرات الأداء اللحظية',
  'تقارير الأرباح والمبيعات والمخزون وحركة الخزينة',
  'سجل العملاء وكشف حساب العميل ومتابعة الذمم',
];

const ULTIMATE_EXTRA_FEATURES = [
  'المحاسبة الشجرية ودليل الحسابات ومراكز التكلفة والقيود',
  'المطاعم والكافيهات وشاشات المطبخ KDS وإدارة الطاولات',
  'الصيدليات والأدوية وتتبع الصلاحيات والتشغيلات (FEFO)',
  'الملابس ومصفوفة الألوان والمقاسات (Variants) والليبل',
  'الصيانة وتتبع السيريال IMEI وفحص الضمان والـ Trade-in',
  'التصنيع وقوائم المواد (BOM) وحساب تكاليف الإنتاج',
  'الاستيراد والشحن والحاويات البحرية وحصص الشركاء',
  'الموارد البشرية (HR) ومسير الرواتب والحضور والسلف',
  'مبيعات وجدولة التقسيط وإدارة الديون والفوائد',
  'أسطول التوصيل ومناديب البيع وتطبيق السائق PWA',
  'الفاتورة الإلكترونية والإقرار الضريبي (ETA / ZATCA)',
];

const OMNICHANNEL_EXTRA_FEATURES = [
  'متجر إلكتروني سحابي متزامن لحظياً مع أرصدة المخازن',
  'بوابات الدفع الخليجية: مدى، كي نت، بنفت (Tap Payments)',
  'بوابات الدفع العالمية: Stripe مع دعم Apple Pay و G-Pay',
  'بوابات الدفع المصرية: فيزا، ماستركارد، ومحافظ (Paymob & XPay)',
  'تطبيق ويب تقدمي للعملاء (PWA) وتتبع مباشر «طلباتي»',
  'تسعير الشحن الذكي للمحافظات والشحن المجاني التلقائي',
  'كوبونات الخصم، العروض الترويجية، وحملات الواتساب',
  'شاشات المطبخ KDS وبوابة الشاشات الرقمية Signage',
  'إدارة وتوجيه طلبات الأونلاين للمناديب والفروع',
  'نسخ احتياطي سحابي ومحلي فوري وأولوية دعم فني قصوى',
];

const PRO_ALL_FEATURES = [...BASIC_FEATURES, ...PRO_EXTRA_FEATURES];
const ULTIMATE_ALL_FEATURES = [...PRO_ALL_FEATURES, ...ULTIMATE_EXTRA_FEATURES];
const OMNICHANNEL_ALL_FEATURES = [...ULTIMATE_ALL_FEATURES, ...OMNICHANNEL_EXTRA_FEATURES];

interface CapacityPillProps {
  users: string;
  branches: string;
  isHighlighted?: boolean;
}

function CapacityPills({ users, branches, isHighlighted }: CapacityPillProps) {
  const bg = isHighlighted ? '#f5f3ff' : '#f8fafc';
  const border = isHighlighted ? '#ddd6fe' : '#e2e8f0';
  const color = isHighlighted ? '#170e5e' : '#334155';
  const iconColor = isHighlighted ? '#170e5e' : '#64748b';

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: '16px',
          padding: '3px 9px',
          fontSize: '11px',
          fontWeight: 700,
          color,
        }}
      >
        <UsersIcon size={13} color={iconColor} strokeWidth={2.2} />
        <span>{users}</span>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: '16px',
          padding: '3px 9px',
          fontSize: '11px',
          fontWeight: 700,
          color,
        }}
      >
        <BuildingIcon size={13} color={iconColor} strokeWidth={2.2} />
        <span>{branches}</span>
      </div>
    </div>
  );
}

export function SubscriptionPlansCards({
  activeCurrency,
  isAnnual,
  onSelectPlan,
  basicPlanObj,
  proPlanObj,
  enterprisePlanObj,
  omnichannelPlanObj,
  basicPrice,
  proPrice,
  enterprisePrice,
  omnichannelPrice,
  unit,
}: SubscriptionPlansCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
      {/* 1. Basic Plan */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>بداية الأعمال ونقاط البيع السريعة</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>الباقة الأساسية (Starter POS)</h3>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{basicPrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <CapacityPills users="1 مستخدم" branches="1 فرع" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155', marginBottom: '22px' }}>
            {BASIC_FEATURES.map((feat, idx) => (
              <PlanFeatureItem key={idx}>{feat}</PlanFeatureItem>
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => onSelectPlan({ id: basicPlanObj.id, name: 'الباقة الأساسية', price: basicPrice, currency: activeCurrency })}
          style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
        >
          اختيار الباقة الأساسية
        </Button>
      </div>

      {/* 2. Pro Plan */}
      <div style={{ background: '#ffffff', border: '2px solid #170e5e', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 4px 16px rgba(23, 14, 94, 0.09)' }}>
        <span style={{ position: 'absolute', top: '-11px', right: '16px', background: '#170e5e', color: '#ffffff', fontSize: '10.5px', fontWeight: 800, padding: '2px 10px', borderRadius: '10px' }}>
          الأكثر طلباً وانتشاراً
        </span>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#170e5e', textTransform: 'uppercase' }}>للشركات النامية والمتاجر المتوسطة</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e', margin: '4px 0 10px' }}>باقة النمو الاحترافية (Pro)</h3>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#170e5e' }}>{proPrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <CapacityPills users="5 مستخدمين" branches="3 فروع" isHighlighted />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155', marginBottom: '22px' }}>
            {PRO_ALL_FEATURES.map((feat, idx) => (
              <PlanFeatureItem key={idx}>{feat}</PlanFeatureItem>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onSelectPlan({ id: proPlanObj.id, name: 'الباقة الاحترافية (Pro)', price: proPrice, currency: activeCurrency })}
          style={{ width: '100%', backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '12.5px' }}
        >
          اختيار الباقة الاحترافية
        </Button>
      </div>

      {/* 3. Ultimate ERP Plan */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>منظومة ERP كاملة وتخصصات صناعية</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>المتكاملة (Ultimate ERP)</h3>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{enterprisePrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <CapacityPills users="15 مستخدماً" branches="10 فروع" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155', marginBottom: '22px' }}>
            {ULTIMATE_ALL_FEATURES.map((feat, idx) => (
              <PlanFeatureItem key={idx}>{feat}</PlanFeatureItem>
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => onSelectPlan({ id: enterprisePlanObj.id, name: 'الباقة المتكاملة (Ultimate ERP)', price: enterprisePrice, currency: activeCurrency })}
          style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
        >
          اختيار الباقة المتكاملة
        </Button>
      </div>

      {/* 4. Omnichannel Plan */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>التجارة الرقمية والقنوات الموحدة</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>الشاملة (Omnichannel)</h3>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{omnichannelPrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <CapacityPills users="مستخدمين غير محدودين" branches="فروع غير محدودة" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155', marginBottom: '22px' }}>
            {OMNICHANNEL_ALL_FEATURES.map((feat, idx) => (
              <PlanFeatureItem key={idx}>{feat}</PlanFeatureItem>
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => onSelectPlan({ id: omnichannelPlanObj.id, name: 'باقة التجارة الشاملة (Omnichannel)', price: omnichannelPrice, currency: activeCurrency })}
          style={{ width: '100%', fontWeight: 700, fontSize: '12.5px' }}
        >
          اختيار الباقة الشاملة
        </Button>
      </div>
    </div>
  );
}
