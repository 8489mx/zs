export type IndustryPresetId =
  | 'retail'
  | 'wholesale'
  | 'contracting'
  | 'maritime'
  | 'restaurant'
  | 'fashion'
  | 'electronics'
  | 'pharmacy'
  | 'manufacturing'
  | 'services'
  | 'ecommerce'
  | 'custom';

export type PlanTierKey = 'plan_basic' | 'plan_pro' | 'plan_ultimate' | 'plan_omnichannel';

export interface PlanTierInfo {
  id: PlanTierKey;
  name: string;
  badgeBg: string;
  badgeColor: string;
  priceLabel: string;
  summary: string;
}

export const PLAN_TIERS: Record<PlanTierKey, PlanTierInfo> = {
  plan_basic: {
    id: 'plan_basic',
    name: 'الباقة الأساسية',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    priceLabel: '3,500 ج.م / سنوياً',
    summary: 'نقاط البيع السريعة، الورديات، كتالوج المنتجات، والخزينة الأساسية.',
  },
  plan_pro: {
    id: 'plan_pro',
    name: 'باقة النمو (الاحترافية)',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    priceLabel: '7,500 ج.م / سنوياً',
    summary: 'تشمل الأساسية بالإضافة لإدارة المشتريات، الموردين، والمخزون المتقدم والجرد والتقارير.',
  },
  plan_ultimate: {
    id: 'plan_ultimate',
    name: 'الباقة المتكاملة (Ultimate ERP)',
    badgeBg: '#f5f3ff',
    badgeColor: '#6d28d9',
    priceLabel: '15,000 ج.م / سنوياً',
    summary: 'كافة الميزات المتخصصة: الحسابات العامة، الأصول، الصيانة، الصيدليات، المطاعم، التصنيع، والتقسيط.',
  },
  plan_omnichannel: {
    id: 'plan_omnichannel',
    name: 'باقة التجارة الشاملة (Omnichannel)',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    priceLabel: '24,000 ج.م / سنوياً',
    summary: 'المنظومة الكاملة مع المتجر الإلكتروني السحابي، بوابات الدفع الرقمية وشركات الشحن المعتمدة.',
  },
};

export interface ModuleDefinition {
  key: string;
  title: string;
  category: 'pos' | 'inventory' | 'specialized' | 'logistics' | 'finance';
  categoryLabel: string;
  shortDesc: string;
  requiredPlan: PlanTierKey;
  dependencies?: string[];
  defaultPosMode?: 'scanner' | 'touch';
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  // 1. المبيعات ونقاط البيع
  {
    key: 'posModuleEnabled',
    title: 'نقاط البيع السريعة والكاشير (POS)',
    category: 'pos',
    categoryLabel: 'المبيعات ونقاط الخدمة',
    shortDesc: 'شاشات البيع المباشر، مسح الباركود السريع، إغلاق الورديات، وطباعة الفواتير والإيصالات.',
    requiredPlan: 'plan_basic',
  },
  {
    key: 'weightedBarcodeEnabled',
    title: 'فك وتشفير باركود الموازين الإلكترونية',
    category: 'pos',
    categoryLabel: 'المبيعات ونقاط الخدمة',
    shortDesc: 'قراءة باركود الوزن من موازين السوبرماركت واستخراج الوزن والسعر لحظياً.',
    requiredPlan: 'plan_basic',
    dependencies: ['posModuleEnabled'],
  },
  {
    key: 'comboModuleEnabled',
    title: 'العروض المجمعة والوجبات (Combo)',
    category: 'pos',
    categoryLabel: 'المبيعات ونقاط الخدمة',
    shortDesc: 'تعريف باقات تضم عدة أصناف بسعر موحد مع خصم مكوناتها من المخزون.',
    requiredPlan: 'plan_pro',
  },
  {
    key: 'posShowCartMeta',
    title: 'تحديد الطاولة والعميل بالسلة',
    category: 'pos',
    categoryLabel: 'المبيعات ونقاط الخدمة',
    shortDesc: 'إظهار حقول العميل ورقم الطاولة أعلى السلة مباشرة لتسريع الخدمة والفوترة.',
    requiredPlan: 'plan_ultimate',
    dependencies: ['posModuleEnabled'],
  },
  {
    key: 'restaurantModuleEnabled',
    title: 'المطاعم والكافيهات وشاشات المطبخ (KDS)',
    category: 'pos',
    categoryLabel: 'المبيعات ونقاط الخدمة',
    shortDesc: 'إدارة الطاولات، صالة وتيك أواي، شاشات أوامر المطبخ، وتوزيع الطلبات.',
    requiredPlan: 'plan_ultimate',
    dependencies: ['posModuleEnabled'],
    defaultPosMode: 'touch',
  },

