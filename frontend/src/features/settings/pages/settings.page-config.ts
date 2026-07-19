export type SettingsSectionKey = 'overview' | 'core' | 'reference' | 'backup' | 'users' | 'offline-releases' | 'system-updates' | 'lan-network';

const allSections: Array<{ key: SettingsSectionKey; label: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { key: 'overview', label: 'ملخص سريع' },
  { key: 'core', label: 'بيانات النشاط' },
  { key: 'reference', label: 'أماكن المخزون' },
  { key: 'lan-network', label: 'شبكة محلية متعددة الأجهزة', offlineOnly: true, adminOnly: true },
  { key: 'users', label: 'المستخدمون والصلاحيات', adminOnly: true },
  { key: 'system-updates', label: 'الإصدارات والتحديثات', offlineOnly: true },
  { key: 'backup', label: 'النسخ والاستيراد' },
  { key: 'offline-releases', label: 'إصدارات الأوفلاين 🖥️', superAdminOnly: true }
];

export const settingsSections = allSections.filter(s => s.key !== 'lan-network' || (typeof window !== 'undefined' && !!(window as any).electronRuntime));

// Extra standalone pages linked from settings sidebar
export const settingsStandaloneLinks: Array<{ label: string; to: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { label: 'إصدارات الأوفلاين 🖥️', to: '/settings/offline-releases', superAdminOnly: true },
  { label: 'إدارة أماكن المخزون المتقدمة', to: '/settings/locations', adminOnly: true },
];


export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
