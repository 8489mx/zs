/**
 * دستور الأنماط المؤسسية والباقات التابعة — Z-Systems
 *
 * المصدر الموحد للأنماط الستة عشر المعتمدة في النظام والباقات المتوافقة مع كل نمط
 * وفقاً لـ PRICING_AND_PACKAGING.md و industry-profiles.ts.
 */

export interface SystemVertical {
  key: string;
  label: string;
  badge: string;
  band: 1 | 2 | 3 | 4 | 5;
  group: 'enterprise' | 'commerce_wholesale' | 'hospitality' | 'specialized' | 'retail';
  groupLabel: string;
  description: string;
  recommendedPlanId: string;
}

export const SYSTEM_VERTICAL_OPTIONS: SystemVertical[] = [
  // --- النطاق 5: القطاعات الكبرى والمستقلة (Enterprise Independent Verticals) ---
  {
    key: 'maritime',
    label: 'الشحن البحري والخدمات اللوجستية والموانئ',
    badge: 'مود الشحن واللوجستيات',
    band: 5,
    group: 'enterprise',
    groupLabel: 'القطاعات الكبرى والمستقلة (ERP)',
    description: 'إدارة الخطوط الملاحية، تتبع الحاويات، بوالص الشحن (B/L)، عروض النولون والمصروفات التشغيلية [بدون كاشير أو متجر].',
    recommendedPlanId: 'plan_ultimate',
  },
  {
    key: 'contracting',
    label: 'المقاولات العامة والمشاريع الإنشائية والتطوير العقاري',
    badge: 'مود المقاولات والمشاريع',
    band: 5,
    group: 'enterprise',
    groupLabel: 'القطاعات الكبرى والمستقلة (ERP)',
    description: 'المشاريع، جداول الكميات (BOQ)، مستخلصات المالك والمقاولين (IPC)، مقاولو الباطن وأوامر التغيير [بدون كاشير أو متجر].',
    recommendedPlanId: 'plan_ultimate',
  },

  // --- النطاق 4: التجارة المؤسسية والجملة والتصنيع والخدمات (Corporate & Distribution) ---
  {
    key: 'wholesale',
    label: 'تجارة وتوزيع الجملة وأسطول سيارات الفان',
    badge: 'موزعون وفان ومخازن',
    band: 4,
    group: 'commerce_wholesale',
    groupLabel: 'الشركات والتوزيع والإنتاج',
    description: 'أسطول سيارات الفان، المخازن المتنقلة، خطوط السير، المبيعات الآجلة وكشوف الحسابات [بدون كاشير تجزئة].',
    recommendedPlanId: 'tier_band4_L2',
  },
  {
    key: 'manufacturing',
    label: 'التصنيع والإنتاج الصناعي والورش والمعامل',
    badge: 'أوامر تشغيل وتكاليف BOM',
    band: 4,
    group: 'commerce_wholesale',
    groupLabel: 'الشركات والتوزيع والإنتاج',
    description: 'تخطيط الإنتاج، شجرة المنتج (BOM)، أوامر التشغيل، مخازن الخامات والمنتج التام ومحاسبة التكاليف.',
    recommendedPlanId: 'tier_band4_L2',
  },
  {
    key: 'import_export',
    label: 'الاستيراد والتصدير والتجارة الدولية',
    badge: 'شحنات وحاويات جمركية',
    band: 4,
    group: 'commerce_wholesale',
    groupLabel: 'الشركات والتوزيع والإنتاج',
    description: 'الشحنات الجمركية، حساب التكلفة الاستيرادية للرسائل، مديونيات الموردين بالعملات الأجنبية وأرباح الشركاء.',
    recommendedPlanId: 'tier_band4_L2',
  },
  {
    key: 'services',
    label: 'الشركات والمكاتب الخدمية والاستشارية',
    badge: 'خدمات وعقود بلا مخزون',
    band: 4,
    group: 'commerce_wholesale',
    groupLabel: 'الشركات والتوزيع والإنتاج',
    description: 'عقود الخدمات والمشاريع الاستشارية، فواتير المطالبات، العملاء والتحصيلات والمصروفات [بدون مخزون سلعي].',
    recommendedPlanId: 'tier_band4_L1',
  },
  {
    key: 'ecommerce',
    label: 'المتاجر الرقمية والتجارة الإلكترونية والبيع أونلاين',
    badge: 'متجر سحابي وبوابات دفع',
    band: 4,
    group: 'commerce_wholesale',
    groupLabel: 'الشركات والتوزيع والإنتاج',
    description: 'المتجر الإلكتروني المتكامل، طلبات الأونلاين، بوابات الدفع الإلكتروني وشركات الشحن والتوصيل.',
    recommendedPlanId: 'plan_omnichannel',
  },

  // --- النطاق 3: المطاعم والضيافة (Hospitality & Foodservice) ---
  {
    key: 'restaurant',
    label: 'المطاعم والكافيهات والأغذية والضيافة',
    badge: 'شاشات مطبخ KDS وطاولات',
    band: 3,
    group: 'hospitality',
    groupLabel: 'المطاعم والضيافة',
    description: 'شاشات المطبخ الذكية (KDS)، الصالات والطاولات، إضافات الوجبات والمكونات (Modifiers)، ونقطة بيع لمس.',
    recommendedPlanId: 'tier_band3_L1',
  },

  // --- النطاق 2: الأنشطة المتخصصة والمعارض (Specialized Retail & Showrooms) ---
  {
    key: 'pharmacy',
    label: 'الصيدليات والمستلزمات الطبية والعلاجية',
    badge: 'تشغيلات وصلاحية FEFO',
    band: 2,
    group: 'specialized',
    groupLabel: 'الأنشطة المتخصصة والمعارض',
    description: 'محرك تاريخ الصلاحية والتشغيلات (FEFO)، إدارة الأدوية والبدائل والنواقص، والروشتات الطبية.',
    recommendedPlanId: 'tier_band2_L1',
  },
  {
    key: 'electronics',
    label: 'الموبايل والإلكترونيات ومراكز الصيانة',
    badge: 'أرقام تسلسلية IMEI وصيانة',
    band: 2,
    group: 'specialized',
    groupLabel: 'الأنشطة المتخصصة والمعارض',
    description: 'تتبع أرقام السيريال والـ IMEI، كروت استلام وفحص الأجهزة، قطع الغيار وتسليم الصيانة والضمان.',
    recommendedPlanId: 'tier_band2_L1',
  },
  {
    key: 'appliances_installments',
    label: 'الأجهزة الكهربائية والمنزلية ومعارض التقسيط',
    badge: 'مبيعات وأقساط وشيكات',
    band: 2,
    group: 'specialized',
    groupLabel: 'الأنشطة المتخصصة والمعارض',
    description: 'جدولة أقساط العملاء، غرامات التأخير، شيكات وإيصالات الأمانة، وإدارة معارض الأجهزة.',
    recommendedPlanId: 'tier_band2_L2',
  },

  // --- النطاق 1: التجزئة العامة والمتاجر (General Retail & Consumer Goods) ---
  {
    key: 'supermarket',
    label: 'السوبرماركت والبقالة والمواد الغذائية',
    badge: 'ميزان إلكتروني وباركود وزني',
    band: 1,
    group: 'retail',
    groupLabel: 'التجزئة العامة والمتاجر',
    description: 'الباركود الوزني وموازين الباركود، الكاشير السريع، المخزون، وتنبيهات الرواكد ونواقص الرفوف.',
    recommendedPlanId: 'tier_band1_L1',
  },
  {
    key: 'fashion',
    label: 'الملابس والأزياء والأحذية والشنط',
    badge: 'مصفوفة مقاسات وألوان',
    band: 1,
    group: 'retail',
    groupLabel: 'التجزئة العامة والمتاجر',
    description: 'مصفوفة الألوان والمقاسات (Variants)، باركود الأزياء، وتصنيفات الموديلات والماركات.',
    recommendedPlanId: 'tier_band1_L1',
  },
  {
    key: 'spices',
    label: 'العطارة والمحامص والمطاحن والبهارات',
    badge: 'خلطات وتجزئة بالوزن',
    band: 1,
    group: 'retail',
    groupLabel: 'التجزئة العامة والمتاجر',
    description: 'خلطات التعبئة والميزان، التجزئة بالأوزان والأحجام، وكاشير سريع للمحامص والمطاحن.',
    recommendedPlanId: 'tier_band1_L1',
  },
  {
    key: 'perfumes',
    label: 'العطور ومستحضرات التجميل والتركيبات',
    badge: 'تركيبات وأحجام عبوات',
    band: 1,
    group: 'retail',
    groupLabel: 'التجزئة العامة والمتاجر',
    description: 'تركيبات العطور والزيوت الخام، أحجام الزجاجات والعبوات، والبيع السريع بالباركود.',
    recommendedPlanId: 'tier_band1_L1',
  },
  {
    key: 'retail',
    label: 'التجزئة والمحلات والمتاجر العامة',
    badge: 'كاشير سريع ومخزون عام',
    band: 1,
    group: 'retail',
    groupLabel: 'التجزئة العامة والمتاجر',
    description: 'نظام كاشير سريع، باركود ومخازن، مشتريات وموردين، وتقارير أرباح ومبيعات فورية.',
    recommendedPlanId: 'tier_band1_L1',
  },
];

