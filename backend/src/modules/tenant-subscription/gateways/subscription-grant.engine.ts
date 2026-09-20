/**
 * Pure decision engine for granting subscription time from a payment event.
 *
 * Why this is a gate and not arithmetic:
 * every payment gateway retries a webhook it did not get a 2xx for, and XPay/Paymob sign
 * a plain HMAC over the request body with no nonce or timestamp — so a captured valid
 * (body, signature) pair stays valid forever. Granting a billing period is therefore only
 * safe when the event can be named and de-duplicated.
 *
 * Invariant SUB-1: a payment event may only extend a subscription once.
 *   - no gateway-issued reference  -> refuse (F4: a synthesised `GATEWAY-${Date.now()}`
 *                                    reference makes every retry look like a new payment)
 *   - reference already recorded   -> no-op, report the duplicate
 *   - otherwise                    -> grant exactly `durationMonths`, starting from the
 *                                    later of now and the current period's end
 *
 * Kept pure (no db, no clock of its own) so the critical test imports the same function
 * the service runs — a duplicated copy inside the test would guard nothing.
 */

export type SubscriptionGrantDecision =
  | { action: 'refuse'; reason: 'missing_reference' }
  | { action: 'duplicate'; reference: string }
  | { action: 'grant'; reference: string; startsAt: Date; endsAt: Date };

export type SubscriptionGrantInput = {
  /** The gateway's own transaction id. Empty means the payload did not carry one. */
  transactionReference?: string | null;
  /** True when a payment row already exists for (tenant, reference). */
  alreadyRecorded: boolean;
  /** End of the tenant's current period, if it has one that has not lapsed. */
  currentPeriodEndsAt?: Date | string | null;
  /** Whether that current period is still live (an expired one does not carry over). */
  currentPeriodIsLive: boolean;
  durationMonths: number;
  now: Date;
};

export function decideSubscriptionGrant(input: SubscriptionGrantInput): SubscriptionGrantDecision {
  const reference = String(input.transactionReference ?? '').trim();
  if (!reference) {
    return { action: 'refuse', reason: 'missing_reference' };
  }

  if (input.alreadyRecorded) {
    return { action: 'duplicate', reference };
  }

  const months = Number(input.durationMonths);
  const safeMonths = Number.isFinite(months) && months > 0 ? Math.floor(months) : 12;

  // Unused remaining time carries over, but only from a period that is still live.
  let startsAt = input.now;
  if (input.currentPeriodIsLive && input.currentPeriodEndsAt) {
    const currentEnd = new Date(input.currentPeriodEndsAt);
    if (currentEnd.getTime() > input.now.getTime()) {
      startsAt = currentEnd;
    }
  }

  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + safeMonths);

  return { action: 'grant', reference, startsAt, endsAt };
}
