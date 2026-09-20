/**
 * Pure decision engine for resolving which `online_orders` row a public payment
 * webhook is allowed to touch.
 *
 * Why this is a gate and not a lookup detail:
 * `online_orders.order_number` is per-tenant sequential (`ON-YYMMDD-0001`, see
 * `storefront.service.ts:createOrder`; the table only has a NON-unique
 * `(tenant_id, order_number)` index). It is therefore **not** an identity across
 * tenants — every tenant that takes its first order on a given day owns the same
 * order number. The four webhook endpoints (`storefront-public.controller.ts`
 * `webhooks/paymob|xpay|tap|stripe`) are public and unauthenticated by design,
 * so resolving an order on `order_number` alone lets any caller flip an arbitrary
 * tenant's order to `paid`.
 *
 * Invariant WH-1: a public webhook may only reach a row it can prove ownership of.
 *   - a tenant reference in the payload  -> the query MUST be constrained by tenant_id
 *   - no tenant reference                -> only a gateway-issued id may identify the
 *                                           row, and only when it matches exactly one
 *
 * Kept pure (no db, no I/O) so the critical test imports the same function the
 * service runs — a duplicated copy inside the test would guard nothing.
 */

export type WebhookOrderLookupPlan =
  | {
      mode: 'tenant_scoped';
      tenantId: string;
      by: 'order_number' | 'gateway_order_id';
      value: string;
    }
  | { mode: 'gateway_id_unique'; gatewayOrderId: string }
  | { mode: 'refuse'; reason: 'no_identifier' | 'no_tenant_reference' };

export type WebhookOrderLookupInput = {
  tenantId?: string | null;
  orderNumber?: string | null;
  gatewayOrderId?: string | null;
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Decides how — or whether — a webhook payload is allowed to select an order.
 * Never widens: absence of a tenant reference can only ever narrow the options.
 */
export function planWebhookOrderLookup(input: WebhookOrderLookupInput): WebhookOrderLookupPlan {
  const tenantId = clean(input.tenantId);
  const orderNumber = clean(input.orderNumber);
  const gatewayOrderId = clean(input.gatewayOrderId);

  if (tenantId) {
    if (orderNumber) {
      return { mode: 'tenant_scoped', tenantId, by: 'order_number', value: orderNumber };
    }
    if (gatewayOrderId) {
      return { mode: 'tenant_scoped', tenantId, by: 'gateway_order_id', value: gatewayOrderId };
    }
    return { mode: 'refuse', reason: 'no_identifier' };
  }

  // No tenant reference: order_number is ambiguous across tenants, so it is not
  // an acceptable identifier on its own. Only a gateway-issued id may be used.
  if (!gatewayOrderId) {
    return { mode: 'refuse', reason: 'no_tenant_reference' };
  }

  return { mode: 'gateway_id_unique', gatewayOrderId };
}

/**
 * Applies the `gateway_id_unique` arm: a gateway id is only an identity when it
 * resolves to exactly one order. Two tenants can hold the same id (separate
 * merchant accounts on the same gateway), and in that case we cannot tell whose
 * payment this is — so we refuse rather than guess.
 *
 * Callers must pass at least 2 candidate rows when more exist (`.limit(2)`),
 * so that ambiguity is detectable without loading the whole table.
 */
export function selectUnambiguousOrder<T>(matches: readonly T[]): T | null {
  return matches.length === 1 ? matches[0] : null;
}
