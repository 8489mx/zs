set -e
cd /tmp/zsysv12

mkdir -p frontend/src/types/domain frontend/src/lib/browser src/transaction-query-service src/report-routes

cat > frontend/src/types/domain/catalog.ts <<'EOF'
export interface ProductUnit {
  id: string;
  name: string;
  multiplier: number;
  barcode: string;
  isBaseUnit: boolean;
  isSaleUnit: boolean;
  isPurchaseUnit: boolean;
}

export interface ProductOffer {
  id?: string;
  type: 'percent' | 'fixed';
  value: number;
  from?: string | null;
  to?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProductCustomerPrice {
  customerId: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  supplierId: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  notes: string;
  units: ProductUnit[];
  offers?: ProductOffer[];
  customerPrices?: ProductCustomerPrice[];
  status?: string;
  statusLabel?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
  type: string;
  creditLimit: number;
  storeCreditBalance: number;
}
EOF

cat > frontend/src/types/domain/transactions.ts <<'EOF'
export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  unitName: string;
  unitMultiplier: number;
  cost: number;
  priceType: string;
}

export interface SalePayment {
  id?: string;
  paymentChannel: string;
  amount: number;
}

export interface Sale {
  id: string;
  docNo: string;
  customerId: string;
  customerName: string;
  paymentType: string;
  paymentChannel: string;
  subTotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  pricesIncludeTax: boolean;
  total: number;
  paidAmount: number;
  payments?: SalePayment[];
  status: string;
  note: string;
  createdBy: string;
  branchId: string;
  branchName: string;
  locationId: string;
  locationName: string;
  date: string;
  items: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  cost: number;
  total: number;
  unitName: string;
  unitMultiplier: number;
}

export interface Purchase {
  id: string;
  docNo: string;
  supplierId: string;
  supplierName: string;
  paymentType: string;
  subTotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  pricesIncludeTax: boolean;
  total: number;
  note: string;
  status: string;
  createdBy: string;
  branchId: string;
  branchName: string;
  locationId: string;
  locationName: string;
  date: string;
  items: PurchaseItem[];
}

export interface ReturnRecord {
  id: string;
  docNo: string;
  returnType?: string;
  type?: string;
  invoiceId?: string;
  productId?: string;
  productName: string;
  qty: number;
  total: number;
  note: string;
  createdAt?: string;
  date?: string;
  settlementMode?: string;
  refundMethod?: string;
}

export interface TreasuryTransaction {
  id: string;
  txnType: string;
  type?: string;
  amount: number;
  note: string;
  referenceType?: string;
  referenceId?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  createdAt: string;
  date?: string;
  createdByName?: string;
}

export interface ServiceRecord {
  id: string;
  name: string;
  amount: number;
  notes: string;
  serviceDate: string;
  createdByName?: string;
}

export interface CashierShift {
  id: string;
  docNo: string;
  status: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number;
  variance: number;
  openingNote?: string;
  closeNote?: string;
  note?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  openedById?: string;
  createdAt: string;
  closedAt?: string;
  openedByName?: string;
  closedByName?: string;
}
EOF

cat > frontend/src/types/domain/reporting.ts <<'EOF'
export interface AuditLog {
  id: string;
  action: string;
  details: string;
  detailsSummary?: string;
  createdAt: string;
  created_at?: string;
  createdByName?: string;
  createdBy?: string;
}

export interface ReportSummary {
  sales: {
    count: number;
    total: number;
    netSales: number;
  };
  purchases: {
    count: number;
    total: number;
    netPurchases: number;
  };
  expenses: {
    count: number;
    total: number;
  };
  returns: {
    count: number;
    total: number;
    salesTotal?: number;
    purchasesTotal?: number;
  };
  treasury: {
    cashIn: number;
    cashOut: number;
    net: number;
  };
  commercial: {
    grossProfit: number;
    grossMarginPercent: number;
    netOperatingProfit: number;
    cogs?: number;
    informationalOnlyPurchasesInPeriod?: number;
  };
  topProducts?: Array<{
    name: string;
    qty: number;
    revenue: number;
  }>;
}
EOF

