import assert from 'node:assert/strict';

const DEFAULT_BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3001';
const DEFAULT_USERNAME = process.env.E2E_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || 'owner';
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || '';

type JsonValue = Record<string, any>;

export function uniqueSuffix(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function parseSetCookie(setCookie: string): { name: string; value: string } | null {
  const first = setCookie.split(';')[0] || '';
  const index = first.indexOf('=');
  if (index <= 0) return null;
  return { name: first.slice(0, index).trim(), value: first.slice(index + 1).trim() };
}

export class E2EClient {
  readonly baseUrl: string;
  private cookies = new Map<string, string>();

  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  private updateCookies(response: Response): void {
    const headers = response.headers as any;
    const setCookies: string[] = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (headers.raw?.()['set-cookie'] || []);
    for (const raw of setCookies) {
      const parsed = parseSetCookie(raw);
      if (!parsed) continue;
      this.cookies.set(parsed.name, parsed.value);
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<{ response: Response; json: JsonValue | null }> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const cookieHeader = this.cookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      const csrfToken = this.cookies.get('csrf_token');
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    this.updateCookies(response);
    const text = await response.text();
    let json: JsonValue | null = null;
    if (text) {
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
    }
    return { response, json };
  }

  async login(username = DEFAULT_USERNAME, password = DEFAULT_PASSWORD): Promise<JsonValue> {
    assert.ok(username, 'E2E username is required');
    assert.ok(password, 'E2E password is required');
    const { response, json } = await this.request('POST', '/api/auth/login', { username, password });
    assert.equal(response.status, 201, `Login failed: ${JSON.stringify(json)}`);
    assert.ok(this.cookies.get('session_id'), 'session_id cookie missing after login');
    assert.ok(this.cookies.get('csrf_token'), 'csrf_token cookie missing after login');
    return json || {};
  }

  async get(path: string, expectedStatus = 200): Promise<JsonValue> {
    const { response, json } = await this.request('GET', path);
    assert.equal(response.status, expectedStatus, `GET ${path} failed: ${JSON.stringify(json)}`);
    return json || {};
  }

  async post(path: string, body: unknown, expectedStatus = 201): Promise<JsonValue> {
    const { response, json } = await this.request('POST', path, body);
    assert.equal(response.status, expectedStatus, `POST ${path} failed: ${JSON.stringify(json)}`);
    return json || {};
  }

  async put(path: string, body: unknown, expectedStatus = 200): Promise<JsonValue> {
    const { response, json } = await this.request('PUT', path, body);
    assert.equal(response.status, expectedStatus, `PUT ${path} failed: ${JSON.stringify(json)}`);
    return json || {};
  }

  async del(path: string, expectedStatus = 200): Promise<JsonValue> {
    const { response, json } = await this.request('DELETE', path);
    assert.equal(response.status, expectedStatus, `DELETE ${path} failed: ${JSON.stringify(json)}`);
    return json || {};
  }
}

export async function ensureRunning(baseUrl = DEFAULT_BASE_URL): Promise<void> {
  const res = await fetch(`${baseUrl}/health`).catch(() => null);
  assert.ok(res, `Backend is not reachable at ${baseUrl}`);
  assert.equal(res!.status, 200, `Health check failed for ${baseUrl}`);
}

export async function loginClient(): Promise<E2EClient> {
  await ensureRunning();
  const client = new E2EClient();
  await client.login();
  return client;
}

export function expectArray(value: unknown, label: string): any[] {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  return value as any[];
}

export function findByName<T extends Record<string, any>>(rows: T[], name: string): T {
  const found = rows.find((row) => String(row.name || '') === name);
  assert.ok(found, `Could not find row with name ${name}`);
  return found!;
}
