import { useAuthStore } from '@/stores/auth-store';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

export interface CustomerTypeOption {
  value: 'cash' | 'vip' | 'credit' | 'wholesale';
  label: string;
  badgeLabel: string;
  badgeStyle: {
    bg: string;
    color: string;
  };
}

export interface CustomerProfile {
  id: 'maritime' | 'contracting' | 'general';
  pageTitle: string;
  pageDescription: string;
  badgeUnit: string;
  addBtnText: string;
  modalAddTitle: string;
  modalAddSubtitle: string;
  modalEditSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  addressLabel: string;
  addressPlaceholder: string;
  typeLabel: string;
  types: CustomerTypeOption[];
  balanceLabel: string;
  balanceHint: string;
  creditLimitLabel: string;
  creditLimitHint: string;
  submitCreateText: string;
  submitEditText: string;
  showLoyalty: boolean;
  showMarketingCampaign: boolean;
}

export const MARITIME_CUSTOMER_PROFILE: CustomerProfile = {
  id: 'maritime',
  pageTitle: 'سجل العملاء والمستوردين / الشاحنين',
  pageDescription: 'إدارة حسابات الشاحنين، المستوردين والمصدرين، وتسهيلات وسقوف ائتمان النولون مع إمكانية التعديل السريع.',
  badgeUnit: 'جهة شحن / عميل',
  addBtnText: '+ إضافة شاحن / مستورد جديد',
  modalAddTitle: 'تسجيل عميل / شاحن أو مستورد جديد',
  modalAddSubtitle: 'تسجيل بيانات الشاحن أو المستورد، ممثل التنسيق، وتسهيلات ائتمان النولون البحري والجوي.',
  modalEditSubtitle: 'تحديث بيانات الشاحن أو المستورد، سقف التسهيلات الائتمانية والبيانات الرسمية.',
  nameLabel: 'اسم العميل / المستورد أو الشاحن *',
  namePlaceholder: 'مثال: شركة النيل للاستيراد والتصدير / م. أحمد سالم',
  phoneLabel: 'هاتف مسؤول الشحن والتنسيق',
  phonePlaceholder: 'مثال: 010xxxxxxxx أو +2010xxxxxxxx',
  addressLabel: 'العنوان والمقر الرئيسي / الميناء التابع',
  addressPlaceholder: 'المدينة، المنطقة الصناعية، أو بالقرب من ميناء...',
  typeLabel: 'نوع وتصنيف حساب الشحن',
  types: [
    { value: 'cash', label: 'مستورد / شاحن نقدي (سداد مسبق مع كل بوليصة)', badgeLabel: 'مستورد نقدي', badgeStyle: { bg: '#f1f5f9', color: '#475569' } },
    { value: 'vip', label: 'عميل استراتيجي VIP (أولوية حجز وتفريغ وخصومات نولون)', badgeLabel: 'VIP استراتيجي', badgeStyle: { bg: '#fef3c7', color: '#92400e' } },
    { value: 'credit', label: 'شاحن تعاقدي آجل (سحب بوالص على الحساب مع فترات سماح)', badgeLabel: 'تعاقدي آجل', badgeStyle: { bg: '#e0f2fe', color: '#0369a1' } },
    { value: 'wholesale', label: 'وكيل شحن / مجمع بضائع (Forwarder / Co-Loader)', badgeLabel: 'وكيل شحن / مجمع', badgeStyle: { bg: '#dcfce7', color: '#166534' } },
  ],
  balanceLabel: 'الرصيد الافتتاحي للنولون',
  balanceHint: 'المبلغ المستحق على الشاحن/المستورد في بداية التسجيل (إن وجد)',
  creditLimitLabel: 'سقف التسهيل الائتماني للنولون',
  creditLimitHint: 'أقصى سقف مالي مسموح به لشحن الحاويات والبوالص آجلاً (0 = نقدي فقط)',
  submitCreateText: 'حفظ وتسجيل الشاحن',
  submitEditText: 'حفظ تعديلات الشاحن',
  showLoyalty: false,
  showMarketingCampaign: true,
};

