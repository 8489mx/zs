/**
 * The ECR bridge may time out AFTER the payment terminal charged the customer.
 * Retrying through a second route is never safe once dispatch has started.
 */
export function shouldTryAlternateTerminalCharge(chargeRequestIssued: boolean): boolean {
  return !chargeRequestIssued;
}

/** An already approved card transaction must not be silently detached from the POS cart. */
export function canChangePaymentAfterTerminalApproval(authCode?: string | null): boolean {
  return !Boolean(String(authCode || '').trim());
}
