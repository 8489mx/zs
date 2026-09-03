export type SettingsSectionKey = 'core' | 'subscription' | 'storefront' | 'reference' | 'backup' | 'users' | 'system-updates' | 'lan-network' | 'tax-integration';

const allSections: Array<{ key: SettingsSectionKey; label: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { key: 'core', label: 'إعدادات النظام' },
  { key: 'subscription', label: 'الاشتراك والفوترة', adminOnly: true },
  { key: 'storefront', label: 'المتجر الإلكتروني', adminOnly: true },
  { key: 'reference', label: 'أماكن المخزون' },
  { key: 'lan-network', label: 'شبكة محلية متعددة الأجهزة', offlineOnly: true, superAdminOnly: true },
  { key: 'users', label: 'المستخدمون والصلاحيات', adminOnly: true },
  { key: 'system-updates', label: 'الإصدارات والتحديثات', offlineOnly: true },
  { key: 'backup', label: 'النسخ والاستيراد' },
  { key: 'tax-integration', label: 'الضرائب والفاتورة الإلكترونية', adminOnly: true },
];

export const settingsSections = allSections.filter(s => s.key !== 'lan-network' || (typeof window !== 'undefined' && !!(window as any).electronRuntime));

// Extra standalone pages linked from settings sidebar
export const settingsStandaloneLinks: Array<{ label: string; to: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { label: 'إدارة أماكن المخزون المتقدمة', to: '/settings/locations', adminOnly: true },
];


export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