  // 2. المخزون وسلاسل الإمداد
  {
    key: 'purchasesModuleEnabled',
    title: 'المشتريات وإدارة الموردين',
    category: 'inventory',
    categoryLabel: 'المخزون وسلاسل الإمداد',
    shortDesc: 'فواتير الشراء، مرتجع المشتريات، سجل وحسابات الموردين، وسندات الصرف.',
    requiredPlan: 'plan_pro',
  },
  {
    key: 'inventoryModuleEnabled',
    title: 'المخازن والمستودعات المتقدمة',
    category: 'inventory',
    categoryLabel: 'المخزون وسلاسل الإمداد',
    shortDesc: 'التحويلات بين المخازن، أذون الإضافة والصرف، جرد المستودعات، وتتبع حركات الأصناف.',
    requiredPlan: 'plan_pro',
  },
  {
    key: 'clothingModuleEnabled',
    title: 'مصفوفة الألوان والمقاسات (الملابس والأحذية)',
    category: 'inventory',
    categoryLabel: 'المخزون وسلاسل الإمداد',
    shortDesc: 'إدارة موديلات الملابس بالمقاسات والألوان وطباعة ملصقات الباركود التفصيلية.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'enablePharmacyModule',
    title: 'أرقام التشغيلات وتواريخ الصلاحية (FEFO)',
    category: 'inventory',
    categoryLabel: 'المخزون وسلاسل الإمداد',
    shortDesc: 'تتبع الباتشات وتواريخ الانتهاء والصرف الأسبق صلاحية ومنع بيع المنتهي نهائياً.',
    requiredPlan: 'plan_ultimate',
  },

  // 3. الخدمات والتخصصات التشغيلية
  {
    key: 'servicesModuleEnabled',
    title: 'خدمات الصيانة والمصنعيات السريعة',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'إصدار فواتير الخدمات السريعة والمصنعيات وحساب عمولات الفنيين.',
    requiredPlan: 'plan_pro',
  },
  {
    key: 'enableMobileStoreFeatures',
    title: 'إدارة الصيانة وتتبع السيريال (IMEI)',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'استلام الأجهزة، كروت الصيانة، الضمان، تتبع أرقام السيريال، واستبدال المستعمل.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'manufacturingModuleEnabled',
    title: 'التصنيع وقوائم المواد (BOM)',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'تحديد شجرة المنتج، استهلاك المواد الخام، وحساب تكاليف الإنتاج وأوامر التشغيل.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'importModuleEnabled',
    title: 'الاستيراد والشحن الدولي والحاويات',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'تتبع الشحنات البحرية والجوية، توزيع تكاليف الاستيراد، وحصص الشركاء.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'maritimeFreightModuleEnabled',
    title: 'الشحن البحري واللوجستيات والموانئ',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'أتمتة طلبات تسعير الخطوط الملاحية (RFQ)، مقارنة عروض الأسعار، إدارة الحاويات وفترة السماح، والتتبع المباشر.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'contractingModuleEnabled',
    title: 'المقاولات وإدارة المشاريع الإنشائية',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'إدارة مشاريع المقاولات، جداول الكميات (BOQ/SOV)، الأوامر التغييرية، مستخلصات الدفع (AIA G702/G703)، ومقاولي الباطن واليوميات.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'hrModuleEnabled',
    title: 'الموارد البشرية والرواتب (HR)',
    category: 'specialized',
    categoryLabel: 'الخدمات والتخصصات التشغيلية',
    shortDesc: 'مسير الرواتب، تسجيل الحضور والانصراف، السلف، الإجازات، وملفات الموظفين.',
    requiredPlan: 'plan_ultimate',
  },

  // 4. اللوجستيات والتجارة الرقمية
  {
    key: 'deliveryFleetModuleEnabled',
    title: 'أسطول التوصيل ومناديب الدليفري',
    category: 'logistics',
    categoryLabel: 'العمليات والتوصيل',
    shortDesc: 'تسليم الفواتير للمناديب، تصفية العهد النقدية، وبوابة السائق وتطبيق PWA.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'storefrontModuleEnabled',
    title: 'المتجر الإلكتروني السحابي وبوابات الدفع',
    category: 'logistics',
    categoryLabel: 'التجارة الرقمية والقنوات السحابية',
    shortDesc: 'كتالوج بيع أونلاين لزبائنك مع بوابات الدفع الإلكتروني وربط شركات الشحن.',
    requiredPlan: 'plan_omnichannel',
  },

