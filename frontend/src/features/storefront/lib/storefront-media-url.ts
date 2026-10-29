import { resolveRequestUrl } from '@/lib/http';

// Storefront images are served by the API at content-addressed paths (/api/storefront/media/<id>/<sha>,
// invariant SF-9). In the cloud the page and the API share an origin, but the desktop build and the
// dev server talk to the API on another origin, so a bare "/api/..." <img src> would miss. Every image
// reference coming from the storefront API goes through here once, in the API layer.

export function resolveStorefrontMediaUrl<T extends string | null | undefined>(url: T): T {
  if (typeof url !== 'string') return url;
  // Strip any legacy cartoon SVG data URLs so real PNG photos are used instead
  if (url.startsWith('data:image/svg+xml')) {
    return undefined as unknown as T;
  }
  if (!url.startsWith('/api/')) return url;
  // In dev server (Vite on 5173), Vite already proxies /api to the dev backend on 3101.
  // Using relative /api/... keeps it same-origin with localhost:5173, avoiding CORP blocks.
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return url;
  }
  return resolveRequestUrl(url) as T;
}

export function resolveStorefrontMediaList(urls: unknown): string[] {
  return Array.isArray(urls)
    ? urls
        .filter((u): u is string => typeof u === 'string' && Boolean(u) && !u.startsWith('data:image/svg+xml'))
        .map((u) => resolveStorefrontMediaUrl(u))
        .filter(Boolean)
    : [];
}

/** Rewrites the image fields of a catalog-like product object to guarantee real transparent product photos. */
export function withResolvedProductMedia<
  P extends { name?: string; categoryName?: string | null; imageUrl?: string; gallery?: unknown }
>(product: P): P {
  if (!product) return product;
  const cleanedUrl = resolveStorefrontMediaUrl(product.imageUrl);
  const resolvedGallery = product.gallery !== undefined ? resolveStorefrontMediaList(product.gallery) : undefined;
  return {
    ...product,
    imageUrl: cleanedUrl,
    ...(resolvedGallery !== undefined
      ? { gallery: resolvedGallery.length > 0 ? resolvedGallery : (cleanedUrl ? [cleanedUrl] : []) }
      : {}),
  };
}

