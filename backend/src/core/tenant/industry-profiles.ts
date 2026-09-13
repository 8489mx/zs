export type IndustryPillar = 'contracting' | 'maritime_freight' | 'commerce';

export type CommerceSubVertical =
  | 'retail_general'
  | 'pharmacy'
  | 'restaurant'
  | 'manufacturing'
  | 'maintenance';

export type IndustryProfileKey =
  | 'contracting'
  | 'maritime_freight'
  | CommerceSubVertical;

export interface IndustryProfile {
  key: IndustryProfileKey;
  pillar: IndustryPillar;
  subVertical?: CommerceSubVertical;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  defaultRoute: string;
  defaultFeatures: string[];
  allowedExtraFeatures: string[];
}

export const INDUSTRY_PROFILES: Record<IndustryProfileKey, IndustryProfile> = {
  contracting: {
    key: 'contracting',
    pillar: 'contracting',
    labelAr: 'قطاع المقاولات وإدارة المشاريع',
    labelEn: 'Contracting & Construction Projects',
    descriptionAr: 'إدارة متكاملة للمشاريع والمقايسات (BOQ) والمستخلصات وعقود مقاولي الباطن ودفاتر يوميات الموقع.',
    defaultRoute: '/contracting',
    defaultFeatures: [
      'contracting',
      'accounting',
      'hr',
      'pricing',
      'fixed_assets',
      'vat_declaration',
      'reports',
    ],
    allowedExtraFeatures: ['inventory', 'purchases'],
  },

  maritime_freight: {
    key: 'maritime_freight',
    pillar: 'maritime_freight',
    labelAr: 'قطاع الشحن البحري واللوجستيات',
    labelEn: 'Maritime Freight & Logistics',
    descriptionAr: 'إدارة الخطوط الملاحية، الموانئ، عروض النولون، أوامر تشغيل الشحنات، وتتبع الحاويات.',
    defaultRoute: '/maritime-freight',
    defaultFeatures: [
      'maritime_freight',
      'accounting',
      'hr',
      'fixed_assets',
      'vat_declaration',
      'reports',
    ],
    allowedExtraFeatures: ['purchases'],
  },

  retail_general: {
    key: 'retail_general',
    pillar: 'commerce',
    subVertical: 'retail_general',
    labelAr: 'تجارة عامة وتجزئة وسوبرماركت',
    labelEn: 'General Retail & Supermarket',
    descriptionAr: 'نظام كاشير سريع، باركود ومخازن، مشتريات وموردين، وتقارير أرباح ومبيعات متقدمة.',
    defaultRoute: '/dashboard',
    defaultFeatures: [
      'catalog',
      'sales',
      'sessions',
      'cashDrawer',
      'purchases',
      'inventory',
      'reports',
      'accounting',
      'hr',
      'deliveryReps',
      'loyalty',
      'fixed_assets',
      'installments',
      'vat_declaration',
      'taxIntegration',
    ],
    allowedExtraFeatures: ['storefront'],
  },

  pharmacy: {
    key: 'pharmacy',
    pillar: 'commerce',
    subVertical: 'pharmacy',
    labelAr: 'صيدليات ومستلزمات طبية',
    labelEn: 'Pharmacy & Medical Supplies',
    descriptionAr: 'محرك تاريخ الصلاحية والتشغيلات (FEFO)، إدارة الأدوية والبدائل والنواقص، والروشتات.',
    defaultRoute: '/dashboard',
    defaultFeatures: [
      'catalog',
      'sales',
      'sessions',
      'cashDrawer',
      'purchases',
      'inventory',
      'reports',
      'pharmacy',
      'accounting',
      'hr',
      'deliveryReps',
      'loyalty',
      'fixed_assets',
      'installments',
      'vat_declaration',
      'taxIntegration',
    ],
    allowedExtraFeatures: ['storefront'],
  },

  restaurant: {
    key: 'restaurant',
    pillar: 'commerce',
    subVertical: 'restaurant',
    labelAr: 'مطاعم وكافيهات وضيافة',
    labelEn: 'Restaurants & Hospitality',
    descriptionAr: 'شاشات المطبخ الذكية (KDS)، شاشات الانتظار، إضافات الوجبات والمكونات (Modifiers)، والصالات.',
    defaultRoute: '/pos',
    defaultFeatures: [
      'catalog',
      'sales',
      'sessions',
      'cashDrawer',
      'purchases',
      'inventory',
      'reports',
      'restaurant',
      'accounting',
      'hr',
      'deliveryReps',
      'loyalty',
      'fixed_assets',
      'vat_declaration',
      'taxIntegration',
    ],
    allowedExtraFeatures: ['storefront'],
  },

  manufacturing: {
    key: 'manufacturing',
    pillar: 'commerce',
    subVertical: 'manufacturing',
    labelAr: 'تصنيع وورش ومعامل إنتاج',
    labelEn: 'Manufacturing & Assembly',
    descriptionAr: 'قوائم المكونات (BOM)، مراكز العمل ومسارات الإنتاج، أوامر الشغل، وحساب تكاليف التشغيل.',
    defaultRoute: '/manufacturing',
    defaultFeatures: [
      'catalog',
      'sales',
      'sessions',
      'cashDrawer',
      'purchases',
      'inventory',
      'reports',
      'manufacturing',
      'accounting',
      'hr',
      'fixed_assets',
      'vat_declaration',
      'taxIntegration',
    ],
    allowedExtraFeatures: ['storefront'],
  },

  maintenance: {
    key: 'maintenance',
    pillar: 'commerce',
    subVertical: 'maintenance',
    labelAr: 'مراكز صيانة وخدمات وأجهزة',
    labelEn: 'Maintenance & Service Center',
    descriptionAr: 'كروت استلام وفحص الأجهزة، قطع الغيار المستهلكة، تتبع أرقام السيريال والـ IMEI وتسليم الأجهزة.',
    defaultRoute: '/maintenance',
    defaultFeatures: [
      'catalog',
      'sales',
      'sessions',
      'cashDrawer',
      'purchases',
      'inventory',
      'reports',
      'maintenance',
      'accounting',
      'hr',
      'fixed_assets',
      'installments',
      'vat_declaration',
      'taxIntegration',
    ],
    allowedExtraFeatures: ['storefront'],
  },
};