export const CONTRACTING_CUSTOMER_PROFILE: CustomerProfile = {
  id: 'contracting',
  pageTitle: 'سجل العملاء وجهات الإسناد',
  pageDescription: 'إدارة بيانات ملاك المشاريع، جهات الإسناد الحكومية والخاصة، والمطورين العقاريين وحدود مستخلصاتهم.',
  badgeUnit: 'جهة إسناد / مالك',
  addBtnText: '+ جهة إسناد / مالك جديد',
  modalAddTitle: 'تسجيل جهة إسناد أو مالك مشروع جديد',
  modalAddSubtitle: 'تسجيل بيانات المالك أو جهة التعاقد، ممثل المشروع، وتسهيلات المستخلصات.',
  modalEditSubtitle: 'تحديث بيانات جهة الإسناد وسقوف تمويل المستخلصات والمشاريع.',
  nameLabel: 'اسم جهة الإسناد / المالك *',
  namePlaceholder: 'مثال: هيئة المجتمعات العمرانية / شركة إعمار للتطوير',
  phoneLabel: 'هاتف ممثل المالك / إدارة المشاريع',
  phonePlaceholder: 'مثال: 010xxxxxxxx',
  addressLabel: 'المقر الإداري / عنوان الإدارة الهندسية',
  addressPlaceholder: 'المدينة، الحي، رقم المبنى...',
  typeLabel: 'تصنيف جهة الإسناد والتعاقد',
  types: [
    { value: 'cash', label: 'مالك مشروع / قطاع خاص (دفعات نقدية فورية مع المستخلص)', badgeLabel: 'قطاع خاص / مباشر', badgeStyle: { bg: '#f1f5f9', color: '#475569' } },
    { value: 'vip', label: 'مطور عقاري استراتيجي VIP (مشاريع كبرى وعقود حصرية)', badgeLabel: 'مطور استراتيجي VIP', badgeStyle: { bg: '#fef3c7', color: '#92400e' } },
    { value: 'credit', label: 'جهة إسناد حكومية / تعاقد آجل (مستخلصات حكومية مع فترة صرف)', badgeLabel: 'جهة حكومية / تعاقدي', badgeStyle: { bg: '#e0f2fe', color: '#0369a1' } },
    { value: 'wholesale', label: 'مقاول رئيسي (أعمال مقاولات باطن / كونسورتيوم)', badgeLabel: 'مقاول رئيسي / باطن', badgeStyle: { bg: '#dcfce7', color: '#166534' } },
  ],
  balanceLabel: 'الرصيد الافتتاحي للتعاقدات',
  balanceHint: 'المستحقات السابقة على جهة الإسناد إن وجدت قبل بدء التسجيل',
  creditLimitLabel: 'سقف التسهيل الائتماني والتمويل',
  creditLimitHint: 'الحد الأقصى لتمويل وتنفيذ مستخلصات المشروع دون تحصيل (0 = دفعات مسبقة)',
  submitCreateText: 'حفظ جهة الإسناد',
  submitEditText: 'حفظ بيانات جهة الإسناد',
  showLoyalty: false,
  showMarketingCampaign: false,
};

export const GENERAL_CUSTOMER_PROFILE: CustomerProfile = {
  id: 'general',
  pageTitle: 'العملاء',
  pageDescription: 'إدارة سجل العملاء، الأرصدة والحدود الائتمانية مع إمكانية البحث والإضافة السريعة.',
  badgeUnit: 'عميل',
  addBtnText: '+ عميل جديد',
  modalAddTitle: 'إضافة عميل جديد',
  modalAddSubtitle: 'تسجيل بيانات العميل وتفاصيل الحساب وحد الائتمان في النظام.',
  modalEditSubtitle: 'تحديث بيانات العميل أو ضبط الرصيد وحد الائتمان.',
  nameLabel: 'اسم العميل *',
  namePlaceholder: 'مثال: شركة الأمل / أحمد محمود',
  phoneLabel: 'رقم الهاتف',
  phonePlaceholder: 'مثال: 010xxxxxxxx',
  addressLabel: 'العنوان / المنطقة',
  addressPlaceholder: 'المدينة، الحي، اسم الشارع...',
  typeLabel: 'نوع وتصنيف العميل',
  types: [
    { value: 'cash', label: 'عميل عادي / تجزئة (افتراضي)', badgeLabel: 'عادي', badgeStyle: { bg: '#f1f5f9', color: '#475569' } },
    { value: 'vip', label: 'عميل مميز (VIP) - خصومات خاصة', badgeLabel: 'VIP مميز', badgeStyle: { bg: '#fef3c7', color: '#92400e' } },
    { value: 'credit', label: 'عميل آجل (سحب على الحساب)', badgeLabel: 'آجل', badgeStyle: { bg: '#e0f2fe', color: '#0369a1' } },
    { value: 'wholesale', label: 'عميل جملة (أسعار جملة)', badgeLabel: 'جملة', badgeStyle: { bg: '#dcfce7', color: '#166534' } },
  ],
  balanceLabel: 'الرصيد الافتتاحي',
  balanceHint: 'المبلغ المستحق على العميل عند بداية التسجيل (إن وجد)',
  creditLimitLabel: 'حد الائتمان',
  creditLimitHint: 'أقصى مبلغ مسموح بالسحب الآجل (0 = نقدي فقط)',
  submitCreateText: 'حفظ العميل',
  submitEditText: 'حفظ التعديل',
  showLoyalty: true,
  showMarketingCampaign: true,
};

export function getCustomerProfileByRaw(rawActivity: string, pathname: string): CustomerProfile {
  const normActivity = (rawActivity || '').toLowerCase();
  const normPath = (pathname || '').toLowerCase();

  const isMaritime =
    normPath.includes('/maritime') ||
    normPath.includes('/freight') ||
    normPath.includes('/shipping') ||
    normActivity === 'maritime_freight' ||
    normActivity === 'maritime' ||
    normActivity === 'freight' ||
    normActivity === 'shipping' ||
    normActivity === 'شحن';

  if (isMaritime) return MARITIME_CUSTOMER_PROFILE;

  const isContracting =
    normPath.includes('/contracting') ||
    normPath.includes('/construction') ||
    normActivity === 'contracting' ||
    normActivity === 'construction' ||
    normActivity === 'مقاولات';

  if (isContracting) return CONTRACTING_CUSTOMER_PROFILE;

  return GENERAL_CUSTOMER_PROFILE;
}

export function useCustomerProfile(): CustomerProfile {
  const tenant = useAuthStore((s) => s.tenant);
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  const rawActivity = String(
    tenant?.activityType || tenant?.pillar || settings?.activityType || settings?.businessIndustry || ''
  ).trim();

  let pathname = '';
  try {
    pathname = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
  } catch {
    pathname = '';
  }

  return getCustomerProfileByRaw(rawActivity, pathname);
}
