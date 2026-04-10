export type InventorySectionKey = 'overview' | 'transfers' | 'counts' | 'damaged' | 'movements';

export const inventorySections: Array<{ key: InventorySectionKey; label: string; description: string }> = [
  { key: 'overview', label: 'نظرة عامة', description: 'ملخص حالة المخزون والإجراءات السريعة وحالة الأصناف.' },
  { key: 'counts', label: 'الجرد', description: 'إنشاء جلسات الجرد ومراجعتها واعتمادها.' },
  { key: 'damaged', label: 'التالف', description: 'مراجعة سجلات الأصناف التالفة وتصديرها وطباعتها.' },
  { key: 'movements', label: 'الحركات', description: 'استعراض سجل حركات المخزون مع البحث والفلترة.' }
];

export function isInventorySection(value: string | undefined): value is InventorySectionKey {
  return inventorySections.some((section) => section.key === value);
}
