/**
 * SF-10 (frontend mirror of `backend/src/modules/storefront/engines/store-public-url.engine.ts`).
 *
 * `VITE_STOREFRONT_ROOT_DOMAIN` (e.g. `zsystemai.com`) turns on subdomain stores:
 * - the public link of store `almhnds` becomes `https://almhnds.zsystemai.com`;
 * - opening that host renders the storefront at `/` instead of the ERP.
 * Unset (desktop, local dev, any server without wildcard DNS) → the legacy `<origin>/st/<slug>`.
 *
 * Keep RESERVED_STORE_SLUGS identical to the backend list.
 */

export const RESERVED_STORE_SLUGS: ReadonlySet<string> = new Set([
  'app', 'www', 'api', 'admin', 'mail', 'email', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'media',
  'status', 'docs', 'help', 'support', 'blog', 'dev', 'staging', 'test', 'demo', 'erp', 'portal',
  'dashboard', 'billing', 'pay', 'payment', 'payments', 'webhook', 'webhooks', 'auth', 'sso', 'oauth',
  'login', 'logout', 'register', 'signup', 'trial', 'store', 'st', 'shop', 'profile', 'settings', 'pos',
  'system', 'driver', 'track', 'public', 'default', 'root', 'ns1', 'ns2',
]);

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function storefrontRootDomain(raw: unknown = import.meta.env?.VITE_STOREFRONT_ROOT_DOMAIN): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\.+|\.+$/g, '');
}

export function canUseStoreSubdomain(slug: unknown): boolean {
  const clean = String(slug ?? '').trim().toLowerCase();
  return DNS_LABEL.test(clean) && !RESERVED_STORE_SLUGS.has(clean);
}

/** Store home URL, no trailing slash. Sub-pages append `/p/<id>`, `?table=<n>`, ... */
export function buildStorePublicUrl(
  slug: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
  root: string = storefrontRootDomain(),
): string {
  const clean = String(slug || '').trim().toLowerCase();
  if (root && canUseStoreSubdomain(clean)) return `https://${clean}.${root}`;
  return `${origin.replace(/\/$/, '')}/st/${encodeURIComponent(clean)}`;
}

/** What goes before the slug in "your link" hints: `https://` + `.<root>` or `<origin>/st/`. */
export function storePublicUrlParts(
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
  root: string = storefrontRootDomain(),
): { prefix: string; suffix: string } {
  return root ? { prefix: 'https://', suffix: `.${root}` } : { prefix: `${origin.replace(/\/$/, '')}/st/`, suffix: '' };
}

/**
 * The store slug when this page was opened on `<slug>.<root>`, else null (ERP host, apex, localhost).
 */
export function getStoreHostSlug(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : '',
  root: string = storefrontRootDomain(),
): string | null {
  const host = String(hostname || '').trim().toLowerCase();
  if (!root || !host.endsWith(`.${root}`)) return null;
  const label = host.slice(0, -(root.length + 1));
  return canUseStoreSubdomain(label) ? label : null;
}
