import { useState } from 'react';
import { CheckIcon, XIcon, ChevronDownIcon } from '@/shared/components/icons/AppIcons';

interface MatrixFeature {
  title: string;
  desc?: string;
  basic: boolean | string;
  pro: boolean | string;
  ultimate: boolean | string;
  omnichannel: boolean | string;
}

interface MatrixCategory {
  id: string;
  name: string;
  features: MatrixFeature[];
}

const FEATURE_CATEGORIES: MatrixCategory[] = [
  {
    id: 'pos',
    name: 'نقاط البيع والمبيعات السحابية (POS & Sales)',
    features: [
      { title: 'نقطة بيع كاشير سريعة بالباركود (POS Workspace)', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'محرك البيع بدون إنترنت (Offline-First POS) مع المزامنة الذكية', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'كتالوج الأصناف، التصنيفات، الباركود، وبطاقات المنتجات', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'دعم باركود الميزان المدمج فيه الوزن أو السعر (للأجبان واللحوم)', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'ورديات الكاشير، جلسات النقدية، وجرد الكاش الفعلي عند الإغلاق', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'عروض الوجبات المجمعة وحزم التوفير (Combo Packages)', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'طباعة الفواتير الحرارية (80mm / 57mm) وإيصالات A4 مع باركود QR', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'طرق الدفع المتعددة (نقدي، فيزا، آجل، محافظ، وتجزئة الفاتورة)', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'مرتجع المبيعات الجزئي والكامل وإلغاء الفواتير بصلاحيات المدير', basic: true, pro: true, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'purchases',
    name: 'المشتريات وإدارة الموردين (Purchases & Vendors)',
    features: [
      { title: 'فواتير المشتريات وتسجيل تكاليف البضاعة الواردة', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'أوامر الشراء وعروض الأسعار وإعادة تموين النواقص', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'مرتجع المشتريات وتسوية مستحقات الموردين', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'سجل وحسابات الموردين وكشف الحساب التفصيلي وسندات الصرف', basic: false, pro: true, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'inventory',
    name: 'المخازن والمستودعات والرقابة (Inventory & Warehousing)',
    features: [
      { title: 'إدارة المستودعات والمخازن المتعددة', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'التحويلات المخزنية المباشرة بين الفروع والمستودعات', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'أذون الإضافة والصرف المخزني اليدوية والآلية', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'محاضر الجرد الدوري وتسوية العجز والزيادة', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'تنبيهات نواقص الرف والحد الأدنى للطلب وإعادة الشراء', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'تتبع حركات الأصناف وكارت الصنف التفصيلي', basic: false, pro: true, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'reports',
    name: 'لوحة التحكم والتقارير التنفيذية (BI & Analytics)',
    features: [
      { title: 'لوحة التحكم اليومية (Executive Dashboard) ومؤشرات الأداء المباشرة', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'تقارير أرباح وخسائر المبيعات التفصيلية وصافي الدخل', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'تقارير الخزينة والمصروفات النثرية وحركة النقدية', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'تقارير حركة المخزون وتقييم البضاعة وتكلفة المخزون الراكد', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'سجل نشاط النظام (Audit Log) والرقابة الأمنية', basic: false, pro: true, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'services_crm',
    name: 'الخدمات والعملاء (Services & Customer Accounts)',
    features: [
      { title: 'موديول الخدمات والمصنعيات وحساب عمولات الفنيين', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'سجل العملاء ومتابعة ديون العملاء وكشوف الحساب وسندات القبض', basic: false, pro: true, ultimate: true, omnichannel: true },
      { title: 'عروض الأسعار الرسمية وأوامر البيع للشركات', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'قوائم الأسعار المتعددة وتخصيص أسعار العملاء والجملة', basic: false, pro: false, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'accounting',
    name: 'المحاسبة والمالية والمؤسسات (Accounting & Finance)',
    features: [
      { title: 'دليل وشجرة الحسابات الشجرية المعتمدة (COA)', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'القيود اليومية التلقائية وميزان المراجعة والأستاذ العام', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'مراكز التكلفة والمشاريع وتوزيع الإيرادات والمصروفات', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'سجل وإهلاك الأصول الثابتة والمعدات وتوليد قيود الإهلاك آلياً', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'مبيعات وجدولة التقسيط وإدارة الديون والفوائد وتنبيهات التحصيل', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'الإقرار الضريبي والفاتورة الإلكترونية المعتمدة (ETA / ZATCA)', basic: false, pro: false, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'industry_verticals',
    name: 'القطاعات الصناعية والتخصصية (Specialized Industry Modules)',
    features: [
      { title: 'المطاعم والكافيهات: شاشات أوامر المطبخ (KDS) وإدارة الطاولات وصالة/تيك أواي', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'بوابة الشاشات الرقمية (`/displays`): شاشات إعلانات وانتظار العملاء', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'الصيدليات والمستلزمات: تتبع الصلاحيات والتشغيلات (FEFO) والروشتات والمواد الفعالة', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'الملابس والأزياء: مصفوفة الألوان والمقاسات (Variants) وطباعة الباركود الفرعي', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'صيانة الإلكترونيات والأجهزة: تتبع السيريال IMEI، كروت الصيانة، الضمان، و Trade-in', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'التصنيع والإنتاج: شجرة المنتج (BOM)، استهلاك الخامات، وحساب تكاليف الإنتاج', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'الاستيراد والشحن الدولي: تتبع الحاويات، مسير الشحن، وتوزيع أرباح وحصص الشركاء', basic: false, pro: false, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'hr_logistics',
    name: 'الموارد البشرية واللوجستيات (HR & Logistics)',
    features: [
      { title: 'الموارد البشرية (HR): مسير الرواتب الآلي، الحضور والانصراف، والسلف والإجازات', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'مخالصات نهاية الخدمة وإخلاء الطرف والعهد العينية', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'أسطول التوصيل ومناديب البيع الخارجي وتطبيق السائق (PWA)', basic: false, pro: false, ultimate: true, omnichannel: true },
      { title: 'تصفية العهد النقدية للمناديب وتتبع تسليم الشحنات والطلبات', basic: false, pro: false, ultimate: true, omnichannel: true },
    ],
  },
  {
    id: 'storefront',
    name: 'المتجر الإلكتروني وبوابات الدفع (E-Commerce & Gateways)',
    features: [
      { title: 'متجر إلكتروني سحابي متكامل متزامن لحظياً مع المخزن والفروع', basic: false, pro: false, ultimate: false, omnichannel: true },
      { title: 'بوابات الدفع الخليجية: مدى السعودية، كي نت الكويتية، بنفت البحرينية (Tap)', basic: false, pro: false, ultimate: false, omnichannel: true },
      { title: 'بوابات الدفع العالمية: Stripe مع دعم Apple Pay و Google Pay والبطاقات الدولية', basic: false, pro: false, ultimate: false, omnichannel: true },
      { title: 'بوابات الدفع المصرية: بطاقات الفيزا والماستركارد والمحافظ الإلكترونية (Paymob & XPay)', basic: false, pro: false, ultimate: false, omnichannel: true },
      { title: 'تطبيق المتجر للعملاء PWA وتتبع مراحل الطلب الحية «طلباتي»', basic: false, pro: false, ultimate: false, omnichannel: true },
      { title: 'تسعير التوصيل الذكي للمحافظات والشحن المجاني التلقائي بالسلة', basic: false, pro: false, ultimate: false, omnichannel: true },
      { title: 'كوبونات الخصم، العروض الترويجية، والتكامل المباشر مع رسائل الواتساب', basic: false, pro: false, ultimate: false, omnichannel: true },
    ],
  },
  {
    id: 'limits',
    name: 'سعة الترخيص والبنية التحتية (Limits & Infrastructure)',
    features: [
      { title: 'عدد الفروع المسموحة', basic: 'فرع واحد', pro: 'حتى 3 فروع', ultimate: 'حتى 10 فروع', omnichannel: 'غير محدود' },
      { title: 'عدد المستخدمين المتزامنين مع الصلاحيات', basic: 'مستخدم واحد', pro: '5 مستخدمين', ultimate: '15 مستخدماً', omnichannel: 'غير محدود' },
      { title: 'نسخ احتياطي سحابي ومحلي آلي', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'العمل عبر الشبكة المحلية (LAN) والسحابية', basic: true, pro: true, ultimate: true, omnichannel: true },
      { title: 'تحديثات نظام دورية ودعم فني مخصص', basic: true, pro: true, ultimate: true, omnichannel: true },
    ],
  },
];

export function DetailedPlanFeaturesMatrix() {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const renderCell = (val: boolean | string) => {
    if (typeof val === 'string') {
      return (
        <span style={{ fontSize: '11px', fontWeight: 800, background: '#f1f5f9', color: '#1e293b', padding: '2px 8px', borderRadius: '6px' }}>
          {val}
        </span>
      );
    }
    if (val === true) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#15803d' }}>
          <CheckIcon size={13} strokeWidth={3} />
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#f8fafc', color: '#94a3b8' }}>
        <XIcon size={12} strokeWidth={2.5} />
      </span>
    );
  };

  return (
    <div style={{ marginTop: '32px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            مقارنة الميزات والأنظمة بالتفصيل
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
            جدول تفصيلي شامل يوضح كافة القدرات والأنظمة الفرعية المتاحة في كل باقة لمساعدتك في اختيار الباقة الأنسب لنمو نشاطك.
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
          <thead>
            <tr style={{ background: '#ffffff', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 800, color: '#0f172a', textAlign: 'start', width: '40%' }}>
                الأنظمة والموديولات التفصيلية
              </th>
              <th style={{ padding: '14px 12px', fontSize: '12.5px', fontWeight: 800, color: '#334155', textAlign: 'center', width: '15%' }}>
                الأساسية (Starter)
              </th>
              <th style={{ padding: '14px 12px', fontSize: '12.5px', fontWeight: 800, color: '#170e5e', textAlign: 'center', width: '15%', background: '#f8faff' }}>
                النمو (Pro)
              </th>
              <th style={{ padding: '14px 12px', fontSize: '12.5px', fontWeight: 800, color: '#334155', textAlign: 'center', width: '15%' }}>
                المتكاملة (Ultimate)
              </th>
              <th style={{ padding: '14px 12px', fontSize: '12.5px', fontWeight: 800, color: '#334155', textAlign: 'center', width: '15%' }}>
                الشاملة (Omnichannel)
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_CATEGORIES.map((cat) => {
              const isCollapsed = collapsedCategories[cat.id];
              return (
                <div key={cat.id} style={{ display: 'contents' }}>
                  {/* Category Header Row */}
                  <tr
                    onClick={() => toggleCategory(cat.id)}
                    style={{ background: '#f1f5f9', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', userSelect: 'none' }}
                  >
                    <td
                      colSpan={5}
                      style={{ padding: '10px 20px', fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{cat.name}</span>
                        <span style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'flex', alignItems: 'center' }}>
                          <ChevronDownIcon size={16} />
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Category Features Rows */}
                  {!isCollapsed &&
                    cat.features.map((feat, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '11px 20px', fontSize: '12.5px', color: '#1e293b', fontWeight: 500 }}>
                          {feat.title}
                        </td>
                        <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                          {renderCell(feat.basic)}
                        </td>
                        <td style={{ padding: '11px 12px', textAlign: 'center', background: '#f8faff' }}>
                          {renderCell(feat.pro)}
                        </td>
                        <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                          {renderCell(feat.ultimate)}
                        </td>
                        <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                          {renderCell(feat.omnichannel)}
                        </td>
                      </tr>
                    ))}
                </div>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