cat > frontend/src/types/domain/users.ts <<'EOF'
export interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface Location {
  id: string;
  branchId: string;
  name: string;
  code?: string;
  isActive?: boolean;
}
EOF

cat > frontend/src/types/domain/index.ts <<'EOF'
export * from './catalog';
export * from './transactions';
export * from './reporting';
export * from './users';
EOF

# Build barrel from old file by extracting tail types to avoid accidental omissions
python3 - <<'PY'
from pathlib import Path
p = Path('frontend/src/types/domain.ts')
text = p.read_text()
# keep compatibility: re-export from split modules, then append any remaining declarations not migrated
markers = ['export interface ProductUnit', 'export interface ProductOffer', 'export interface ProductCustomerPrice', 'export interface Product', 'export interface Category', 'export interface Supplier', 'export interface Customer', 'export interface SaleItem', 'export interface SalePayment', 'export interface Sale', 'export interface PurchaseItem', 'export interface Purchase', 'export interface ReturnRecord', 'export interface TreasuryTransaction', 'export interface ServiceRecord', 'export interface AuditLog', 'export interface CashierShift', 'export interface ReportSummary']
for m in markers:
    while m in text:
        start = text.index(m)
        # find next export interface or export type after start+1
        rest = text[start+1:]
        import re
        found = [m2.start()+start+1 for m2 in re.finditer(r'\nexport (interface|type) ', rest)]
        end = min(found) if found else len(text)
        text = text[:start] + text[end:]
compat = "export * from './domain';\n\n" + text.strip() + "\n"
p.write_text(compat)
PY

cat > frontend/src/lib/browser/escape.ts <<'EOF'
export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
EOF

cat > frontend/src/lib/browser/download.ts <<'EOF'
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csvEscape = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}
EOF

cat > frontend/src/lib/browser/csv.ts <<'EOF'
export function parseCsvRows(text: string) {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((header) => header.trim());
  return lines.slice(1)
    .map((line) => {
      const values = parseLine(line);
      return headers.reduce<Record<string, string>>((acc, header, index) => {
        if (header) acc[header] = values[index] ?? '';
        return acc;
      }, {});
    })
    .filter((row) => Object.values(row).some((value) => String(value || '').trim()));
}
EOF

cat > frontend/src/lib/browser/print.ts <<'EOF'
import { escapeHtml } from './escape';

function looksLikeHtmlFragment(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('<!doctype')
    || normalized.startsWith('<html')
    || normalized.startsWith('<body')
    || normalized.startsWith('<style')
    || normalized.startsWith('<section')
    || normalized.startsWith('<div')
    || normalized.startsWith('<table')
    || normalized.startsWith('<h1')
    || normalized.startsWith('<h2')
    || normalized.startsWith('<h3');
}

export interface PrintDocumentOptions {
  subtitle?: string;
  footerHtml?: string;
  extraStyles?: string;
  pageSize?: 'auto' | 'A4' | 'receipt';
  orientation?: 'portrait' | 'landscape';
  printDelayMs?: number;
  autoClose?: boolean;
  documentDirection?: 'rtl' | 'ltr';
}

