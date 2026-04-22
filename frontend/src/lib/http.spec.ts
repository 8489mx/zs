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
  it('forces same-origin api base outside dev server even if a backend url is configured', () => {
    expect(normalizeApiBaseUrl('http://localhost:3001/', { port: '8080', protocol: 'http:', hostname: '127.0.0.1' })).toBe('');
  });

  it('uses explicit backend url in vite dev server mode', () => {
    expect(normalizeApiBaseUrl('http://localhost:3001/', { port: '5173', protocol: 'http:', hostname: '127.0.0.1' })).toBe('http://localhost:3001');
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


  it('keeps backend status handling when a json response body is malformed', async () => {
    const malformed = new Response('اسم المستخدم أو كلمة المرور غير صحيحين', {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(malformed));

    await expect(http('/api/auth/login')).rejects.toMatchObject({
      status: 401,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحين',
    });
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