  // 5. المحاسبة والمالية والمؤسسات
  {
    key: 'enableEnterpriseFeatures',
    title: 'المحاسبة المتقدمة وشجرة الحسابات والقيود',
    category: 'finance',
    categoryLabel: 'المالية والمؤسسات',
    shortDesc: 'دليل الحسابات الشجري، ميزان المراجعة، الأستاذ العام، وقائمة الدخل والأرباح.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'installmentsModuleEnabled',
    title: 'مبيعات وجدولة التقسيط وإدارة الديون',
    category: 'finance',
    categoryLabel: 'المالية والمؤسسات',
    shortDesc: 'جدولة أقساط العملاء، الفوائد، غرامات التأخير، وتنبيهات التحصيل الدورية.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'taxDeclarationModuleEnabled',
    title: 'الإقرار الضريبي والفاتورة الإلكترونية',
    category: 'finance',
    categoryLabel: 'المالية والمؤسسات',
    shortDesc: 'إقرار ضريبة القيمة المضافة ونماذج الضرائب المعتمدة وربط ETA و ZATCA.',
    requiredPlan: 'plan_ultimate',
  },
  {
    key: 'fixedAssetsModuleEnabled',
    title: 'سجل وإهلاك الأصول الثابتة',
    category: 'finance',
    categoryLabel: 'المالية والمؤسسات',
    shortDesc: 'حصر أصول المنشأة ومعداتها، حساب مجمع الإهلاك وتوليد قيود الإهلاك آلياً.',
    requiredPlan: 'plan_ultimate',
  },
];

export interface IndustryPreset {
  id: IndustryPresetId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  recommendedModules: string[];
  disabledModules: string[];
  recommendedPlan: PlanTierKey;
  defaultPosMode?: 'scanner' | 'touch';
  defaultProductKind?: 'standard' | 'fashion';
  maintenanceProfile?: string;
  highlights: string[];
}