export function printHtmlDocument(titleOrBody: string, bodyOrTitle: string, options: PrintDocumentOptions = {}) {
  let title = String(titleOrBody || 'مستند للطباعة').trim() || 'مستند للطباعة';
  let bodyHtml = String(bodyOrTitle || '').trim();

  if (looksLikeHtmlFragment(titleOrBody) && !looksLikeHtmlFragment(bodyOrTitle)) {
    title = String(bodyOrTitle || 'مستند للطباعة').trim() || 'مستند للطباعة';
    bodyHtml = String(titleOrBody || '').trim();
  }

  const {
    subtitle = '',
    footerHtml = '',
    extraStyles = '',
    pageSize = 'auto',
    orientation = 'portrait',
    printDelayMs = 160,
    autoClose = false,
    documentDirection = 'rtl',
  } = options;

  const printedAt = new Date().toLocaleString('ar-EG');
  const printWindow = window.open('', '_blank', 'width=1120,height=820');
  if (!printWindow) throw new Error('المتصفح منع نافذة الطباعة');

  const pageRule = pageSize === 'A4'
    ? orientation === 'landscape'
      ? '@page { size: A4 landscape; margin: 12mm; }'
      : '@page { size: A4 portrait; margin: 12mm; }'
    : pageSize === 'receipt'
      ? '@page { size: 80mm auto; margin: 4mm; }'
      : '@page { size: auto; margin: 12mm; }';

  const html = `<!doctype html>
  <html lang="ar" dir="${documentDirection}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>${pageRule}${extraStyles}</style>
    </head>
    <body>
      <div class="print-shell">
        <div class="print-header">
          <div class="print-title-wrap">
            <h1 class="print-title">${escapeHtml(title)}</h1>
            ${subtitle ? `<div class="print-subtitle">${escapeHtml(subtitle)}</div>` : ''}
          </div>
          <div class="print-meta-chip">${escapeHtml(printedAt)}</div>
        </div>
        <div class="print-content">${bodyHtml}</div>
        ${footerHtml ? `<div class="print-footer">${footerHtml}</div>` : ''}
      </div>
    </body>
  </html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
    if (autoClose) {
      window.setTimeout(() => printWindow.close(), 200);
    }
  }, printDelayMs);
}
EOF

cat > frontend/src/lib/browser.ts <<'EOF'
export { escapeHtml } from './lib/browser/escape';
export { triggerDownload, downloadJsonFile, downloadCsvFile } from './lib/browser/download';
export { parseCsvRows } from './lib/browser/csv';
export { printHtmlDocument } from './lib/browser/print';
export type { PrintDocumentOptions } from './lib/browser/print';
EOF

cat > src/transaction-query-service/paging.js <<'EOF'
function parsePositiveInt(value, fallback, max = 200) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function paginateRows(rows, query, defaults = {}) {
  const page = parsePositiveInt(query.page, defaults.page || 1, 10000);
  const pageSize = parsePositiveInt(query.pageSize, defaults.pageSize || 20, defaults.maxPageSize || 100);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(startIndex, startIndex + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      rangeStart: totalItems ? startIndex + 1 : 0,
      rangeEnd: totalItems ? Math.min(startIndex + pageSize, totalItems) : 0,
    },
  };
}

function makePagedResult(allRows, filteredRows, query, responseKey, defaults, summarizeRows) {
  const hasPagingParams = query.page || query.pageSize || query.search || query.q || query.filter || query.view || query.type;
  if (!hasPagingParams) return { [responseKey]: allRows };
  const { rows, pagination } = paginateRows(filteredRows, query, defaults);
  return { [responseKey]: rows, pagination, summary: summarizeRows(filteredRows) };
}

module.exports = { parsePositiveInt, paginateRows, makePagedResult };
EOF

cat > src/transaction-query-service/returns.js <<'EOF'
const { makePagedResult } = require('./paging');

function filterReturnRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    const returnType = String(row.returnType || row.type || '').toLowerCase();
    if (filter === 'sales' && returnType !== 'sale') return false;
    if (filter === 'purchase' && returnType !== 'purchase') return false;
    if (filter === 'today' && String(row.createdAt || row.date || '').slice(0, 10) !== today) return false;
    if (!search) return true;
    return [row.docNo, row.returnType, row.productName, row.note, row.customerName, row.supplierName]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeReturnRows(rows) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalItems: rows.length,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    salesReturns: rows.filter((row) => String(row.returnType || row.type || '').toLowerCase() === 'sale').length,
    purchaseReturns: rows.filter((row) => String(row.returnType || row.type || '').toLowerCase() === 'purchase').length,
    todayCount: rows.filter((row) => String(row.createdAt || row.date || '').slice(0, 10) === today).length,
    latestDocNo: rows[0] ? rowToDocNo(rows[0]) : '',
  };
}

function rowToDocNo(row) {
  return row.docNo || '';
}

function buildReturnsListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterReturnRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'returns', { pageSize: 20, maxPageSize: 100 }, summarizeReturnRows);
}

module.exports = { buildReturnsListResponse, filterReturnRows, summarizeReturnRows };
EOF

cat > src/transaction-query-service/expenses.js <<'EOF'
const { makePagedResult } = require('./paging');

function filterExpenseRows(rows, query) {
  const search = String(query.search || '').trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => [row.title, row.note, row.branchName, row.locationName, row.createdBy]
    .some((value) => String(value || '').toLowerCase().includes(search)));
}

function summarizeExpenseRows(rows) {
  return {
    totalItems: rows.length,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
  };
}

function buildExpensesListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterExpenseRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'expenses', { pageSize: 20, maxPageSize: 100 }, summarizeExpenseRows);
}

module.exports = { buildExpensesListResponse, filterExpenseRows, summarizeExpenseRows };
EOF

cat > src/transaction-query-service/sales-purchases.js <<'EOF'
const { makePagedResult } = require('./paging');

function filterSalesRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim();
  return rows.filter((row) => {
    if (filter === 'cash' && String(row.paymentType || '') !== 'cash') return false;
    if (filter === 'credit' && String(row.paymentType || '') !== 'credit') return false;
    if (filter === 'cancelled' && String(row.status || '') !== 'cancelled') return false;
    if (!search) return true;
    return [row.docNo, row.customerName, row.status, row.paymentType, row.branchName, row.locationName, row.note]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeSalesRows(rows) {
  const today = new Date().toISOString().slice(0, 10);
  const topByCustomer = new Map();
  rows.forEach((row) => {
    const key = String(row.customerId || row.customerName || 'cash');
    const current = topByCustomer.get(key) || { name: row.customerName || 'عميل نقدي', total: 0, count: 0 };
    current.total += Number(row.total || 0);
    current.count += 1;
    topByCustomer.set(key, current);
  });
  const todayRows = rows.filter((row) => String(row.date || '').slice(0, 10) === today);
  return {
    totalItems: rows.length,
    totalSales: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    todaySalesCount: todayRows.length,
    todaySalesTotal: Number(todayRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cashTotal: Number(rows.filter((row) => String(row.paymentType || '') === 'cash').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    creditTotal: Number(rows.filter((row) => String(row.paymentType || '') === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cancelledCount: rows.filter((row) => String(row.status || '') === 'cancelled').length,
    topCustomers: [...topByCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

function buildSalesListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterSalesRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'sales', { pageSize: 30, maxPageSize: 100 }, summarizeSalesRows);
}

function filterPurchaseRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim();
  return rows.filter((row) => {
    if (filter === 'cash' && String(row.paymentType || '') !== 'cash') return false;
    if (filter === 'credit' && String(row.paymentType || '') !== 'credit') return false;
    if (filter === 'cancelled' && String(row.status || '') !== 'cancelled') return false;
    if (!search) return true;
    return [row.docNo, row.supplierName, row.status, row.paymentType, row.branchName, row.locationName, row.note]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizePurchaseRows(rows) {
  const topBySupplier = new Map();
  rows.forEach((row) => {
    const key = String(row.supplierId || row.supplierName || 'unknown');
    const current = topBySupplier.get(key) || { name: row.supplierName || 'بدون مورد', total: 0, count: 0 };
    current.total += Number(row.total || 0);
    current.count += 1;
    topBySupplier.set(key, current);
  });
  return {
    totalItems: rows.length,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    creditTotal: Number(rows.filter((row) => String(row.paymentType || '') === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cancelledCount: rows.filter((row) => String(row.status || '') === 'cancelled').length,
    posted: rows.filter((row) => String(row.status || '') === 'posted').length,
    draft: rows.filter((row) => String(row.status || '') !== 'posted').length,
    topSuppliers: [...topBySupplier.values()].sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

function buildPurchasesListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterPurchaseRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'purchases', { pageSize: 25, maxPageSize: 100 }, summarizePurchaseRows);
}

module.exports = {
  buildPurchasesListResponse,
  buildSalesListResponse,
  filterPurchaseRows,
  filterSalesRows,
  summarizePurchaseRows,
  summarizeSalesRows,
};
EOF

cat > src/transaction-query-service/shifts.js <<'EOF'
const { makePagedResult } = require('./paging');

function filterCashierShiftRows(rows, query) {
  const search = String(query.search || '').trim().toLowerCase();
  const filter = String(query.filter || 'all').trim();
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    if (filter === 'open' && String(row.status || '') !== 'open') return false;
    if (filter === 'closed' && String(row.status || '') !== 'closed') return false;
    if (filter === 'variance' && Math.abs(Number(row.variance || 0)) <= 0) return false;
    if (filter === 'today' && String(row.createdAt || '').slice(0, 10) !== today) return false;
    if (!search) return true;
    return [row.docNo, row.status, row.openedByName, row.branchName, row.locationName, row.note]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeCashierShiftRows(rows) {
  const openRows = rows.filter((row) => String(row.status || '') === 'open');
  return {
    totalItems: rows.length,
    openShiftCount: openRows.length,
    openShiftDocNo: openRows[0] ? openRows[0].docNo || String(openRows[0].id || '') : '',
    totalVariance: Number(rows.reduce((sum, row) => sum + Number(row.variance || 0), 0).toFixed(2)),
  };
}

function buildCashierShiftsListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterCashierShiftRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'cashierShifts', { pageSize: 20, maxPageSize: 100 }, summarizeCashierShiftRows);
}

module.exports = { buildCashierShiftsListResponse, filterCashierShiftRows, summarizeCashierShiftRows };
EOF

cat > src/transaction-query-service.js <<'EOF'
const { paginateRows } = require('./transaction-query-service/paging');
const { buildReturnsListResponse, filterReturnRows, summarizeReturnRows } = require('./transaction-query-service/returns');
const { buildExpensesListResponse, filterExpenseRows, summarizeExpenseRows } = require('./transaction-query-service/expenses');
const {
  buildPurchasesListResponse,
  buildSalesListResponse,
  filterPurchaseRows,
  filterSalesRows,
  summarizePurchaseRows,
  summarizeSalesRows,
} = require('./transaction-query-service/sales-purchases');
const { buildCashierShiftsListResponse, filterCashierShiftRows, summarizeCashierShiftRows } = require('./transaction-query-service/shifts');

module.exports = {
  paginateRows,
  buildSalesListResponse,
  buildPurchasesListResponse,
  buildCashierShiftsListResponse,
  buildExpensesListResponse,
  buildReturnsListResponse,
  filterCashierShiftRows,
  summarizeCashierShiftRows,
  filterExpenseRows,
  summarizeExpenseRows,
  filterPurchaseRows,
  summarizePurchaseRows,
  filterReturnRows,
  summarizeReturnRows,
  filterSalesRows,
  summarizeSalesRows,
};
EOF

cat > src/report-routes/common.js <<'EOF'
const { respondError } = require('../http/respond');

function sendCsv(res, filename, headers, rows, csvFromRows) {
  const csv = csvFromRows(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
}

function buildScopedRange(parseDateRange, query) {
  return Object.assign({}, parseDateRange(query || {}), {
    branchId: query && query.branchId ? String(query.branchId) : '',
    locationId: query && query.locationId ? String(query.locationId) : '',
  });
}

function withReportError(res, fallbackMessage, callback) {
  try {
    return callback();
  } catch (error) {
    return respondError(res, error, fallbackMessage);
  }
}

module.exports = { sendCsv, buildScopedRange, withReportError };
EOF

cat > src/report-routes/register-summary-routes.js <<'EOF'
const { buildScopedRange, sendCsv, withReportError } = require('./common');

function buildSummaryCsvRows(payload) {
  const summary = payload.summary || {};
  const topProducts = Array.isArray(payload.topProducts) ? payload.topProducts.slice(0, 20) : [];
  const rows = [
    { section: 'summary', metric: 'from', value: payload.range?.from || '' },
    { section: 'summary', metric: 'to', value: payload.range?.to || '' },
    { section: 'summary', metric: 'salesCount', value: summary.salesCount || 0 },
    { section: 'summary', metric: 'salesTotal', value: summary.salesTotal || 0 },
    { section: 'summary', metric: 'purchasesCount', value: summary.purchasesCount || 0 },
    { section: 'summary', metric: 'purchasesTotal', value: summary.purchasesTotal || 0 },
    { section: 'summary', metric: 'expensesTotal', value: summary.expensesTotal || 0 },
    { section: 'summary', metric: 'returnsTotal', value: summary.returnsTotal || 0 },
    { section: 'summary', metric: 'cashIn', value: summary.cashIn || 0 },
    { section: 'summary', metric: 'cashOut', value: summary.cashOut || 0 },
    { section: 'summary', metric: 'netCashFlow', value: summary.netCashFlow || 0 },
    { section: 'summary', metric: 'grossProfit', value: summary.grossProfit || 0 },
    { section: 'summary', metric: 'cogs', value: summary.cogs || 0 },
    { section: 'summary', metric: 'grossMarginPercent', value: summary.grossMarginPercent || 0 },
    { section: 'summary', metric: 'netOperatingProfit', value: summary.netOperatingProfit || 0 },
  ];
  topProducts.forEach((item, index) => rows.push({ section: 'top_product', metric: String(index + 1), value: item.name || '', qty: item.qty || 0, revenue: item.revenue || 0 }));
  return rows;
}

function registerSummaryRoutes({ app, authMiddleware, requirePermission, parseDateRange, buildDashboardOverview, reportSummary, csvFromRows }) {
  app.get('/api/dashboard/overview', authMiddleware, requirePermission('dashboard'), (req, res) => withReportError(res, 'Could not build dashboard overview', () => {
    res.json(buildDashboardOverview(buildScopedRange(parseDateRange, req.query || {})));
  }));

  app.get('/api/reports/summary', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not build summary report', () => {
    res.json(reportSummary(buildScopedRange(parseDateRange, req.query || {})));
  }));

  app.get('/api/reports/summary.csv', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not export summary report', () => {
    const payload = reportSummary(buildScopedRange(parseDateRange, req.query || {}));
    sendCsv(res, 'report-summary.csv', ['section', 'metric', 'value', 'qty', 'revenue'], buildSummaryCsvRows(payload), csvFromRows);
  }));
}

module.exports = { registerSummaryRoutes };
EOF

cat > src/report-routes/register-inventory-routes.js <<'EOF'
const { sendCsv } = require('./common');

function registerInventoryRoutes({ app, authMiddleware, requirePermission, inventoryReport, reportQueryService, csvFromRows }) {
  app.get('/api/reports/inventory', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryInventoryRows(Array.isArray(payload.items) ? payload.items : [], query));
    }
    return res.json(payload);
  });

  app.get('/api/reports/inventory.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const items = Array.isArray(payload.items) ? payload.items : [];
    const rows = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.categoryName || '',
      supplier: item.supplierName || '',
      stockQty: item.stockQty || 0,
      minStock: item.minStock || 0,
      retailPrice: item.retailPrice || 0,
      costPrice: item.costPrice || 0,
      status: item.status || '',
    }));
    sendCsv(res, 'report-inventory.csv', ['id', 'name', 'category', 'supplier', 'stockQty', 'minStock', 'retailPrice', 'costPrice', 'status'], rows, csvFromRows);
  });
}

module.exports = { registerInventoryRoutes };
EOF

cat > src/report-routes/register-ledger-routes.js <<'EOF'
const { sendCsv, withReportError } = require('./common');

function registerLedgerRoutes({ app, authMiddleware, requirePermission, customerBalanceReport, customerLedgerReport, supplierLedgerReport, reportQueryService, csvFromRows }) {
  app.get('/api/reports/customer-balances', authMiddleware, requirePermission('reports'), (req, res) => {
    const rows = customerBalanceReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryCustomerBalanceRows(rows, query));
    }
    return res.json({ customers: rows });
  });

  app.get('/api/reports/customer-balances.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    const rows = customerBalanceReport().map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone || '',
      balance: item.balance || 0,
      creditLimit: item.creditLimit || 0,
      availableCredit: item.availableCredit || 0,
    }));
    sendCsv(res, 'report-customer-balances.csv', ['id', 'name', 'phone', 'balance', 'creditLimit', 'availableCredit'], rows, csvFromRows);
  });

  app.get('/api/reports/customers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not build customer ledger', () => {
    const payload = customerLedgerReport(Number(req.params.id || 0));
    const query = req.query || {};
    if (query.page || query.pageSize || query.search) {
      return res.json({ customer: payload.customer, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
    }
    return res.json(payload);
  }));

  app.get('/api/reports/customers/:id/ledger.csv', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not export customer ledger', () => {
    const payload = customerLedgerReport(Number(req.params.id || 0));
    const rows = (payload.entries || []).map((entry) => ({
      customer: payload.customer?.name || '',
      date: entry.created_at || entry.date || '',
      docNo: entry.doc_no || '',
      entryType: entry.entry_type || '',
      note: entry.note || '',
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      balanceAfter: entry.balance_after || 0,
    }));
    sendCsv(res, `customer-ledger-${req.params.id}.csv`, ['customer', 'date', 'docNo', 'entryType', 'note', 'debit', 'credit', 'balanceAfter'], rows, csvFromRows);
  }));

  app.get('/api/reports/suppliers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not build supplier ledger', () => {
    const payload = supplierLedgerReport(Number(req.params.id || 0));
    const query = req.query || {};
    if (query.page || query.pageSize || query.search) {
      return res.json({ supplier: payload.supplier, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
    }
    return res.json(payload);
  }));

  app.get('/api/reports/suppliers/:id/ledger.csv', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not export supplier ledger', () => {
    const payload = supplierLedgerReport(Number(req.params.id || 0));
    const rows = (payload.entries || []).map((entry) => ({
      supplier: payload.supplier?.name || '',
      date: entry.created_at || entry.date || '',
      docNo: entry.doc_no || '',
      entryType: entry.entry_type || '',
      note: entry.note || '',
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      balanceAfter: entry.balance_after || 0,
    }));
    sendCsv(res, `supplier-ledger-${req.params.id}.csv`, ['supplier', 'date', 'docNo', 'entryType', 'note', 'debit', 'credit', 'balanceAfter'], rows, csvFromRows);
  }));
}

module.exports = { registerLedgerRoutes };
EOF

cat > src/report-routes/register-ops-routes.js <<'EOF'
function registerOpsRoutes({ app, authMiddleware, requirePermission, relationalTreasury, relationalAuditLogs, reportQueryService }) {
  app.get('/api/treasury-transactions', authMiddleware, requirePermission('treasury'), (req, res) => {
    res.json(reportQueryService.queryTreasuryRows(relationalTreasury() || [], req.query || {}));
  });

  app.get('/api/audit-logs', authMiddleware, requirePermission('audit'), (req, res) => {
    res.json(reportQueryService.queryAuditRows(relationalAuditLogs() || [], req.query || {}));
  });
}

module.exports = { registerOpsRoutes };
EOF

cat > src/report-routes.js <<'EOF'
const { buildReportQueryService } = require('./report-query-service');
const { registerSummaryRoutes } = require('./report-routes/register-summary-routes');
const { registerInventoryRoutes } = require('./report-routes/register-inventory-routes');
const { registerLedgerRoutes } = require('./report-routes/register-ledger-routes');
const { registerOpsRoutes } = require('./report-routes/register-ops-routes');

function registerReportRoutes(deps) {
  const reportQueryService = buildReportQueryService();

  registerSummaryRoutes({ ...deps, reportQueryService });
  registerInventoryRoutes({ ...deps, reportQueryService });
  registerLedgerRoutes({ ...deps, reportQueryService });
  registerOpsRoutes({ ...deps, reportQueryService });
}

module.exports = { registerReportRoutes };
EOF

# Adjust if domain.ts became empty duplicate noise
python3 - <<'PY'
from pathlib import Path
p=Path('frontend/src/types/domain.ts')
text=p.read_text().strip()
# Ensure no accidental blank leftovers with semicolons only
if text == "export * from './domain';":
    p.write_text("export * from './domain';\n")
PY
