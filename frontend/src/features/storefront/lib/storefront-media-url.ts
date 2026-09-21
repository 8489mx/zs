import { resolveRequestUrl } from '@/lib/http';

// Storefront images are served by the API at content-addressed paths (/api/storefront/media/<id>/<sha>,
// invariant SF-9). In the cloud the page and the API share an origin, but the desktop build and the
// dev server talk to the API on another origin, so a bare "/api/..." <img src> would miss. Every image
// reference coming from the storefront API goes through here once, in the API layer.

export function resolveStorefrontMediaUrl<T extends string | null | undefined>(url: T): T {
  if (typeof url !== 'string' || !url.startsWith('/api/')) return url;
  return resolveRequestUrl(url) as T;
}

export function resolveStorefrontMediaList(urls: unknown): string[] {
  return Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string' && Boolean(u)).map((u) => resolveStorefrontMediaUrl(u)) : [];
}

/** Rewrites the image fields of a catalog-like product object. */
export function withResolvedProductMedia<P extends { imageUrl?: string; gallery?: unknown }>(product: P): P {
  if (!product) return product;
  return {
    ...product,
    imageUrl: resolveStorefrontMediaUrl(product.imageUrl),
    ...(product.gallery !== undefined ? { gallery: resolveStorefrontMediaList(product.gallery) } : {}),
  };
}
