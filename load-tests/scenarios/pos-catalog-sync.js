/**
 * Scenario 1: POS Cashier Catalog Synchronization & Warmup
 * 
 * Objectives:
 * - Simulates 50-100 concurrent cashier terminals querying catalog versions and fetching products.
 * - Guards Invariant PERF-2: Single-pass location stock aggregation (must not freeze CPU or take >500ms).
 * - Guards Invariant PERF-9: POS version engine check using catalog_updated_at trigger.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  DEFAULT_HEADERS,
  AUTH_USERNAME,
  AUTH_PASSWORD,
  STANDARD_THRESHOLDS,
  FAST_THRESHOLDS,
  rampProfile,
  clientIpHeaders,
} from '../config.js';

// Custom metrics
const versionCheckDuration = new Trend('pos_version_duration_ms');
const fullSyncDuration = new Trend('pos_full_sync_duration_ms');
const errorRate = new Rate('pos_sync_errors');

export const options = {
  scenarios: {
    cashier_warmup_and_sync: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: rampProfile(),
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    ...STANDARD_THRESHOLDS,
    pos_version_duration_ms: ['p(95)<150'], // Version check must be sub-150ms
    pos_full_sync_duration_ms: ['p(95)<600'], // Full catalog must be under 600ms even under load
    pos_sync_errors: ['rate<0.01'], // Errors under 1%
  },
};

/**
 * تسجيل دخول يُفشل الاختبار **فوراً** إن فشل.
 *
 * كان `setup()` يتجاهل نتيجة الدخول ويعيد `res.cookies`، وهي بنية k6 تختلف عن الشكل الذي
 * يقبله معامل `cookies` في الطلبات — فالكوكي لم تكن تُرسَل أصلاً. النتيجة: كل طلب يرجع 401،
 * والتقرير يقول "100% فشل" بلا سبب ظاهر، بينما الخطأ في بيانات الدخول لا في السيرفر.
 *
 * الجلسة تُمرَّر بترويسة `X-Session-Id` لأن الباك إند يدعمها صراحةً (`ALLOW_SESSION_ID_HEADER`)
 * وهي أبسط من إدارة الكوكي وCSRF داخل k6.
 */
function loginOrDie() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: AUTH_USERNAME,
    password: AUTH_PASSWORD,
  }), { headers: DEFAULT_HEADERS });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `login failed (HTTP ${res.status}) for user "${AUTH_USERNAME}". `
      + 'Set AUTH_USERNAME / AUTH_PASSWORD (see docs/LOAD_TESTING.md). '
      + `Response: ${String(res.body || '').slice(0, 200)}`,
    );
  }

  let sessionId = '';
  try {
    sessionId = JSON.parse(res.body).sessionId || '';
  } catch (error) {
    throw new Error(`login returned a body k6 could not parse: ${String(res.body || '').slice(0, 200)}`);
  }
  if (!sessionId) throw new Error('login succeeded but returned no sessionId');
  return sessionId;
}

/**
 * Setup: one login for every simulated cashier terminal.
 */
export function setup() {
  return { sessionId: loginOrDie() };
}

export default function (data) {
  const requestParams = {
    headers: { ...DEFAULT_HEADERS, 'X-Session-Id': data.sessionId, ...clientIpHeaders(__VU) },
  };

  group('POS Fast Version Check (PERF-9)', () => {
    const versionUrl = `${BASE_URL}/api/catalog/pos-products/version`;
    const start = Date.now();
    const res = http.get(versionUrl, requestParams);
    const duration = Date.now() - start;
    versionCheckDuration.add(duration);

    const ok = check(res, {
      'version status is 200': (r) => r.status === 200,
      'has version hash': (r) => {
        try {
          const body = JSON.parse(r.body);
          return typeof body.version === 'string' && body.version.length > 0;
        } catch {
          return false;
        }
      },
    });

    if (!ok) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  sleep(0.5);

  // 30% of cashiers perform a catalog sync / product lookup
  if (Math.random() < 0.3) {
    group('POS Full / Incremental Catalog Fetch (PERF-2)', () => {
      const catalogUrl = `${BASE_URL}/api/catalog/pos-products?limit=200`;
      const start = Date.now();
      const res = http.get(catalogUrl, requestParams);
      const duration = Date.now() - start;
      fullSyncDuration.add(duration);

      const ok = check(res, {
        'catalog status is 200': (r) => r.status === 200,
        'has products list': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.products || body.items || body);
          } catch {
            return false;
          }
        },
      });

      if (!ok) {
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
    });
  }

  sleep(1);
}
