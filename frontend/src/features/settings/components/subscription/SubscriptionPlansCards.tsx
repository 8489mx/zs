import { Button } from '@/shared/ui/button';
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
      {/* 1. Basic Plan */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>بداية الأعمال والمتاجر الفردية</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 12px' }}>الباقة الأساسية (Basic)</h3>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{basicPrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155', marginBottom: '20px' }}>
            <PlanFeatureItem>نقطة بيع كاشير سريعة (POS)</PlanFeatureItem>
            <PlanFeatureItem>إدارة المخزون والمنتجات والباركود</PlanFeatureItem>
            <PlanFeatureItem>فواتير المبيعات والمشتريات والعملاء</PlanFeatureItem>
            <PlanFeatureItem>فرع واحد ومستخدم واحد رئيسي</PlanFeatureItem>
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
      <div style={{ background: '#ffffff', border: '2px solid #170e5e', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 4px 12px rgba(23, 14, 94, 0.08)' }}>
        <span style={{ position: 'absolute', top: '-11px', right: '16px', background: '#170e5e', color: '#ffffff', fontSize: '10.5px', fontWeight: 800, padding: '2px 10px', borderRadius: '10px' }}>
          الأكثر طلباً وانتشاراً
        </span>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#170e5e', textTransform: 'uppercase' }}>للشركات النامية والمتوسطة</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e', margin: '4px 0 12px' }}>الباقة الاحترافية (Pro)</h3>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#170e5e' }}>{proPrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155', marginBottom: '20px' }}>
            <PlanFeatureItem>كل مزايا الباقة الأساسية بالكامل</PlanFeatureItem>
            <PlanFeatureItem>حتى 3 فروع و 5 مستخدمين بصلاحيات</PlanFeatureItem>
            <PlanFeatureItem>المحاسبة المتقدمة والقيود ودليل الحسابات</PlanFeatureItem>
            <PlanFeatureItem>إدارة العملاء والديون والتقسيط</PlanFeatureItem>
            <PlanFeatureItem>تطبيق مناديب التوصيل وطباعة البلوتوث</PlanFeatureItem>
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
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>منظومة ERP كاملة للمؤسسات</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 12px' }}>المتكاملة (Ultimate ERP)</h3>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{enterprisePrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155', marginBottom: '20px' }}>
            <PlanFeatureItem>كل مزايا Pro للمؤسسات المتوسعة</PlanFeatureItem>
            <PlanFeatureItem>حتى 10 فروع و 15 مستخدم متزامن</PlanFeatureItem>
            <PlanFeatureItem>موديول التصنيع وخطوط الإنتاج (BOM)</PlanFeatureItem>
            <PlanFeatureItem>موديول الموارد البشرية والرواتب والبصمة</PlanFeatureItem>
            <PlanFeatureItem>الفاتورة الإلكترونية والربط الضريبي ETA</PlanFeatureItem>
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
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>تجارة متعددة القنوات وسحابية</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 12px' }}>الشاملة (Omnichannel)</h3>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{omnichannelPrice.toLocaleString('ar-EG')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginInlineStart: '4px' }}>{unit} / {isAnnual ? 'سنة' : 'شهر'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155', marginBottom: '20px' }}>
            <PlanFeatureItem>كل مزايا النظام بلا استثناء</PlanFeatureItem>
            <PlanFeatureItem>فروع ومستخدمين غير محدودين</PlanFeatureItem>
            <PlanFeatureItem>متجر إلكتروني سحابي متزامن مع المخزن</PlanFeatureItem>
            <PlanFeatureItem>شاشات مطبخ KDS وإعلانات رقمية Signage</PlanFeatureItem>
            <PlanFeatureItem>دعم فني مخصص ونسخ احتياطي فوري</PlanFeatureItem>
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
