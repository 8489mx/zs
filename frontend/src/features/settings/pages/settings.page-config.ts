export type SettingsSectionKey = 'core' | 'demo-data' | 'daily-digest' | 'subscription' | 'storefront' | 'marketplaces' | 'whatsapp' | 'reference' | 'backup' | 'users' | 'system-updates' | 'lan-network' | 'tax-integration' | 'monitoring';

const allSections: Array<{
  key: SettingsSectionKey;
  label: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  offlineOnly?: boolean;
  hiddenInTabs?: boolean;
}> = [
  { key: 'core', label: 'إعدادات النظام الأساسية' },
  { key: 'reference', label: 'الفروع وأماكن التخزين' },
  { key: 'users', label: 'المستخدمون والصلاحيات', adminOnly: true },
  { key: 'tax-integration', label: 'الضرائب والفاتورة الإلكترونية', adminOnly: true },
  { key: 'storefront', label: 'التجارة الإلكترونية والمنصات', adminOnly: true },
  { key: 'whatsapp', label: 'بوابة الواتساب والتقارير الذكية', adminOnly: true },
  { key: 'backup', label: 'النسخ والبيانات والصيانة' },
  { key: 'subscription', label: 'الاشتراك والفوترة', adminOnly: true },
  { key: 'demo-data', label: 'بيانات تجريبية حسب النشاط', hiddenInTabs: true },
  { key: 'marketplaces', label: 'الربط مع منصات أمازون ونون', adminOnly: true, hiddenInTabs: true },
  { key: 'daily-digest', label: 'الملخص اليومي للمدير', adminOnly: true, hiddenInTabs: true },
  { key: 'lan-network', label: 'شبكة محلية متعددة الأجهزة', offlineOnly: true, superAdminOnly: true },
  { key: 'system-updates', label: 'الإصدارات والتحديثات', offlineOnly: true },
  { key: 'monitoring', label: 'المراقبة ورصد السيرفر (APM)', superAdminOnly: true },
];

export const settingsSections = allSections.filter(s => s.key !== 'lan-network' || (typeof window !== 'undefined' && !!(window as any).electronRuntime));

// Extra standalone pages linked from settings sidebar
export const settingsStandaloneLinks: Array<{ label: string; to: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { label: 'إدارة أماكن المخزون المتقدمة', to: '/settings/locations', adminOnly: true },
];


export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
