export type InventorySectionKey = 'overview' | 'transfers' | 'counts' | 'damaged' | 'movements';

export const inventorySections: Array<{ key: InventorySectionKey; label: string; shortLabel?: string; description: string }> = [
  { key: 'overview', label: 'نظرة عامة', shortLabel: 'ابدأ من هنا', description: 'ملخص حالة المخزون، التنبيهات، والإجراءات السريعة اليومية.' },
  { key: 'transfers', label: 'التحويلات', shortLabel: 'نقل بين المخازن', description: 'إنشاء التحويلات بين المخازن ومتابعة الاستلام أو الإلغاء.' },
  { key: 'counts', label: 'الجرد', shortLabel: 'جلسات الجرد', description: 'إنشاء جلسات الجرد ومراجعتها واعتمادها.' },
  { key: 'damaged', label: 'التالف', shortLabel: 'الأصناف التالفة', description: 'مراجعة سجلات الأصناف التالفة وتصديرها وطباعتها.' },
  { key: 'movements', label: 'الحركات', shortLabel: 'سجل الحركات', description: 'استعراض سجل حركات المخزون مع البحث والفلترة.' }
];

export function isInventorySection(value: string | undefined): value is InventorySectionKey {
  return inventorySections.some((section) => section.key === value);
}
