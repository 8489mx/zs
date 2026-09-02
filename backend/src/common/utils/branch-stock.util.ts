/**
 * Normalizes and formats the default stock location name for a given branch name.
 * Examples:
 * - "التعاونيات" -> "رصيد فرع التعاونيات"
 * - "فرع الجيزة" -> "رصيد فرع الجيزة"
 * - "الفرع الرئيسي" -> "رصيد الفرع الرئيسي"
 * - "رصيد فرع المعادي" -> "رصيد فرع المعادي"
 */
export function formatBranchStockLocationName(branchName: string): string {
  const clean = String(branchName || '').trim();
  if (!clean) return 'رصيد الفرع';
  if (clean.startsWith('رصيد فرع ') || clean.startsWith('رصيد الفرع')) {
    return clean;
  }
  if (clean.startsWith('مخزون فرع ') || clean.startsWith('مخزون الفرع')) {
    return clean.replace(/^مخزون/, 'رصيد');
  }
  if (clean.startsWith('فرع ')) {
    return `رصيد ${clean}`;
  }
  if (clean === 'الفرع الرئيسي') {
    return 'رصيد الفرع الرئيسي';
  }
  return `رصيد فرع ${clean}`;
}
