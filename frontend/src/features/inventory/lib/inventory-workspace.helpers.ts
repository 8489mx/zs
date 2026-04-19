import type { InventorySectionKey } from '@/features/inventory/pages/inventory.page-config';
import type { StockCountSession, StockTransfer } from '@/types/domain';

export function selectInventoryTransfer(transfers: StockTransfer[], selectedTransferId: string) {
  return transfers.find((transfer) => String(transfer.id) === String(selectedTransferId)) || transfers[0] || null;
}

export function selectInventorySession(sessions: StockCountSession[], selectedSessionId: string) {
  return sessions.find((session) => String(session.id) === String(selectedSessionId)) || sessions[0] || null;
}

export function getSelectedTransferTotals(selectedTransfer: StockTransfer | null) {
  const items = selectedTransfer?.items || [];
  return {
    itemsCount: items.length,
    totalQty: items.reduce((sum: number, item: { qty?: number }) => sum + Number(item.qty || 0), 0)
  };
}

export function getSelectedSessionTotals(selectedSession: StockCountSession | null) {
  const items = selectedSession?.items || [];
  return {
    itemsCount: items.length,
    expectedQty: items.reduce((sum: number, item: { expectedQty?: number }) => sum + Number(item.expectedQty || 0), 0),
    countedQty: items.reduce((sum: number, item: { countedQty?: number }) => sum + Number(item.countedQty || 0), 0),
    varianceQty: Number(items.reduce((sum: number, item: { varianceQty?: number }) => sum + Number(item.varianceQty || 0), 0).toFixed(3))
  };
}

export function getInventorySectionDescription(currentSection: InventorySectionKey) {
  if (currentSection === 'overview') return 'راقب حالة الأصناف، ثم نفذ التسويات أو التالف من نفس الصفحة بدون دوران.';
  if (currentSection === 'transfers') return 'تابع التحويلات بين المخازن: أنشئ، راقب، ثم استلم أو ألغِ من نفس المسار.';
  if (currentSection === 'counts') return 'أنشئ جلسات الجرد وراجع الفروقات واعتمد النشر من شاشة واحدة.';
  if (currentSection === 'damaged') return 'راجع سجل التالف واطبع أو صدر السجلات التي تحتاج متابعة.';
  return 'سجل واحد لكل حركات المخزون حتى تعرف ماذا تغير ومتى.';
}

export function buildInventorySectionSpotlightCards(params: {
  currentSection: InventorySectionKey;
  inventory: { total: number; outOfStock: unknown[]; lowStock: unknown[] };
  pendingTransfers: number;
  transferSummary: { totalItems: number };
  selectedTransfer: StockTransfer | null;
  stockCountSummary: { draft?: number; posted?: number; totalVariance?: number; totalItems: number };
  damagedSummary: { totalItems: number; totalQty: number };
  damagedRecordsLength: number;
  stockMovementsLength: number;
}) {
  const { currentSection, inventory, pendingTransfers, transferSummary, selectedTransfer, stockCountSummary, damagedSummary, damagedRecordsLength, stockMovementsLength } = params;
  if (currentSection === 'overview') {
    return [
      { key: 'total', label: 'إجمالي الأصناف', value: `${inventory.total}` },
      { key: 'out', label: 'نافد المخزون', value: `${inventory.outOfStock.length}` },
      { key: 'low', label: 'منخفض المخزون', value: `${inventory.lowStock.length}` },
      { key: 'action', label: 'الأولوية الآن', value: inventory.outOfStock.length ? 'راجع الأصناف النافدة أولًا' : inventory.lowStock.length ? 'ابدأ بالأصناف منخفضة المخزون' : 'الوضع الحالي مستقر' },
    ];
  }
  if (currentSection === 'transfers') {
    return [
      { key: 'pending', label: 'تحويلات بانتظار الاستلام', value: `${pendingTransfers}` },
      { key: 'all', label: 'إجمالي التحويلات المطابقة', value: `${transferSummary.totalItems}` },
      { key: 'selected', label: 'التحويل المحدد', value: selectedTransfer ? (selectedTransfer.docNo || selectedTransfer.id) : 'اختر تحويلًا من الجدول' },
      { key: 'action', label: 'الأولوية الآن', value: pendingTransfers ? 'راجع التحويلات المرسلة غير المستلمة' : 'لا توجد تحويلات معلقة' },
    ];
  }
  if (currentSection === 'counts') {
    return [
      { key: 'draft', label: 'جلسات مسودة', value: `${stockCountSummary.draft || 0}` },
      { key: 'posted', label: 'جلسات منشورة', value: `${stockCountSummary.posted || 0}` },
      { key: 'variance', label: 'إجمالي الفروقات', value: `${stockCountSummary.totalVariance || 0}` },
      { key: 'action', label: 'الأولوية الآن', value: stockCountSummary.draft ? 'راجع جلسات المسودة قبل النشر' : 'الجلسات الحالية منشورة أو لا توجد نتائج' },
    ];
  }
  if (currentSection === 'damaged') {
    return [
      { key: 'records', label: 'سجلات التالف', value: `${damagedSummary.totalItems}` },
      { key: 'qty', label: 'إجمالي الكمية التالفة', value: `${damagedSummary.totalQty}` },
      { key: 'page', label: 'المعروض الآن', value: `${damagedRecordsLength}` },
      { key: 'action', label: 'الأولوية الآن', value: damagedSummary.totalItems ? 'راجع أسباب التالف واطبع السجل عند الحاجة' : 'لا توجد سجلات تالفة في هذا النطاق' },
    ];
  }
  return [
    { key: 'moves', label: 'حركات المخزون', value: `${stockMovementsLength}` },
    { key: 'draft', label: 'جلسات الجرد', value: `${stockCountSummary.totalItems}` },
    { key: 'transfers', label: 'التحويلات', value: `${transferSummary.totalItems}` },
    { key: 'action', label: 'الأولوية الآن', value: stockMovementsLength ? 'استخدم السجل لتتبع آخر التعديلات' : 'لا توجد حركات بعد' },
  ];
}
