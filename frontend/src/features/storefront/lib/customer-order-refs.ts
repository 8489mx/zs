// Each storefront order is reachable publicly only with its secret access token (invariant SF-1).
// The server returns the token once, at checkout, and keeps only its hash — so this device's
// storage is the only place it lives. Losing it means the customer follows up via the store.

export interface CustomerOrderRef {
  orderNumber: string;
  token: string;
}

const MAX_REFS = 30;

function refsKey(slug: string): string {
  return `zs_customer_order_refs_${slug}`;
}

export function getCustomerOrderRefs(slug: string): CustomerOrderRef[] {
  try {
    const raw = localStorage.getItem(refsKey(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is CustomerOrderRef => Boolean(r) && typeof r.orderNumber === 'string' && typeof r.token === 'string',
    );
  } catch {
    return [];
  }
}

export function saveCustomerOrderRef(slug: string, orderNumber: string, token: string | undefined): void {
  if (!orderNumber || !token) return;
  try {
    const next = [{ orderNumber, token }, ...getCustomerOrderRefs(slug).filter((r) => r.orderNumber !== orderNumber || r.token !== token)];
    localStorage.setItem(refsKey(slug), JSON.stringify(next.slice(0, MAX_REFS)));
    // Pre-token versions stored bare order numbers, which the server no longer accepts.
    localStorage.removeItem(`zs_customer_orders_${slug}`);
  } catch {}
}

export function getCustomerOrderToken(slug: string, orderNumber: string): string | undefined {
  return getCustomerOrderRefs(slug).find((r) => r.orderNumber === orderNumber)?.token;
}
