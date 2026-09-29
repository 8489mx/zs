/**
 * B2B Subscription Billing & Contract Pure Engine
 *
 * Implements deterministic calculation for:
 * 1. Cycle intervals and next billing date advancement.
 * 2. Subscription line price and tax aggregations.
 * 3. Contract expiration and automated renewal qualification.
 *
 * Pure, side-effect free, and fully testable.
 */

export type BillingPeriod = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface SubscriptionLineInput {
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface SubscriptionEvaluationInput {
  status: string; // 'draft' | 'active' | 'paused' | 'canceled' | 'expired'
  nextBillingDate: string | Date;
  startDate: string | Date;
  endDate?: string | Date | null;
  autoRenew: boolean;
}

export interface SubscriptionEvaluationResult {
  isDueForBilling: boolean;
  isExpired: boolean;
  nextStatus: string;
}

/**
 * Calculates next billing date advancing from given base date according to cycle period
 */
export function calculateNextBillingDate(
  baseDate: Date | string,
  period: BillingPeriod,
): string {
  const str = typeof baseDate === 'string' ? baseDate.slice(0, 10) : baseDate.toISOString().slice(0, 10);
  const [yStr, mStr, dStr] = str.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    throw new Error('Invalid baseDate provided to calculateNextBillingDate');
  }

  if (period === 'monthly') {
    m += 1;
  } else if (period === 'quarterly') {
    m += 3;
  } else if (period === 'semi_annual') {
    m += 6;
  } else if (period === 'annual') {
    y += 1;
  }

  while (m > 12) {
    m -= 12;
    y += 1;
  }

  // Handle month-end clamping (e.g. Jan 31 + 1 month -> Feb 28)
  const maxDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(d, maxDays);

  const mm = String(m).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/**
 * Calculates line totals including tax
 */
export function calculateSubscriptionLineTotals(
  quantity: number,
  unitPrice: number,
  taxRate = 0,
): { netAmount: number; taxAmount: number; totalAmount: number } {
  const qty = Number(quantity || 0);
  const price = Number(unitPrice || 0);
  const tax = Number(taxRate || 0);

  const netAmount = Number((qty * price).toFixed(2));
  const taxAmount = Number(((netAmount * tax) / 100).toFixed(2));
  const totalAmount = Number((netAmount + taxAmount).toFixed(2));

  return { netAmount, taxAmount, totalAmount };
}

/**
 * Aggregates all subscription lines into subtotal, taxTotal, and grandTotal
 */
export function calculateSubscriptionTotals(
  lines: SubscriptionLineInput[],
): { subtotal: number; taxTotal: number; grandTotal: number } {
  let subtotal = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const res = calculateSubscriptionLineTotals(line.quantity, line.unitPrice, line.taxRate || 0);
    subtotal += res.netAmount;
    taxTotal += res.taxAmount;
  }

  subtotal = Number(subtotal.toFixed(2));
  taxTotal = Number(taxTotal.toFixed(2));
  const grandTotal = Number((subtotal + taxTotal).toFixed(2));

  return { subtotal, taxTotal, grandTotal };
}

/**
 * Evaluates whether a subscription is due for recurring invoice generation,
 * or whether the contract has reached its termination date.
 */
export function evaluateSubscriptionBillingStatus(
  sub: SubscriptionEvaluationInput,
  asOfDate: Date | string,
): SubscriptionEvaluationResult {
  const asOf = new Date(asOfDate);
  asOf.setHours(23, 59, 59, 999);

  if (sub.status !== 'active') {
    return {
      isDueForBilling: false,
      isExpired: sub.status === 'expired',
      nextStatus: sub.status,
    };
  }

  // Check expiration if contract has an end date
  if (sub.endDate) {
    const end = new Date(sub.endDate);
    end.setHours(23, 59, 59, 999);

    if (asOf.getTime() > end.getTime()) {
      if (!sub.autoRenew) {
        return {
          isDueForBilling: false,
          isExpired: true,
          nextStatus: 'expired',
        };
      }
    }
  }

  // Check if billing date is reached or passed
  const billDate = new Date(sub.nextBillingDate);
  billDate.setHours(0, 0, 0, 0);

  const isDue = asOf.getTime() >= billDate.getTime();

  return {
    isDueForBilling: isDue,
    isExpired: false,
    nextStatus: 'active',
  };
}
