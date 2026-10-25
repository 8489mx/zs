/**
 * The ECR bridge may time out AFTER the payment terminal charged the customer.
 * Retrying through a second route is never safe once dispatch has started.
 */
export function shouldTryAlternateTerminalCharge(chargeRequestIssued: boolean): boolean {
  return !chargeRequestIssued;
}

/** An already approved card transaction must not be silently detached from the POS cart. */
export function canChangePaymentAfterTerminalApproval(authCode?: string | null, rrn?: string | null): boolean {
  return !Boolean(String(authCode || '').trim() || String(rrn || '').trim());
}

/** Never invent an authorization code when the bank/terminal did not provide one. */
export function terminalAuthorizationLabel(authCode?: string | null, transactionReference?: string | null): string {
  const approvedCode = String(authCode || '').trim();
  if (approvedCode) return `تمت الموافقة بنجاح (رقم التفويض: ${approvedCode})`;
  const reference = String(transactionReference || '').trim();
  return reference
    ? `تمت الموافقة؛ رقم التفويض غير متاح من الماكينة (مرجع العملية: ${reference})`
    : 'تمت الموافقة؛ رقم التفويض غير متاح من الماكينة. راجع إيصال جهاز الدفع';
}