/**
 * Normalizes any vertical/activity string into one of the 16 canonical keys.
 */
export function normalizeVerticalKey(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return 'retail';
  const trimmed = raw.trim().toLowerCase();

  if (trimmed.includes('maritime') || trimmed.includes('شحن') || trimmed.includes('ملاحة') || trimmed.includes('موانئ') || trimmed.includes('لوجست') || trimmed === 'freight') {
    return 'maritime';
  }
  if (trimmed.includes('contracting') || trimmed.includes('مقاول') || trimmed.includes('إنشاءات') || trimmed.includes('مشاريع')) {
    return 'contracting';
  }
  if (trimmed.includes('wholesale') || trimmed.includes('توزيع') || trimmed.includes('فان') || trimmed.includes('مناديب') || trimmed.includes('جملة') || trimmed.includes('وكلاء')) {
    return 'wholesale';
  }
  if (trimmed.includes('manufacturing') || trimmed.includes('تصنيع') || trimmed.includes('مصنع') || trimmed.includes('معامل') || trimmed.includes('ورش')) {
    return 'manufacturing';
  }
  if (trimmed.includes('import') || trimmed.includes('استيراد') || trimmed.includes('تصدير') || trimmed.includes('جمارك')) {
    return 'import_export';
  }
  if (trimmed.includes('service') || trimmed.includes('خدمات') || trimmed.includes('خدمية') || trimmed.includes('استشار')) {
    return 'services';
  }
  if (trimmed.includes('ecommerce') || trimmed.includes('storefront') || trimmed.includes('أونلاين') || trimmed.includes('متجر رقمي') || trimmed.includes('إلكتروني')) {
    return 'ecommerce';
  }
  if (trimmed.includes('restaurant') || trimmed.includes('مطعم') || trimmed.includes('مطاعم') || trimmed.includes('كافيه') || trimmed.includes('أغذية مجهزة')) {
    return 'restaurant';
  }
  if (trimmed.includes('pharmacy') || trimmed.includes('صيدل') || trimmed.includes('أدوية') || trimmed.includes('علاجية')) {
    return 'pharmacy';
  }
  if (trimmed.includes('electronics') || trimmed.includes('صيانة') || trimmed.includes('موبايل') || trimmed.includes('إلكترون') || trimmed.includes('repair')) {
    return 'electronics';
  }
  if (trimmed.includes('installment') || trimmed.includes('تقسيط') || trimmed.includes('أجهزة') || trimmed.includes('أثاث')) {
    return 'appliances_installments';
  }
  if (trimmed.includes('supermarket') || trimmed.includes('سوبر') || trimmed.includes('بقالة')) {
    return 'supermarket';
  }
  if (trimmed.includes('fashion') || trimmed.includes('clothing') || trimmed.includes('ملابس') || trimmed.includes('أزياء') || trimmed.includes('أحذية')) {
    return 'fashion';
  }
  if (trimmed.includes('spice') || trimmed.includes('عطارة') || trimmed.includes('محامص') || trimmed.includes('مطاحن') || trimmed.includes('بهارات')) {
    return 'spices';
  }
  if (trimmed.includes('perfume') || trimmed.includes('عطور') || trimmed.includes('تجميل')) {
    return 'perfumes';
  }

  return 'retail';
}

