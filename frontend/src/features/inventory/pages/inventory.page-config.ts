export type InventorySectionKey = 'overview' | 'transfers' | 'counts' | 'damaged' | 'movements';

export const inventorySections: Array<{ key: InventorySectionKey; label: string; shortLabel?: string; description: string }> = [
  { key: 'overview', label: 'نظرة عامة', shortLabel: 'ابدأ من هنا', description: 'ملخص وتنبيهات المخزون اليومية' },
  { key: 'transfers', label: 'أذونات الصرف', shortLabel: 'صرف ونقل بضاعة', description: 'التحويلات والصرف بين المخازن' },
  { key: 'counts', label: 'الجرد', shortLabel: 'جلسات الجرد', description: 'جلسات الجرد ومطابقة الأرصدة' },
  { key: 'damaged', label: 'التالف', shortLabel: 'الأصناف التالفة', description: 'سجلات الهالك والأصناف التالفة' },
  { key: 'movements', label: 'الحركات', shortLabel: 'سجل الحركات', description: 'تتبع كامل لعمليات وحركات الأصناف' }
];

export function isInventorySection(value: string | undefined): value is InventorySectionKey {
  return inventorySections.some((section) => section.key === value);
}
