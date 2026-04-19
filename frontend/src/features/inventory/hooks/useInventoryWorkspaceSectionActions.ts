import { inventoryApi } from '@/features/inventory/api/inventory.api';
import {
  copyLines,
  exportDamagedCsv as exportDamagedCsvDocument,
  exportInventoryCsv as exportInventoryCsvDocument,
  exportTransfersCsv as exportTransfersCsvDocument,
  printCountSessions,
  printDamagedRecords,
  printInventoryList,
  printTransferDocument,
} from '@/features/inventory/lib/inventory-documents';
import { formatCurrency } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Product, StockCountSession, StockMovementRecord, StockTransfer } from '@/types/domain';

interface InventoryWorkspaceSectionActionsParams {
  currentSection: string;
  rows: Product[];
  inventory: { total: number; outOfStock: Array<unknown>; lowStock: Array<unknown>; inventoryValue: number | null };
  transferSummary: { totalItems: number };
  stockCountSummary: { totalItems: number };
  damagedSummary: { totalItems: number };
  stockMovements: StockMovementRecord[];
  selectedTransfer: StockTransfer | null;
  selectedTransferTotals: { itemsCount: number; totalQty: number };
  selectedSession: StockCountSession | null;
  selectedSessionTotals: { itemsCount: number; expectedQty: number; countedQty: number; varianceQty: number };
  transferFilter: string;
  sessionFilter: string;
  setCopyFeedback: (value: { kind: 'success' | 'error'; text: string } | null) => void;
  canViewSensitivePricing: boolean;
}

export function createInventoryWorkspaceSectionActions({
  currentSection,
  rows,
  inventory,
  transferSummary,
  stockCountSummary,
  damagedSummary,
  stockMovements,
  selectedTransfer,
  selectedTransferTotals,
  selectedSession,
  selectedSessionTotals,
  transferFilter,
  sessionFilter,
  setCopyFeedback,
  canViewSensitivePricing,
}: InventoryWorkspaceSectionActionsParams) {
  async function copyInventorySummary() {
    await copyLines([
      'ملخص المخزون',
      `إجمالي الأصناف: ${inventory.total}`,
      `نافد المخزون: ${inventory.outOfStock.length}`,
      `منخفض المخزون: ${inventory.lowStock.length}`,
      `قيمة المخزون: ${inventory.inventoryValue == null ? 'بحسب الصلاحية' : formatCurrency(inventory.inventoryValue)}`,
      ...(SINGLE_STORE_MODE ? [] : [`تحويلات مطابقة: ${transferSummary.totalItems}`]),
      `جلسات جرد مطابقة: ${stockCountSummary.totalItems}`,
      `سجلات تالف مطابقة: ${damagedSummary.totalItems}`,
      `حركات المخزون: ${stockMovements.length}`,
    ], 'تم نسخ ملخص المخزون.', setCopyFeedback);
  }

  const exportInventoryCsv = () => {
    exportInventoryCsvDocument(rows.map((row) => ({
      name: row.name,
      stock: row.stock,
      minStock: row.minStock,
      status: row.status,
      costPrice: canViewSensitivePricing ? row.costPrice : undefined,
      retailPrice: row.retailPrice,
      wholesalePrice: canViewSensitivePricing ? row.wholesalePrice : undefined,
    })));
  };

  const exportTransfersCsv = async () => exportTransfersCsvDocument(await inventoryApi.listAllTransfers({ filter: transferFilter }));
  const printInventoryListHandler = () => printInventoryList(rows);
  const printDamagedRecordsHandler = async () => printDamagedRecords(await inventoryApi.listAllDamagedStock());
  const exportDamagedCsvHandler = async () => exportDamagedCsvDocument(await inventoryApi.listAllDamagedStock());
  const printCountSessionsHandler = async () => printCountSessions(await inventoryApi.listAllStockCountSessions({ filter: sessionFilter }));

  const copyTransferDetails = async () => {
    if (!selectedTransfer) return;
    await copyLines([
      `تحويل: ${selectedTransfer.docNo || selectedTransfer.id}`,
      `من: ${selectedTransfer.fromLocationName || '—'}`,
      `إلى: ${selectedTransfer.toLocationName || '—'}`,
      `الحالة: ${selectedTransfer.status || '—'}`,
      `عدد البنود: ${selectedTransferTotals.itemsCount}`,
      `إجمالي الكميات: ${selectedTransferTotals.totalQty}`,
      `ملاحظات: ${selectedTransfer.note || '—'}`,
    ], 'تم نسخ تفاصيل التحويل.', setCopyFeedback);
  };

  const copySessionDetails = async () => {
    if (!selectedSession) return;
    await copyLines([
      `جلسة الجرد: ${selectedSession.docNo || selectedSession.id}`,
      `المخزن: ${selectedSession.locationName || '—'}`,
      `الحالة: ${selectedSession.status || '—'}`,
      `عدد البنود: ${selectedSessionTotals.itemsCount}`,
      `الإجمالي المتوقع: ${selectedSessionTotals.expectedQty}`,
      `الإجمالي المعدود: ${selectedSessionTotals.countedQty}`,
      `الفرق الكلي: ${selectedSessionTotals.varianceQty}`,
      `ملاحظات: ${selectedSession.note || '—'}`,
    ], 'تم نسخ تفاصيل جلسة الجرد.', setCopyFeedback);
  };

  const sectionExportHandler = currentSection === 'transfers' ? exportTransfersCsv : currentSection === 'damaged' ? exportDamagedCsvHandler : exportInventoryCsv;
  const sectionPrintHandler = currentSection === 'transfers'
    ? (() => selectedTransfer && printTransferDocument(selectedTransfer))
    : currentSection === 'counts'
      ? printCountSessionsHandler
      : currentSection === 'damaged'
        ? printDamagedRecordsHandler
        : currentSection === 'movements'
          ? (() => undefined)
          : printInventoryListHandler;

  return {
    copyInventorySummary,
    exportTransfersCsv,
    printCountSessionsHandler,
    printDamagedRecordsHandler,
    exportDamagedCsvHandler,
    copyTransferDetails,
    copySessionDetails,
    sectionExportHandler,
    sectionPrintHandler,
  };
}
