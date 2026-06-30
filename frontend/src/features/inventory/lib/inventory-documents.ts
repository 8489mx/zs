import type { Product, StockCountSession, StockTransfer, StockMovementRecord } from '@/types/domain';
import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';

export function findProduct(products: Product[], productId: string) {
  return products.find((product) => String(product.id) === String(productId));
}

export async function copyLines(lines: string[], successMessage: string, onResult: (result: { kind: 'success' | 'error'; text: string }) => void) {
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    onResult({ kind: 'success', text: successMessage });
  } catch {
    onResult({ kind: 'error', text: 'تعذر النسخ إلى الحافظة. يمكنك المحاولة مرة أخرى.' });
  }
}

export interface StockCountSheetRow {
  code?: string;
  barcode?: string;
  name: string;
  category?: string;
  expectedQty?: number | string;
  countedQty?: number | string;
  note?: string;
}

export function printStockCountSheet(rows: StockCountSheetRow[], options: { title?: string; locationName?: string; includeExpectedQty?: boolean }) {
  if (!rows.length) return;
  const includeExpected = Boolean(options.includeExpectedQty);
  printHtmlDocument(options.title || 'شيت عد الجرد', `
    <h1>${escapeHtml(options.title || 'شيت عد الجرد')}</h1>
    <div class="meta">المخزن: ${escapeHtml(options.locationName || '—')} · تاريخ الطباعة: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    <table>
      <thead>
        <tr>
          <th>كود الصنف</th>
          <th>الباركود</th>
          <th>الصنف</th>
          <th>القسم</th>
          ${includeExpected ? '<th>كمية النظام</th>' : ''}
          <th>الكمية الفعلية</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>${rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.code || '—')}</td>
          <td>${escapeHtml(row.barcode || '—')}</td>
          <td>${escapeHtml(row.name || '—')}</td>
          <td>${escapeHtml(row.category || '—')}</td>
          ${includeExpected ? `<td>${escapeHtml(String(row.expectedQty ?? ''))}</td>` : ''}
          <td>${escapeHtml(String(row.countedQty ?? ''))}</td>
          <td>${escapeHtml(row.note || '')}</td>
        </tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div>عدد الأصناف في الشيت: ${rows.length}</div>
      <div>توقيع القائم بالعد: ____________________</div>
      <div>توقيع المراجع: ____________________</div>
    </div>
  `);
}

export function exportStockCountSheetExcel(rows: StockCountSheetRow[], options: { includeExpectedQty?: boolean }) {
  if (!rows.length) return;
  const includeExpected = Boolean(options.includeExpectedQty);
  const headers = includeExpected
    ? ['كود', 'باركود', 'الصنف', 'القسم', 'كمية النظام', 'الكمية الفعلية', 'ملاحظات']
    : ['كود', 'باركود', 'الصنف', 'القسم', 'الكمية الفعلية', 'ملاحظات'];
  downloadExcelFile('stock-count-sheet.xlsx', headers, rows.map((row) => includeExpected
    ? [row.code || '', row.barcode || '', row.name, row.category || '', row.expectedQty ?? '', row.countedQty ?? '', row.note || '']
    : [row.code || '', row.barcode || '', row.name, row.category || '', row.countedQty ?? '', row.note || '']));
}

// printTransferDocument is now in @/lib/inventory-printing