export function getSystemVertical(verticalKey?: string | null): SystemVertical {
  const normalized = normalizeVerticalKey(verticalKey);
  return SYSTEM_VERTICAL_OPTIONS.find((v) => v.key === normalized) || SYSTEM_VERTICAL_OPTIONS[SYSTEM_VERTICAL_OPTIONS.length - 1];
}

export interface PlanOptionItem {
  value: string;
  label: string;
  badge?: string;
  isRecommended?: boolean;
}

/**
 * Returns strictly the authorized and logically relevant plans for a selected vertical mode.
 * Completely hides irrelevant retail shop tiers when viewing Maritime or Contracting!
 */
export function getPlansForVertical(verticalKey?: string | null, _databasePlans: any[] = []): PlanOptionItem[] {
  const vertical = getSystemVertical(verticalKey);
  const band = vertical.band;

  // 1. Universal Enterprise Plans (Always available for high-tier enterprise operations)
  const universalOmnichannel: PlanOptionItem = {
    value: 'plan_omnichannel',
    label: 'باقة المؤسسات والتجارة الشاملة (Omnichannel Enterprise)',
    badge: 'كافة الميزات + المتجر السحابي والربط',
  };
  const universalUltimate: PlanOptionItem = {
    value: 'plan_ultimate',
    label: band === 5 
      ? `باقة المؤسسات المتكاملة — [${vertical.label}]`
      : 'الباقة المتكاملة لكافة العمليات المؤسسية (Ultimate)',
    badge: 'شاملة كل العمليات بدون حدود',
    isRecommended: band === 5,
  };

  // 2. Band 5: Maritime Logistics & Contracting (Strictly Enterprise & Corporate Tiers)
  if (band === 5) {
    return [
      universalOmnichannel,
      universalUltimate,
      {
        value: 'plan_pro',
        label: vertical.key === 'maritime' ? 'باقة شركات الشحن المتقدمة (Pro)' : 'باقة شركات المقاولات المتقدمة (Pro)',
        badge: 'المشاريع/الحاويات + المحاسبة والمشتريات',
      },
      {
        value: 'plan_basic',
        label: vertical.key === 'maritime' ? 'باقة مكاتب الشحن والتخليص (Starter)' : 'باقة مكاتب المقاولات (Starter)',
        badge: 'العمليات الأساسية والمستندات',
      },
    ];
  }

  // 3. Band 4: Corporate, Wholesale, Manufacturing, Import, Services, Ecommerce
  if (band === 4) {
    return [
      universalOmnichannel,
      universalUltimate,
      {
        value: 'tier_band4_L3',
        label: 'الشركات والتوزيع — مؤسسة وسلاسل كبرى (Level 3)',
        badge: 'العمليات الكاملة + المالية والرواتب والربط الضريبي',
        isRecommended: true,
      },
      {
        value: 'tier_band4_L2',
        label: 'الشركات والتوزيع — شركة متقدمة (Level 2)',
        badge: 'المشتريات والمخازن والعملاء والآجل وأوامر البيع',
      },
      {
        value: 'tier_band4_L1',
        label: 'الشركات والتوزيع — أساسي (Level 1)',
        badge: 'الأساس القطاعي والعمليات الأولية',
      },
    ];
  }

  // 4. Band 3: Restaurants & Foodservice
  if (band === 3) {
    return [
      universalOmnichannel,
      universalUltimate,
      {
        value: 'tier_band3_L3',
        label: 'المطاعم والكافيهات — سلسلة ومؤسسة (Level 3)',
        badge: 'شاشات مطبخ + طاولات + محاسبة ورواتب وربط ضريبي',
      },
      {
        value: 'tier_band3_L2',
        label: 'المطاعم والكافيهات — ثلاثة فروع (Level 2)',
        badge: 'شاشات مطبخ + طاولات + مشتريات ومخازن وولاء',
      },
      {
        value: 'tier_band3_L1',
        label: 'المطاعم والكافيهات — فرع واحد (Level 1)',
        badge: 'كاشير لمس + شاشات مطبخ KDS وطاولات',
        isRecommended: true,
      },
    ];
  }

  // 5. Band 2: Specialized Retail & Showrooms (Pharmacies, Electronics, Installments)
  if (band === 2) {
    return [
      universalOmnichannel,
      universalUltimate,
      {
        value: 'tier_band2_L3',
        label: 'معارض وأنشطة متخصصة — سلسلة ومؤسسة (Level 3)',
        badge: 'كامل تخصص النشاط + المحاسبة والرواتب والربط الضريبي',
      },
      {
        value: 'tier_band2_L2',
        label: 'معارض وأنشطة متخصصة — متعدد الفروع (Level 2)',
        badge: 'كامل تخصص النشاط + مشتريات ومخازن وآجل وتقسيط',
      },
      {
        value: 'tier_band2_L1',
        label: 'معارض وأنشطة متخصصة — محل/معرض (Level 1)',
        badge: 'كامل تخصص النشاط (FEFO / سيريال / أقساط) + كاشير سريع',
        isRecommended: true,
      },
    ];
  }

  // 6. Band 1: General Retail, Supermarkets, Fashion, Spices, Perfumes
  return [
    universalOmnichannel,
    universalUltimate,
    {
      value: 'tier_band1_L3',
      label: 'التجزئة العامة والمتاجر — سلسلة ومؤسسة (Level 3)',
      badge: 'كاشير سريع + مشتريات ومخازن ومحاسبة ورواتب وضريبة',
    },
    {
      value: 'tier_band1_L2',
      label: 'التجزئة العامة والمتاجر — متعدد الفروع (Level 2)',
      badge: 'كاشير سريع + مشتريات ومخازن وعملاء وآجل وولاء',
    },
    {
      value: 'tier_band1_L1',
      label: 'التجزئة العامة والمتاجر — محل واحد (Level 1)',
      badge: 'كاشير سريع بالباركود + ورديات وخزينة وتقارير يومية',
      isRecommended: true,
    },
  ];
}
