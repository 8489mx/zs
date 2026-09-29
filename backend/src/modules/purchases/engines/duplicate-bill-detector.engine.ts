/**
 * Pure Calculation Engine: Vendor Duplicate Bill & Fraud Detection
 *
 * Implements deterministic matching rules to detect duplicate vendor bills and suspicious amounts:
 * 1. Exact Vendor Invoice Match (Blocking): Same supplier + identical normalized supplier_invoice_no.
 * 2. Similar Vendor Invoice Match (Warning): Same supplier + Levenshtein distance <= 1 or 2.
 * 3. Identical Amount in Bounded Window (Warning): Same supplier + exact monetary total within <= 30 days.
 *
 * Conforms to Constitutional Invariant 13 (Pure Engine Extraction):
 * Zero side-effects, zero database dependencies, 100% testable in unit specs.
 */

export interface CandidateBill {
  supplierId: number;
  supplierInvoiceNo?: string | null;
  total: number;
  date: Date | string;
  excludePurchaseId?: number | null;
}

export interface HistoricalPurchaseRecord {
  id: number;
  docNo: string;
  supplierId: number;
  supplierInvoiceNo?: string | null;
  total: number;
  createdAt: Date | string;
  status: string; // 'draft', 'posted', 'cancelled', etc.
}

export interface DuplicateBillMatch {
  purchaseId: number;
  docNo: string;
  supplierInvoiceNo?: string;
  total: number;
  date: string;
  reason: 'exact_invoice_no' | 'similar_invoice_no' | 'identical_amount_recent';
  severity: 'blocking' | 'warning';
  message: string;
}

export interface DuplicateBillCheckResult {
  hasDuplicates: boolean;
  hasBlockingDuplicates: boolean;
  hasSuspiciousDuplicates: boolean;
  matches: DuplicateBillMatch[];
}

export interface DuplicateCheckOptions {
  daysWindow?: number;
  amountTolerance?: number;
}

/**
 * Normalizes vendor bill numbers:
 * - Trims whitespace
 * - Converts to uppercase
 * - Strips redundant internal spaces
 */
export function normalizeBillNumber(raw?: string | null): string {
  if (!raw) return '';
  return String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Standard dynamic programming Levenshtein distance for fuzzy string comparison.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Single-row space optimization
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = d[j];
      if (a[i - 1] === b[j - 1]) {
        d[j] = prev;
      } else {
        d[j] = 1 + Math.min(prev, d[j], d[j - 1]);
      }
      prev = temp;
    }
  }

  return d[n];
}

/**
 * Formats a date into a clean YYYY-MM-DD string.
 */
function formatDate(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toISOString().slice(0, 10);
}

/**
 * Pure function to detect duplicate vendor bills against historical purchases.
 */
export function detectDuplicateBills(
  candidate: CandidateBill,
  historical: HistoricalPurchaseRecord[],
  options: DuplicateCheckOptions = {},
): DuplicateBillCheckResult {
  const daysWindow = options.daysWindow ?? 30;
  const amountTolerance = options.amountTolerance ?? 0.01;

  const candidateSupplierId = Number(candidate.supplierId);
  const candidateInvoiceNo = normalizeBillNumber(candidate.supplierInvoiceNo);
  const candidateTotal = Math.round(Number(candidate.total || 0) * 100) / 100;
  const candidateDate = new Date(candidate.date);
  const candidateTimestamp = isNaN(candidateDate.getTime()) ? Date.now() : candidateDate.getTime();
  const excludeId = candidate.excludePurchaseId ? Number(candidate.excludePurchaseId) : null;

  const matches: DuplicateBillMatch[] = [];

  for (const h of historical) {
    // 1. Skip if self (on edit), different supplier, or cancelled
    if (excludeId !== null && Number(h.id) === excludeId) continue;
    if (Number(h.supplierId) !== candidateSupplierId) continue;
    if (h.status === 'cancelled') continue;

    const histTotal = Math.round(Number(h.total || 0) * 100) / 100;
    const histInvoiceNo = normalizeBillNumber(h.supplierInvoiceNo);
    const histDate = new Date(h.createdAt);
    const histTimestamp = isNaN(histDate.getTime()) ? 0 : histDate.getTime();
    const diffDays = Math.abs(candidateTimestamp - histTimestamp) / (1000 * 60 * 60 * 24);

    let matched = false;

    // Check Rule 1: Exact Vendor Invoice Number (Blocking)
    if (candidateInvoiceNo.length >= 2 && histInvoiceNo.length >= 2 && candidateInvoiceNo === histInvoiceNo) {
      matches.push({
        purchaseId: Number(h.id),
        docNo: h.docNo,
        supplierInvoiceNo: h.supplierInvoiceNo || undefined,
        total: histTotal,
        date: formatDate(h.createdAt),
        reason: 'exact_invoice_no',
        severity: 'blocking',
        message: `فاتورة مورد مكررة تماماً: مسجلة مسبقاً برقم (${h.docNo}) بنفس رقم فاتورة المورد (${candidate.supplierInvoiceNo}) بقيمة ${histTotal}.`,
      });
      matched = true;
    }

    // Check Rule 2: Similar Vendor Invoice Number (Warning - if length >= 4 and Levenshtein <= threshold)
    if (!matched && candidateInvoiceNo.length >= 4 && histInvoiceNo.length >= 4) {
      const maxLen = Math.max(candidateInvoiceNo.length, histInvoiceNo.length);
      const threshold = maxLen >= 8 ? 2 : 1;
      const distance = calculateLevenshteinDistance(candidateInvoiceNo, histInvoiceNo);

      if (distance <= threshold) {
        matches.push({
          purchaseId: Number(h.id),
          docNo: h.docNo,
          supplierInvoiceNo: h.supplierInvoiceNo || undefined,
          total: histTotal,
          date: formatDate(h.createdAt),
          reason: 'similar_invoice_no',
          severity: 'warning',
          message: `رقم فاتورة المورد (${candidate.supplierInvoiceNo}) شديد الشبه برقم فاتورة سابقة (${h.supplierInvoiceNo}) في الفاتورة (${h.docNo}).`,
        });
        matched = true;
      }
    }

    // Check Rule 3: Identical Monetary Amount within Bounded Time Window (Warning)
    if (!matched && candidateTotal > 0 && histTotal > 0) {
      if (Math.abs(candidateTotal - histTotal) <= amountTolerance && diffDays <= daysWindow) {
        matches.push({
          purchaseId: Number(h.id),
          docNo: h.docNo,
          supplierInvoiceNo: h.supplierInvoiceNo || undefined,
          total: histTotal,
          date: formatDate(h.createdAt),
          reason: 'identical_amount_recent',
          severity: 'warning',
          message: `اشتباه تكرار القيمة: توجد فاتورة سابقة بنفس المبلغ تماماً (${histTotal}) لنفس المورد خلال ${Math.round(diffDays)} يوماً (${h.docNo} بتاريخ ${formatDate(h.createdAt)}).`,
        });
      }
    }
  }

  const hasBlockingDuplicates = matches.some((m) => m.severity === 'blocking');
  const hasSuspiciousDuplicates = matches.some((m) => m.severity === 'warning');

  return {
    hasDuplicates: matches.length > 0,
    hasBlockingDuplicates,
    hasSuspiciousDuplicates,
    matches,
  };
}
