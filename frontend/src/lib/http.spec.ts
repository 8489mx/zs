import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_NETWORK_STATE_EVENT, APP_UNAUTHORIZED_EVENT, http, normalizeApiBaseUrl } from '@/lib/http';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('http client', () => {
  it('normalizes configured api base urls without a trailing slash', () => {
    expect(normalizeApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('attaches the csrf header for unsafe methods', async () => {
    document.cookie = 'csrf_token=secure-token; path=/';
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(http('/orders', { method: 'POST', body: JSON.stringify({ id: 1 }) })).resolves.toEqual({ ok: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(init.credentials).toBe('include');
    expect(headers.get('x-csrf-token')).toBe('secure-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('emits the unauthorized event and preserves nested backend codes', async () => {
    const listener = vi.fn();
    window.addEventListener(APP_UNAUTHORIZED_EVENT, listener as EventListener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'انتهت الجلسة', code: 'session_expired' } }, 401)));

    await expect(http('/secure')).rejects.toMatchObject({
      status: 401,
      code: 'session_expired',
      message: 'انتهت الجلسة',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<{ path: string; status: number }>;
    expect(event.detail).toEqual({ path: '/secure', status: 401 });
  });

  it('maps transport failures to a network api error and emits a network-state event', async () => {
    const listener = vi.fn();
    window.addEventListener(APP_NETWORK_STATE_EVENT, listener as EventListener);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(http('/health')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
      message: 'تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<{ online: boolean; path: string }>;
    expect(event.detail.path).toBe('/health');
    expect(typeof event.detail.online).toBe('boolean');
  });
});