export const INDUSTRY_PRESETS: Record<IndustryPresetId, IndustryPreset> = {
  retail: {
    id: 'retail',
    name: 'تجارة التجزئة والسوبرماركت',
    subtitle: 'محلات التجزئة، السوبرماركت، والميني ماركت',
    description: 'إعداد مخصص للبيع السريع، مسح الباركود، موازين الأجبان واللحوم، وتنبيهات النواقص الفورية.',
    badge: 'الأكثر انتشاراً',
    recommendedModules: [
      'posModuleEnabled',
      'purchasesModuleEnabled',
      'inventoryModuleEnabled',
      'weightedBarcodeEnabled',
      'comboModuleEnabled',
    ],
    disabledModules: [
      'manufacturingModuleEnabled',
      'importModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'restaurantModuleEnabled',
      'enableEnterpriseFeatures',
      'fixedAssetsModuleEnabled',
      'installmentsModuleEnabled',
      'deliveryFleetModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_pro',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['نقاط البيع السريعة والباركود', 'فواتير المشتريات وتكلفة البضاعة', 'جرد المخازن والأرصدة ونواقص الرف'],
  },

  wholesale: {
    id: 'wholesale',
    name: 'مبيعات الجملة والتوزيع',
    subtitle: 'تجار الجملة، الوكلاء والموزعون',
    description: 'يركز على حسابات العملاء، الفواتير الآجلة، حدود الائتمان، المشتريات، وأسطول مناديب البيع.',
    badge: 'تجاري مؤسسي',
    recommendedModules: [
      'posModuleEnabled',
      'purchasesModuleEnabled',
      'inventoryModuleEnabled',
      'deliveryFleetModuleEnabled',
      'installmentsModuleEnabled',
      'taxDeclarationModuleEnabled',
      'enableEnterpriseFeatures',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['فواتير المشتريات وموردي الجملة', 'المخازن والتحويلات الداخلية', 'الآجل والتقسيط ومناديب التوزيع'],
  },

  contracting: {
    id: 'contracting',
    name: 'شركات المقاولات والإنشاءات والتطوير',
    subtitle: 'شركات المقاولات العامة، البنية التحتية، والمكاتب الهندسية',
    description: 'إدارة متخصصة للمشاريع، جداول الكميات (BOQ)، مستخلصات المالك والاستشاري (IPC)، مقاولي الباطن، والرقابة على التكاليف.',
    badge: 'مقاولات وهندسة',
    recommendedModules: [
      'contractingModuleEnabled',
      'purchasesModuleEnabled',
      'inventoryModuleEnabled',
      'enableEnterpriseFeatures',
      'hrModuleEnabled',
      'fixedAssetsModuleEnabled',
      'taxDeclarationModuleEnabled',
      'installmentsModuleEnabled',
    ],
    disabledModules: [
      'posModuleEnabled',
      'weightedBarcodeEnabled',
      'comboModuleEnabled',
      'posShowCartMeta',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'maritimeFreightModuleEnabled',
      'storefrontModuleEnabled',
      'deliveryFleetModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['إدارة المشاريع وعقود الإسناد والمقايسات BOQ', 'المستخلصات وشهادات الدفع AIA G702 والترحيل المحاسبي', 'مقاولو الباطن وأذون خامات التشوينات بالموقع'],
  },

  maritime: {
    id: 'maritime',
    name: 'شركات الشحن والتوكيلات البحرية واللوجستيات',
    subtitle: 'الوكلاء الملاحيون، وسطاء الشحن، والتخليص الجمركي',
    description: 'إدارة أوامر التشغيل، بوالص الشحن (B/L)، فترات سماح الحاويات وغرامات التأخير (Demurrage)، ومصفوفة مقارنة عروض الخطوط الملاحية.',
    badge: 'شحن ولوجستيات',
    recommendedModules: [
      'maritimeFreightModuleEnabled',
      'purchasesModuleEnabled',
      'enableEnterpriseFeatures',
      'hrModuleEnabled',
      'taxDeclarationModuleEnabled',
    ],
    disabledModules: [
      'posModuleEnabled',
      'contractingModuleEnabled',
      'weightedBarcodeEnabled',
      'comboModuleEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'storefrontModuleEnabled',
      'deliveryFleetModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['أوامر التشغيل وتتبع الرحلات والحاويات', 'فترات السماح وغرامات الأرضيات والدموراج Demurrage', 'مصفوفة مقارنة عروض الخطوط الملاحية والربحية'],
  },

  restaurant: {
    id: 'restaurant',
    name: 'المطاعم والكافيهات والأغذية',
    subtitle: 'مطاعم، كافيهات، حلويات ومخابز',
    description: 'واجهة تاتش مريحة، إدارة الطاولات، شاشات المطبخ الذكية (KDS)، وطلبات الدليفري والتيك أواي.',
    badge: 'خدمة سريعة وضيافة',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
      'restaurantModuleEnabled',
      'posShowCartMeta',
      'comboModuleEnabled',
      'deliveryFleetModuleEnabled',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'importModuleEnabled',
      'installmentsModuleEnabled',
      'fixedAssetsModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'touch',
    defaultProductKind: 'standard',
    highlights: ['شاشات المطبخ الذكية KDS والطاولات', 'مشتريات خامات ومكونات الأغذية', 'مخازن الأغذية والوجبات الكومبو'],
  },

  fashion: {
    id: 'fashion',
    name: 'الملابس والأزياء والأحذية',
    subtitle: 'محلات الملابس، الأحذية، والشنط',
    description: 'تفعيل كامل لمصفوفة الألوان والمقاسات (Variants)، طباعة باركود الأصناف الفرعية، وتتبع الموديلات.',
    badge: 'مصفوفة المقاسات',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
      'clothingModuleEnabled',
      'deliveryFleetModuleEnabled',
      'comboModuleEnabled',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'manufacturingModuleEnabled',
      'importModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'fashion',
    highlights: ['مصفوفة الألوان والمقاسات المتعددة', 'مشتريات الموديلات والكولكشن الجديد', 'مخازن الملابس وطباعة الليبل الفرعي'],
  },

  electronics: {
    id: 'electronics',
    name: 'الإلكترونيات والموبايل والصيانة',
    subtitle: 'متاجر الهواتف، الأجهزة، ومراكز الصيانة',
    description: 'كروت الصيانة وأوامر الشغل، تسجيل أرقام السيريال IMEI، فحص الضمان، وتقييم المستعمل (Trade-in).',
    badge: 'صيانة وسيريال',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
      'enableMobileStoreFeatures',
      'servicesModuleEnabled',
      'installmentsModuleEnabled',
      'taxDeclarationModuleEnabled',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    maintenanceProfile: 'mobile',
    highlights: ['تتبع أرقام السيريال IMEI وكروت الصيانة', 'مشتريات الأجهزة وقطع الغيار', 'مخازن الصيانة والأجهزة ومبيعات التقسيط'],
  },

  pharmacy: {
    id: 'pharmacy',
    name: 'الصيدليات والمستلزمات الطبية',
    subtitle: 'صيدليات، مخازن أدوية، ومستلزمات علاجية',
    description: 'تتبع التشغيلات (Batches)، تواريخ الصلاحية، وصرف الأسبق انتهاءً (FEFO) مع منع بيع المنتهي.',
    badge: 'رقابة FEFO الطبية',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
      'enablePharmacyModule',
      'deliveryFleetModuleEnabled',
      'taxDeclarationModuleEnabled',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'importModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['أرقام التشغيلات وصرف الأسبق صلاحية FEFO', 'مشتريات شركات الأدوية والخصومات', 'مخازن الأدوية والمستلزمات والروشتات'],
  },

  manufacturing: {
    id: 'manufacturing',
    name: 'التصنيع الخفيف، المعامل والورش',
    subtitle: 'مصانع صغيرة، ورش إنتاج، ومعامل تجميع',
    description: 'قوائم المكونات (BOM)، استهلاك الخامات، تحويل المواد الخام إلى منتجات تامة، وتكلفة التشغيل.',
    badge: 'إنتاج وتكاليف',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
      'manufacturingModuleEnabled',
      'importModuleEnabled',
      'enableEnterpriseFeatures',
      'fixedAssetsModuleEnabled',
      'taxDeclarationModuleEnabled',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'clothingModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_ultimate',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['شجرة المنتج وتكلفة المكونات BOM', 'مشتريات المواد الخام ومستلزمات الإنتاج', 'مخازن الخامات ومخازن المنتج التام'],
  },

  services: {
    id: 'services',
    name: 'الشركات الخدمية والمكاتب الاستشارية',
    subtitle: 'مكاتب خدمات، دراسات جدوى، واستشارات مهنية',
    description: 'إصدار فواتير الخدمات والمصنعيات بدون تعقيدات مخزون بضائع، مع إدارة الحسابات العامة.',
    badge: 'خدمات بلا مخزون',
    recommendedModules: [
      'servicesModuleEnabled',
      'purchasesModuleEnabled',
      'enableEnterpriseFeatures',
      'taxDeclarationModuleEnabled',
      'fixedAssetsModuleEnabled',
      'installmentsModuleEnabled',
    ],
    disabledModules: [
      'inventoryModuleEnabled',
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'clothingModuleEnabled',
      'manufacturingModuleEnabled',
      'deliveryFleetModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_pro',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['فواتير الخدمات والمصنعيات والعقود', 'مشتريات مستلزمات التشغيل والخدمات', 'الحسابات العامة وشجرة الحسابات والتقسيط'],
  },

  ecommerce: {
    id: 'ecommerce',
    name: 'المتاجر الرقمية والبيع أونلاين',
    subtitle: 'براندات أونلاين، متاجر سحابية ومبيعات رقمية',
    description: 'كتالوج إلكتروني كامل مربوط ببوابات الدفع (Tap / Stripe / Paymob) وشركات الشحن (بوسطة، أرامكس، سمسا).',
    badge: 'تجارة إلكترونية سحابية',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
      'storefrontModuleEnabled',
      'deliveryFleetModuleEnabled',
      'taxDeclarationModuleEnabled',
      'comboModuleEnabled',
    ],
    disabledModules: [
      'weightedBarcodeEnabled',
      'restaurantModuleEnabled',
      'enablePharmacyModule',
      'enableMobileStoreFeatures',
      'manufacturingModuleEnabled',
      'contractingModuleEnabled',
      'maritimeFreightModuleEnabled',
    ],
    recommendedPlan: 'plan_omnichannel',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['المتجر الإلكتروني السحابي وبوابات الدفع', 'مشتريات وتوريد منتجات المتجر أونلاين', 'مخازن البضاعة وبوالص الشحن والمناديب'],
  },

  custom: {
    id: 'custom',
    name: 'تخصيص يدوي مخصص',
    subtitle: 'تحديد الموديولات يدوياً بنداً ببند',
    description: 'اختر وفصّل ما تحتاجه فقط من قائمة الموديولات بدون أي قوالب مسبقة.',
    badge: 'حر ومرن',
    recommendedModules: [
      'posModuleEnabled',
      'inventoryModuleEnabled',
      'purchasesModuleEnabled',
    ],
    disabledModules: [],
    recommendedPlan: 'plan_basic',
    defaultPosMode: 'scanner',
    defaultProductKind: 'standard',
    highlights: ['تحكم كامل بكافة مفاتيح الموديولات', 'مطابقة تلقائية للباقة الأنسب لاختياراتك', 'تحديث القوائم والشاشات فورياً'],
  },
};

/**
 * دالة ذكية لفحص الاعتماديات التلقائية
 */
export function resolveModuleDependencies(selectedKeys: string[]): {
  resolvedKeys: string[];
  autoActivated: string[];
} {
  const currentSet = new Set(selectedKeys);
  const autoActivated: string[] = [];

  let changed = true;
  while (changed) {
    changed = false;
    for (const mod of SYSTEM_MODULES) {
      if (currentSet.has(mod.key) && mod.dependencies) {
        for (const depKey of mod.dependencies) {
          if (!currentSet.has(depKey)) {
            currentSet.add(depKey);
            autoActivated.push(depKey);
            changed = true;
          }
        }
      }
    }
  }

  return {
    resolvedKeys: Array.from(currentSet),
    autoActivated,
  };
}

/**
 * دالة ذكية لحساب الباقة الأنسب المطابقة للموديولات المحددة
 */
export function calculateRecommendedPlan(selectedKeys: string[]): PlanTierInfo {
  // فحص أعلى موديول مطلوب
  const hasOmnichannel = selectedKeys.includes('storefrontModuleEnabled');
  if (hasOmnichannel) {
    return PLAN_TIERS.plan_omnichannel;
  }

  const ultimateModules = [
    'clothingModuleEnabled',
    'enablePharmacyModule',
    'enableMobileStoreFeatures',
    'manufacturingModuleEnabled',
    'importModuleEnabled',
    'contractingModuleEnabled',
    'maritimeFreightModuleEnabled',
    'restaurantModuleEnabled',
    'enableEnterpriseFeatures',
    'fixedAssetsModuleEnabled',
    'installmentsModuleEnabled',
    'taxDeclarationModuleEnabled',
    'deliveryFleetModuleEnabled',
    'hrModuleEnabled',
  ];

  const hasUltimate = ultimateModules.some((key) => selectedKeys.includes(key));
  if (hasUltimate) {
    return PLAN_TIERS.plan_ultimate;
  }

  const proModules = ['comboModuleEnabled', 'purchasesModuleEnabled', 'inventoryModuleEnabled'];
  const hasPro = proModules.some((key) => selectedKeys.includes(key));
  if (hasPro) {
    return PLAN_TIERS.plan_pro;
  }

  return PLAN_TIERS.plan_basic;
}

/**
 * دالة مساعدة لتوليد كائن الإعدادات الكامل بناءً على النشاط المختار
 */
export function buildSettingsFromIndustry(industryId: IndustryPresetId): Record<string, any> {
  const preset = INDUSTRY_PRESETS[industryId] || INDUSTRY_PRESETS.retail;
  const patch: Record<string, any> = {
    businessIndustry: industryId,
    onboardingCompleted: true,
  };

  // 1. ضبط الموديولات بناء على القالب
  for (const mod of SYSTEM_MODULES) {
    patch[mod.key] = false;
  }
  for (const key of preset.recommendedModules) {
    patch[key] = true;
  }
  for (const key of preset.disabledModules) {
    patch[key] = false;
  }

  // 2. فحص الاعتماديات وتفعيل المطلوب منها تلقائياً
  const activeKeys = Object.keys(patch).filter((k) => patch[k] === true);
  const { resolvedKeys } = resolveModuleDependencies(activeKeys);
  for (const key of resolvedKeys) {
    patch[key] = true;
  }

  // 3. ضبط أنماط العرض والتكوين
  if (preset.defaultPosMode) {
    patch.defaultPosMode = preset.defaultPosMode;
  }
  if (preset.defaultProductKind) {
    patch.defaultProductKind = preset.defaultProductKind;
  }
  if (preset.maintenanceProfile) {
    patch.maintenanceProfile = preset.maintenanceProfile;
  }

  return patch;
}
