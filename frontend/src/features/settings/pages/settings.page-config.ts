export type SettingsSectionKey = 'overview' | 'core' | 'reference' | 'backup' | 'users';

export const settingsSections: Array<{ key: SettingsSectionKey; label: string; adminOnly?: boolean }> = [
  { key: 'overview', label: 'ملخص سريع' },
  { key: 'core', label: 'بيانات المتجر' },
  { key: 'reference', label: 'المخزن والمواقع' },
  { key: 'users', label: 'المستخدمون والصلاحيات', adminOnly: true },
  { key: 'backup', label: 'النسخ والاستيراد' }
];

export function isSettingsSection(value: string | undefined): value is SettingsSectionKey {
  return settingsSections.some((section) => section.key === value);
}
