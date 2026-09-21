import { createHash } from 'crypto';

// Invariant SF-9 (ARCHITECTURE_INVARIANTS.md section 4): storefront images are stored once, as binary,
// in `storefront_media`, and every API response carries only a short content-addressed URL.
//
// Why: product, category and banner images used to be saved as base64 data URLs inside
// products.metadata / settings, and the public catalog endpoint returned EVERY product with its full
// image inline. A few hundred products meant a multi-megabyte JSON response that the whole page
// waited for (spinner) before showing anything — and base64 barely compresses.

export const STOREFRONT_MEDIA_URL_PREFIX = '/api/storefront/media/';

/** Hard cap per image. The admin compressor produces ~30-150 KB WebP; 2 MB leaves room for PNG logos. */
export const STOREFRONT_MEDIA_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif']);

export interface ParsedImage {
  mime: string;
  bytes: Buffer;
  sha256: string;
}

export type ParseImageResult =
  | { ok: true; image: ParsedImage }
  | { ok: false; reason: 'NOT_DATA_URL' | 'UNSUPPORTED_TYPE' | 'EMPTY' | 'TOO_LARGE' | 'MALFORMED' };

export function isImageDataUrl(value: unknown): boolean {
  return typeof value === 'string' && /^data:image\//i.test(value.trim());
}

/** Parses a base64 image data URL. SVG is rejected on purpose: it can carry script. */
export function parseImageDataUrl(value: string): ParseImageResult {
  const trimmed = String(value || '').trim();
  const m = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]*)$/i);
  if (!m) return { ok: false, reason: isImageDataUrl(trimmed) ? 'MALFORMED' : 'NOT_DATA_URL' };

  const mime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return { ok: false, reason: 'UNSUPPORTED_TYPE' };

  const bytes = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
  if (bytes.length === 0) return { ok: false, reason: 'EMPTY' };
  if (bytes.length > STOREFRONT_MEDIA_MAX_BYTES) return { ok: false, reason: 'TOO_LARGE' };

  return { ok: true, image: { mime, bytes, sha256: createHash('sha256').update(bytes).digest('hex') } };
}

export function buildStorefrontMediaUrl(id: number, sha256: string): string {
  return `${STOREFRONT_MEDIA_URL_PREFIX}${id}/${sha256}`;
}

/**
 * What an image reference may be once stored: empty, one of our media URLs, or an absolute http(s)
 * URL the merchant pasted. Anything else (javascript:, relative paths, leftover data URLs) is refused.
 */
export function isAcceptableStoredImageRef(value: string): boolean {
  if (!value) return true;
  if (value.startsWith(STOREFRONT_MEDIA_URL_PREFIX)) return /^\/api\/storefront\/media\/\d+\/[0-9a-f]{64}$/.test(value);
  return /^https?:\/\/[^\s"'<>]+$/i.test(value);
}
