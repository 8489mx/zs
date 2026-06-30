import { inventoryApi } from '@/features/inventory/api/inventory.api';
import {
  copyLines,
  exportDamagedExcel as exportDamagedExcelDocument,
  exportInventoryExcel as exportInventoryExcelDocument,
  exportTransfersExcel as exportTransfersExcelDocument,
  exportMovementsExcel as exportMovementsExcelDocument,
  printCountSessions,
  printDamagedRecords,
} from '@/features/inventory/lib/inventory-documents';
import { printTransferDocument, printInventoryStatusReport, printInventoryMovementsReport } from '@/lib/inventory-printing';
import { formatCurrency } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Product, StockCountSession, StockMovementRecord, StockTransfer, AppSettings } from '@/types/domain';

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
  settings?: AppSettings | null;
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
  settings,
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

  const exportInventoryExcel = () => {
    exportInventoryExcelDocument(rows.map((row) => ({
      name: row.name,
      stock: row.stock,
      minStock: row.minStock,
      status: row.status,
      costPrice: canViewSensitivePricing ? row.costPrice : undefined,
      retailPrice: row.retailPrice,
      wholesalePrice: canViewSensitivePricing ? row.wholesalePrice : undefined,
    })));
  };

  const exportTransfersExcel = async () => exportTransfersExcelDocument(await inventoryApi.listAllTransfers({ filter: transferFilter }));
  const printInventoryListHandler = () => printInventoryStatusReport(rows, { settings, pageSize: 'a4' });
  const printDamagedRecordsHandler = async () => printDamagedRecords(await inventoryApi.listAllDamagedStock());
  const exportDamagedExcelHandler = async () => exportDamagedExcelDocument(await inventoryApi.listAllDamagedStock());
  const exportMovementsExcelHandler = async () => {
    let page = 1;
    let allMovements: StockMovementRecord[] = [];
    let totalPages = 1;
    do {
      const response = await inventoryApi.stockMovementsPage({ page, pageSize: 100 });
      allMovements = allMovements.concat(response.rows);
      totalPages = response.pagination?.totalPages || 1;
      page++;
    } while (page <= totalPages);
    exportMovementsExcelDocument(allMovements);
  };
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

  const printMovementsHandler = async () => {
    let page = 1;
    let allMovements: StockMovementRecord[] = [];
    let totalPages = 1;
    do {
      const response = await inventoryApi.stockMovementsPage({ page, pageSize: 100 });
      allMovements = allMovements.concat(response.rows);
      totalPages = response.pagination?.totalPages || 1;
      page++;
    } while (page <= totalPages);
    printInventoryMovementsReport(allMovements, { settings, pageSize: 'a4' });
  };

  const sectionExportHandler = currentSection === 'transfers' ? exportTransfersExcel : currentSection === 'damaged' ? exportDamagedExcelHandler : currentSection === 'movements' ? exportMovementsExcelHandler : exportInventoryExcel;
  const sectionPrintHandler = currentSection === 'transfers'
    ? (() => selectedTransfer && printTransferDocument(selectedTransfer, { pageSize: 'a4', settings }))
    : currentSection === 'counts'
      ? printCountSessionsHandler
      : currentSection === 'damaged'
        ? printDamagedRecordsHandler
        : currentSection === 'movements'
          ? printMovementsHandler
          : printInventoryListHandler;

  return {
    copyInventorySummary,
    exportTransfersExcel,
    printCountSessionsHandler,
    printDamagedRecordsHandler,
    exportDamagedExcelHandler,
    exportMovementsExcelHandler,
    copyTransferDetails,
    copySessionDetails,
    sectionExportHandler,
    sectionPrintHandler,
  };
}