export function printStockCountDocument(session: StockCountSession) {
  const items = session.items || [];
  const totalVariance = items.reduce((sum, item) => sum + Number(item.varianceQty || 0), 0);
  printHtmlDocument(`جلسة جرد ${session.docNo || session.id}`, `
    <div class="meta">المخزن: ${escapeHtml(session.locationName || '—')} · الحالة: ${escapeHtml(session.status || '—')} · التاريخ: ${escapeHtml(formatDate(session.createdAt || ''))}</div>
    <table>
      <thead><tr><th>الصنف</th><th>المتوقع</th><th>المعدود</th><th>الفرق</th><th>السبب</th></tr></thead>
      <tbody>${items.map((item) => `<tr><td>${escapeHtml(item.productName || '—')}</td><td>${escapeHtml(String(item.expectedQty || 0))}</td><td>${escapeHtml(String(item.countedQty || 0))}</td><td>${escapeHtml(String(item.varianceQty || 0))}</td><td>${escapeHtml(item.reason || '—')}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div>عدد البنود: ${items.length}</div>
      <div>إجمالي الفرق: ${totalVariance.toFixed(3)}</div>
      <div>تم العد بواسطة: ${escapeHtml(session.countedBy || '—')}</div>
      <div>اعتمده: ${escapeHtml(session.approvedBy || '—')}</div>
      <div>ملاحظات: ${escapeHtml(session.note || '—')}</div>
    </div>
  `);
}

export function exportInventoryExcel(rows: Array<{ name: string; stock: number; minStock?: number; status?: string; costPrice?: number; retailPrice?: number; wholesalePrice?: number }>) {
  downloadExcelFile('inventory-register.xlsx', ['الصنف', 'الرصيد', 'الحد الأدنى', 'الحالة', 'سعر التكلفة', 'سعر القطاعي', 'سعر الجملة'], rows.map((row) => [row.name, row.stock, row.minStock, row.status, row.costPrice, row.retailPrice, row.wholesalePrice]));
}

export function exportTransfersExcel(transfers: StockTransfer[]) {
  downloadExcelFile('stock-transfers.xlsx', ['رقم المستند', 'من مخزن', 'إلى مخزن', 'الحالة', 'التاريخ', 'الأصناف'], transfers.map((transfer) => [
    transfer.docNo,
    transfer.fromLocationName || '',
    transfer.toLocationName || '',
    transfer.status || '',
    transfer.date || '',
    (transfer.items || []).map((item) => `${item.productName} (${item.qty})`).join(' | ')
  ]));
}

export function printInventoryList(rows: Array<{ name: string; stock: number; minStock?: number; statusLabel?: string; costPrice?: number; retailPrice?: number }>) {
  if (!rows.length) return;
  printHtmlDocument('قائمة المخزون', `
    <h1>قائمة المخزون</h1>
    <table>
      <thead><tr><th>الصنف</th><th>الرصيد</th><th>الحد الأدنى</th><th>الحالة</th><th>تكلفة</th><th>قطاعي</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(String(row.stock))}</td><td>${escapeHtml(String(row.minStock || 0))}</td><td>${escapeHtml(row.statusLabel || '—')}</td><td>${formatCurrency(row.costPrice || 0)}</td><td>${formatCurrency(row.retailPrice || 0)}</td></tr>`).join('')}</tbody>
    </table>
  `);
}

export function printDamagedRecords(damagedRecords: Array<{ productName?: string; qty?: number; reason?: string; createdAt?: string; date?: string }>) {
  if (!damagedRecords.length) return;
  printHtmlDocument('سجل التالف', `
    <h1>سجل التالف</h1>
    <table>
      <thead><tr><th>الصنف</th><th>الكمية</th><th>السبب</th><th>التاريخ</th></tr></thead>
      <tbody>${damagedRecords.map((row) => `<tr><td>${escapeHtml(row.productName || '—')}</td><td>${escapeHtml(String(row.qty || 0))}</td><td>${escapeHtml(row.reason || '—')}</td><td>${escapeHtml(formatDate(row.createdAt || row.date || ''))}</td></tr>`).join('')}</tbody>
    </table>
  `);
}

export function exportDamagedExcel(damagedRecords: Array<{ productName?: string; qty?: number; reason?: string; locationName?: string; createdAt?: string; date?: string }>) {
  downloadExcelFile('damaged-stock.xlsx', ['الصنف', 'الكمية', 'السبب', 'المخزن', 'التاريخ'], damagedRecords.map((row) => [
    row.productName || '',
    row.qty || 0,
    row.reason || '',
    row.locationName || '',
    formatDate(row.createdAt || row.date || '')
  ]));
}

export function printCountSessions(stockCountSessions: StockCountSession[]) {
  if (!stockCountSessions.length) return;
  printHtmlDocument('جلسات الجرد', `
    <h1>جلسات الجرد</h1>
    <table>
      <thead><tr><th>رقم المستند</th><th>المخزن</th><th>الحالة</th><th>التاريخ</th><th>عدد البنود</th><th>ملاحظة</th></tr></thead>
      <tbody>${stockCountSessions.map((session) => `<tr><td>${escapeHtml(session.docNo || '—')}</td><td>${escapeHtml(session.locationName || '—')}</td><td>${escapeHtml(session.status || '—')}</td><td>${escapeHtml(formatDate(session.createdAt || ''))}</td><td>${escapeHtml(String((session.items || []).length))}</td><td>${escapeHtml(session.note || '—')}</td></tr>`).join('')}</tbody>
    </table>
  `);
}

export function exportMovementsExcel(movements: StockMovementRecord[]) {
  downloadExcelFile('stock-movements.xlsx', ['الصنف', 'المخزن', 'الكمية', 'رصيد قبل', 'رصيد بعد', 'النوع', 'السبب', 'رقم المرجع', 'التاريخ'], movements.map((movement) => [
    movement.productName || '',
    movement.locationName || '',
    movement.qty || 0,
    movement.beforeQty || 0,
    movement.afterQty || 0,
    movement.type || '',
    movement.reason || '',
    movement.referenceId ? `${movement.referenceType || ''}-${movement.referenceId}` : '',
    formatDate(movement.date || '')
  ]));
}