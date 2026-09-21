// Invariant SF-7 (ARCHITECTURE_INVARIANTS.md section 4): a payment gateway's secret never leaves the
// server in full. The settings screen gets a masked hint (last 4 characters) so the merchant can tell
// a key is configured; saving the form back unchanged sends the mask, which must NOT overwrite the
// stored secret.
//
// O59: GET /api/storefront/admin/settings returned the Stripe / Tap secret keys, the Stripe webhook
// secret, the Paymob API key and HMAC secret and the XPay API key in clear to any signed-in user of the
// tenant — enough to issue refunds, read customers' payments, or forge "paid" webhooks (the HMAC secret
// is exactly what the webhook signature check trusts).

const MASK_PREFIX = '••••••••';

export function maskGatewaySecret(secret: string | null | undefined): string {
  const value = String(secret ?? '');
  if (!value) return '';
  const tail = value.length > 8 ? value.slice(-4) : '';
  return `${MASK_PREFIX}${tail}`;
}

/** True for any value produced by maskGatewaySecret — i.e. "the user did not change this field". */
export function isMaskedGatewaySecret(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(MASK_PREFIX);
}