/**
 * Normalizes an arbitrary activity string to a recognized IndustryProfileKey.
 * Defaults safely to 'retail_general' to ensure zero disruptions.
 */
export function normalizeIndustryProfileKey(raw?: string | null): IndustryProfileKey {
  if (!raw || typeof raw !== 'string') return 'retail_general';
  const trimmed = raw.trim().toLowerCase();

  if (trimmed === 'contracting' || trimmed === 'construction' || trimmed === 'مقاولات') {
    return 'contracting';
  }
  if (
    trimmed === 'maritime_freight' ||
    trimmed === 'maritime' ||
    trimmed === 'freight' ||
    trimmed === 'shipping' ||
    trimmed === 'شحن'
  ) {
    return 'maritime_freight';
  }
  if (trimmed === 'pharmacy' || trimmed === 'صيدلية' || trimmed === 'صيدليات') {
    return 'pharmacy';
  }
  if (trimmed === 'restaurant' || trimmed === 'cafe' || trimmed === 'مطعم' || trimmed === 'كافيه') {
    return 'restaurant';
  }
  if (trimmed === 'manufacturing' || trimmed === 'production' || trimmed === 'تصنيع' || trimmed === 'مصنع') {
    return 'manufacturing';
  }
  if (trimmed === 'maintenance' || trimmed === 'صيانة' || trimmed === 'repair' || trimmed === 'ورشة') {
    return 'maintenance';
  }

  return 'retail_general';
}

export function getIndustryProfile(activityType?: string | null): IndustryProfile {
  const key = normalizeIndustryProfileKey(activityType);
  return INDUSTRY_PROFILES[key] || INDUSTRY_PROFILES.retail_general;
}

export function listSupportedIndustryProfiles(): IndustryProfile[] {
  return Object.values(INDUSTRY_PROFILES);
}

/**
 * Resolves the effective feature list for a tenant based on their activity profile and plan.
 * Pillars strictly protect core domain modules (e.g. contracting will not leak to retail, and vice versa).
 */
export function resolvePillarScopedFeatures(
  activityType: string | null | undefined,
  planFeatures: string[],
  extraFeatures: string[] = [],
): string[] {
  const profile = getIndustryProfile(activityType);
  const extraAdd = extraFeatures.filter((f) => !f.startsWith('+') && !f.startsWith('-'));
  const explicitPlus = extraFeatures.filter((f) => f.startsWith('+')).map((f) => f.substring(1));
  const explicitMinus = extraFeatures.filter((f) => f.startsWith('-')).map((f) => f.substring(1));

  // Combined candidate features from plan and profile defaults
  const candidates = new Set([...profile.defaultFeatures, ...planFeatures, ...extraAdd, ...explicitPlus]);

  // If the tenant is strictly contracting or maritime, remove non-allowed retail modules unless explicitly added
  if (profile.pillar === 'contracting') {
    candidates.delete('pharmacy');
    candidates.delete('restaurant');
    candidates.delete('maritime_freight');
    candidates.delete('storefront');
    if (!explicitPlus.includes('pos')) candidates.delete('pos');
  } else if (profile.pillar === 'maritime_freight') {
    candidates.delete('pharmacy');
    candidates.delete('restaurant');
    candidates.delete('contracting');
    candidates.delete('manufacturing');
    candidates.delete('storefront');
    candidates.delete('pos');
  } else {
    // Pillar is commerce: remove isolated vertical modules (contracting & maritime_freight) unless explicitly granted
    if (!explicitPlus.includes('contracting')) candidates.delete('contracting');
    if (!explicitPlus.includes('maritime_freight')) candidates.delete('maritime_freight');

    // Remove specialized commerce verticals that do not match the subVertical unless explicitly granted
    if (profile.subVertical !== 'pharmacy' && !explicitPlus.includes('pharmacy')) {
      candidates.delete('pharmacy');
    }
    if (profile.subVertical !== 'restaurant' && !explicitPlus.includes('restaurant')) {
      candidates.delete('restaurant');
    }
    if (profile.subVertical !== 'manufacturing' && !explicitPlus.includes('manufacturing')) {
      candidates.delete('manufacturing');
    }
    if (profile.subVertical !== 'maintenance' && !explicitPlus.includes('maintenance')) {
      candidates.delete('maintenance');
    }
  }

  // Filter out any explicit exclusions
  for (const excluded of explicitMinus) {
    candidates.delete(excluded);
  }

  return Array.from(candidates);
}
