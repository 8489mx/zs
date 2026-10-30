import { AppError } from '../../../common/errors/app-error';
import { roundMoney, type MoneyDigits } from '../../accounting/engines/money-minor-units.engine';

/**
 * Unified document-tax engine — tax unification, package 1 (ZATCA first).
 *
 * One rule for every signed/reported document: the document attests the
 * POSTED invoice, it never recomputes tax. Per line, the stored
 * allocation wins — `net_line_total` is the ex-tax base net of discount
 * and `allocated_tax` is the posted per-line tax (both written by
 * allocateInvoiceDiscount at book precision on create and on edit).
 * The stored invoice rate is only the document's rate label and the
 * fallback for legacy lines that predate allocation storage; it is
 * never hardcoded (the ZATCA builder used 15%, the ETA serializer 14%).
 *
 * Attestation, not re-validation: the engine signs what was posted.
 * Whether the stored rate was lawful belongs to the posting gate
 * (Tax F1: configured rate or zero), never to the signer — a legacy
 * invoice with a wrong-but-posted rate must still be reportable
 * as-posted. Only corrupt values (non-finite, negative) fail closed.
 *
 * Document precision (UBL: 2) is required and explicit. Amounts are
 * rounded per line with the canonical rounder so the document's
 * totals equal the sum of its lines exactly; the GL keeps book
 * precision as the authority, so a 3-decimal posted tax may differ
 * from its 2-decimal document rendering by a half minor unit.
 */
export interface DocumentTaxLineInput {
  lineTotal: number;
  netLineTotal?: number | null;
  allocatedDiscount?: number | null;
  allocatedTax?: number | null;
}

export interface DocumentTaxLine {
  base: number;
  tax: number;
  rate: number;
  total: number;
}

export interface DocumentTaxTotals {
  lines: DocumentTaxLine[];
  subtotal: number;
  vatTotal: number;
  totalWithVat: number;
  rate: number;
}

function invalid(message: string, code: string): AppError {
  return new AppError(message, code, 400);
}

export function buildDocumentTax(input: {
  rate: unknown;
  pricesIncludeTax: boolean;
  documentDigits: MoneyDigits;
  lines: DocumentTaxLineInput[];
}): DocumentTaxTotals {
  const rate = Number(input.rate ?? 0);
  if (!Number.isFinite(rate) || rate < 0) {
    throw invalid('نسبة الضريبة المخزنة للفاتورة غير صالحة', 'DOCUMENT_TAX_RATE_INVALID');
  }
  const digits = input.documentDigits;
  if (digits !== 2 && digits !== 3) {
    throw invalid('Document tax requires a document precision', 'DOCUMENT_TAX_DIGITS_INVALID');
  }
  if (input.lines.length === 0) {
    throw invalid('Document tax requires at least one line', 'DOCUMENT_TAX_NO_LINES');
  }

  const lines: DocumentTaxLine[] = input.lines.map((line) => {
    const lineTotal = Number(line.lineTotal ?? 0);
    if (!Number.isFinite(lineTotal) || lineTotal < 0) {
      throw invalid('Document tax line total is invalid', 'DOCUMENT_TAX_LINE_INVALID');
    }
    const storedBase = line.netLineTotal == null ? null : Number(line.netLineTotal);
    const storedTax = line.allocatedTax == null ? null : Number(line.allocatedTax);

    let base: number;
    let tax: number;
    if (storedBase != null && storedTax != null) {
      // Posted values win: no rate math, no recomputation.
      if (!Number.isFinite(storedBase) || !Number.isFinite(storedTax) || storedBase < 0 || storedTax < 0) {
        throw invalid('Stored document tax allocation is invalid', 'DOCUMENT_TAX_ALLOCATION_INVALID');
      }
      base = storedBase;
      tax = storedTax;
    } else {
      // Legacy line without allocations: derive from the STORED rate only.
      const discount = Number(line.allocatedDiscount ?? 0);
      if (!Number.isFinite(discount) || discount < 0) {
        throw invalid('Document tax line discount is invalid', 'DOCUMENT_TAX_LINE_INVALID');
      }
      const gross = lineTotal - discount;
      if (gross < 0) {
        throw invalid('Document tax line discount exceeds line total', 'DOCUMENT_TAX_LINE_INVALID');
      }
      if (input.pricesIncludeTax) {
        base = gross / (1 + rate / 100);
        tax = gross - base;
      } else {
        base = gross;
        tax = (base * rate) / 100;
      }
    }

    const roundedBase = roundMoney(base, digits);
    const roundedTax = roundMoney(tax, digits);
    return { base: roundedBase, tax: roundedTax, rate, total: roundMoney(roundedBase + roundedTax, digits) };
  });

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.base, 0),
    digits,
  );
  const vatTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.tax, 0),
    digits,
  );
  return {
    lines,
    subtotal,
    vatTotal,
    totalWithVat: roundMoney(subtotal + vatTotal, digits),
    rate,
  };
}
