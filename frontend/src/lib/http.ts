export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export const APP_UNAUTHORIZED_EVENT = 'zsystems:unauthorized';
export const APP_NETWORK_STATE_EVENT = 'zsystems:network-state';
const REQUEST_TIMEOUT_MS = 15_000;

export interface HttpRequestInit extends RequestInit {
  timeoutMs?: number;
}
const RAW_API_BASE = import.meta.env?.VITE_API_BASE_URL?.trim();
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function normalizeApiBaseUrl(
  value?: string,
  locationInfo?: { port: string; protocol: string; hostname: string },
) {
  const normalized = value?.replace(/\/$/, '') || '';
  const runtimeLocation = locationInfo
    ?? (typeof window !== 'undefined'
      ? {
        port: window.location.port,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
      }
      : null);

  if (normalized || !runtimeLocation) return normalized;

  const isDevServer = runtimeLocation.port === '5173';
  if (isDevServer) {
    return `${runtimeLocation.protocol}//${runtimeLocation.hostname}:3001`;
  }

  return '';
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE);

function emitWindowEvent<T>(name: string, detail: T) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = firstNonEmptyString(item);
        if (nested) return nested;
      }
    }
  }

  return null;
}

function extractMessage(payload: unknown): string | null {
  if (!payload) return null;

  if (typeof payload === 'string') {
    return payload.trim() || null;
  }

  if (Array.isArray(payload)) {
    return firstNonEmptyString(payload);
  }

  if (typeof payload === 'object') {
    const candidate = payload as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
      code?: unknown;
    };

    const nestedError =
      typeof candidate.error === 'object' && candidate.error
        ? extractMessage(candidate.error)
        : null;

    const nestedDetails =
      typeof candidate.details === 'object' && candidate.details
        ? extractMessage(candidate.details)
        : null;

    return (
      firstNonEmptyString(candidate.message)
      || firstNonEmptyString(candidate.error)
      || nestedError
      || nestedDetails
      || firstNonEmptyString(candidate.details)
      || null
    );
  }

  return null;
}

function extractCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const candidate = payload as {
    code?: unknown;
    error?: unknown;
    details?: unknown;
  };

  if (typeof candidate.code === 'string' && candidate.code.trim()) {
    return candidate.code.trim();
  }

  if (candidate.error && typeof candidate.error === 'object') {
    const nested = extractCode(candidate.error);
    if (nested) return nested;
  }

  if (candidate.details && typeof candidate.details === 'object') {
    const nested = extractCode(candidate.details);
    if (nested) return nested;
  }

  return undefined;
}

function buildErrorMessage(payload: unknown, fallback: string) {
  return extractMessage(payload) || fallback;
}

function withTimeout(init?: HttpRequestInit) {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeoutId)
  };
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

function isUnsafeMethod(method: string | undefined): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase());
}

function buildHeaders(init?: HttpRequestInit): Headers {
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Content-Type') && init?.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  if (isUnsafeMethod(init?.method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  return headers;
}

export function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function http<T>(path: string, init?: HttpRequestInit): Promise<T> {
  const { signal, clear } = withTimeout(init);

  try {
    const response = await fetch(resolveRequestUrl(path), {
      credentials: 'include',
      headers: buildHeaders(init),
      ...init,
      signal
    });

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const rawPayload = await response.text();

    let payload: unknown = rawPayload;
    if (contentType.includes('application/json')) {
      try {
        payload = rawPayload ? JSON.parse(rawPayload) : null;
      } catch {
        payload = rawPayload;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        emitWindowEvent(APP_UNAUTHORIZED_EVENT, { path, status: response.status });
      }

      throw new ApiError(
        buildErrorMessage(payload, 'تعذر تنفيذ العملية المطلوبة.'),
        response.status,
        { code: extractCode(payload), details: payload }
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('انتهت مهلة الطلب. حاول مرة أخرى.', 408, { code: 'timeout' });
    }

    emitWindowEvent(APP_NETWORK_STATE_EVENT, { online: typeof navigator !== 'undefined' ? navigator.onLine : false, path });
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.', 0, { code: 'network_error', details: error });
  } finally {
    clear();
  }
}
