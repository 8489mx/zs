export type SettingsSectionKey = 'core' | 'demo-data' | 'daily-digest' | 'subscription' | 'storefront' | 'marketplaces' | 'whatsapp' | 'reference' | 'backup' | 'users' | 'system-updates' | 'lan-network' | 'tax-integration' | 'monitoring';

export interface SettingsSectionDefinition {
  key: SettingsSectionKey;
  label: string;
  shortLabel?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  offlineOnly?: boolean;
  hiddenInTabs?: boolean;
  requiredFeature?: string;
  requiredModule?: (settings?: any) => boolean;
}

export interface SettingsStandaloneLinkDefinition {
  label: string;
  to: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  offlineOnly?: boolean;
  requiredFeature?: string;
  requiredModule?: (settings?: any) => boolean;
}

const allSections: SettingsSectionDefinition[] = [
  { key: 'core', label: 'إعدادات النظام الأساسية', shortLabel: 'إعدادات عامة' },
  { key: 'reference', label: 'الفروع وأماكن التخزين', shortLabel: 'الفروع والمخازن' },
  { key: 'users', label: 'المستخدمون والصلاحيات', shortLabel: 'المستخدمون', adminOnly: true },
  { key: 'tax-integration', label: 'الضرائب والفاتورة الإلكترونية', shortLabel: 'الضرائب والفاتورة', adminOnly: true },
  {
    key: 'storefront',
    label: 'التجارة الإلكترونية والمنصات',
    shortLabel: 'المتجر والمنصات',
    adminOnly: true,
    requiredFeature: 'storefront',
    requiredModule: (s) => s?.storefrontModuleEnabled === true,
  },
  { key: 'whatsapp', label: 'بوابة الواتساب والتقارير الذكية', shortLabel: 'واتساب والتقارير', adminOnly: true },
  { key: 'backup', label: 'النسخ والبيانات والصيانة', shortLabel: 'النسخ الاحتياطي', adminOnly: true },
  { key: 'subscription', label: 'الاشتراك والفوترة', shortLabel: 'الاشتراك', adminOnly: true },
  { key: 'demo-data', label: 'بيانات تجريبية حسب النشاط', shortLabel: 'بيانات تجريبية', hiddenInTabs: true, superAdminOnly: true },
  {
    key: 'marketplaces',
    label: 'الربط مع منصات أمازون ونون',
    shortLabel: 'أمازون ونون',
    adminOnly: true,
    hiddenInTabs: true,
    requiredFeature: 'storefront',
    requiredModule: (s) => s?.storefrontModuleEnabled === true,
  },
  { key: 'daily-digest', label: 'الملخص اليومي للمدير', shortLabel: 'الملخص اليومي', adminOnly: true, hiddenInTabs: true },
  { key: 'lan-network', label: 'شبكة محلية متعددة الأجهزة', shortLabel: 'شبكة محلية', offlineOnly: true, superAdminOnly: true },
  { key: 'system-updates', label: 'الإصدارات والتحديثات', shortLabel: 'التحديثات', offlineOnly: true },
  { key: 'monitoring', label: 'المراقبة ورصد السيرفر (APM)', shortLabel: 'رصد السيرفر', superAdminOnly: true },
];

export const settingsSections: SettingsSectionDefinition[] = allSections.filter(s => s.key !== 'lan-network' || (typeof window !== 'undefined' && !!(window as any).electronRuntime));

// Extra standalone pages linked from settings sidebar
export const settingsStandaloneLinks: SettingsStandaloneLinkDefinition[] = [
  { label: 'إدارة أماكن المخزون المتقدمة', to: '/settings/locations', adminOnly: true },
];

export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
