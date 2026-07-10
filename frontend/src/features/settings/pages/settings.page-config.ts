export type SettingsSectionKey = 'overview' | 'core' | 'reference' | 'backup' | 'users' | 'offline-releases' | 'system-updates';

export const settingsSections: Array<{ key: SettingsSectionKey; label: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { key: 'overview', label: 'ملخص سريع' },
  { key: 'core', label: 'بيانات النشاط' },
  { key: 'reference', label: 'أماكن المخزون' },
  { key: 'users', label: 'المستخدمون والصلاحيات', adminOnly: true },
  { key: 'system-updates', label: 'الإصدارات والتحديثات', offlineOnly: true },
  { key: 'backup', label: 'النسخ والاستيراد' },
  { key: 'offline-releases', label: 'إصدارات الأوفلاين 🖥️', superAdminOnly: true }
];

// Extra standalone pages linked from settings sidebar
export const settingsStandaloneLinks: Array<{ label: string; to: string; adminOnly?: boolean; superAdminOnly?: boolean; offlineOnly?: boolean }> = [
  { label: 'إصدارات الأوفلاين 🖥️', to: '/settings/offline-releases', superAdminOnly: true },
  { label: 'إدارة أماكن المخزون المتقدمة', to: '/settings/locations', adminOnly: true },
];


export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
