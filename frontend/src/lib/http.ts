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
const RAW_API_BASE = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.trim();

function normalizeApiBaseUrl(value?: string) {
  if (value) return value.replace(/\/$/, '');
  if (typeof window === 'undefined') return '';
  if (window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return window.location.origin;
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE);

function emitWindowEvent<T>(name: string, detail: T) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function buildErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'object' && payload) {
    if ('error' in payload && typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
    if ('message' in payload && typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  return fallback;
}

function withTimeout(init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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

export function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const { signal, clear } = withTimeout(init);

  try {
    const response = await fetch(resolveRequestUrl(path), {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      },
      ...init,
      signal
    });

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        emitWindowEvent(APP_UNAUTHORIZED_EVENT, { path, status: response.status });
      }

      throw new ApiError(buildErrorMessage(payload, 'Request failed'), response.status, { details: payload });
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
