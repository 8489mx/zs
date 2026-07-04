export type SettingsSectionKey = 'overview' | 'core' | 'reference' | 'backup' | 'users' | 'offline-releases';

export const settingsSections: Array<{ key: SettingsSectionKey; label: string; adminOnly?: boolean }> = [
  { key: 'overview', label: 'ملخص سريع' },
  { key: 'core', label: 'بيانات النشاط' },
  { key: 'reference', label: 'المخازن' },
  { key: 'users', label: 'المستخدمون والصلاحيات', adminOnly: true },
  { key: 'backup', label: 'النسخ والاستيراد' },
  { key: 'offline-releases', label: 'إصدارات الأوفلاين 🖥️', adminOnly: true }
];

// Extra standalone pages linked from settings sidebar
export const settingsStandaloneLinks: Array<{ label: string; to: string; adminOnly?: boolean }> = [
  { label: 'إصدارات الأوفلاين 🖥️', to: '/settings/offline-releases', adminOnly: true },
  { label: 'إدارة المخازن المتقدمة', to: '/settings/locations', adminOnly: true },
];


export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
