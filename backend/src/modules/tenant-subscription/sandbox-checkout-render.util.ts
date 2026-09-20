/**
 * Output-encoding helpers for the two sandbox checkout routes, which build HTML by hand
 * and serve it from the application's own origin.
 *
 * Invariant SBX-1: nothing the caller supplies reaches that markup unencoded, and the
 * redirect target is a same-origin path or nothing.
 *
 * Kept in their own module so the critical test imports the same functions the controller
 * runs — a copy inside the test would guard nothing.
 */

/** Characters that let a value break out of text content or an attribute value. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BACKSLASH = 0x5c;
const DEL = 0x7f;
const DEFAULT_REDIRECT = '/settings/subscription';

/**
 * The redirect target is written into an anchor href and into a JS string literal, so it
 * has to be a same-origin path and nothing else: an absolute URL makes this an open
 * redirect from a trusted origin, and a `javascript:` URL executes on it.
 */
export function sanitizeRedirectPath(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_REDIRECT;

  // A single-slash-rooted path only. `//host` is protocol-relative and leaves the origin,
  // and anything not starting with `/` can carry a scheme.
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_REDIRECT;

  // Control characters and backslashes are the usual way past a check of this shape:
  // browsers normalise `\` to `/`, and a stray CR/LF would allow header or markup splitting.
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === DEL || code === BACKSLASH) return DEFAULT_REDIRECT;
  }

  return raw;
}
