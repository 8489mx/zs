/**
 * Combined Enterprise Stress Test Scenario
 * 
 * Objectives:
 * - Runs a multi-stage stress test simultaneously exercising:
 *   1. POS Catalog sync (50 cashiers)
 *   2. Online Storefront checkouts (50 shoppers)
 *   3. Background API checks & health probes
 * - Asserts zero deadlocks (SQLSTATE 40P01) across the entire platform.
 * - Asserts p95 response time remains within budget on Oracle Cloud VPS.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  STOREFRONT_SLUG,
  DEFAULT_HEADERS,
  AUTH_USERNAME,
  AUTH_PASSWORD,
  generateRandomPhone,
  STANDARD_THRESHOLDS,
  rampProfile,
  clientIpHeaders,
  RAMP_SECONDS,
  HOLD_SECONDS,
} from '../config.js';

const combinedDuration = new Trend('stress_all_duration_ms');
const deadlocksCount = new Counter('stress_all_deadlocks_count');

export const options = {
  scenarios: {
    // POS Cashiers
    pos_traffic: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: rampProfile(),
      exec: 'posScenario',
    },
    // Storefront Customers
    storefront_traffic: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: rampProfile(),
      exec: 'storefrontScenario',
    },
    // Health and Metrics monitoring
    health_probes: {
      executor: 'constant-vus',
      vus: 2,
      duration: `${RAMP_SECONDS + HOLD_SECONDS + 10}s`,
      exec: 'healthScenario',
    },
  },
  thresholds: {
    ...STANDARD_THRESHOLDS,
    stress_all_deadlocks_count: ['count==0'],
  },
};

/**
 * تسجيل دخول يُفشل الاختبار **فوراً** إن فشل.
 *
 * كان `setup()` يتجاهل نتيجة الدخول ويعيد `res.cookies`، وهي بنية k6 تختلف عن الشكل الذي
 * يقبله معامل `cookies` في الطلبات — فالكوكي لم تكن تُرسَل أصلاً. النتيجة: كل طلب يرجع 401،
 * والتقرير يقول "100% فشل" بلا سبب ظاهر، بينما الخطأ في بيانات الدخول لا في السيرفر.
 *
 * الجلسة تُمرَّر في **كوكي** لا في ترويسة: `ALLOW_SESSION_ID_HEADER` معطَّل في وضع السحابة عمداً،
 * فالاختبار يتصرف كالمتصفح بدل أن يطلب من الإنتاج تخفيف حمايته من أجله.
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

export function setup() {
  const sessionId = loginOrDie();

  // Get Storefront product IDs
  const catalogRes = http.get(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/catalog`, { headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(__VU) } });
  let productIds = [1];
  try {
    const data = JSON.parse(catalogRes.body);
    const items = data.products || data.items || data;
    if (Array.isArray(items) && items.length > 0) {
      productIds = items.slice(0, 10).map((p) => p.id).filter(Boolean);
    }
  } catch {}

  return {
    sessionId,
    productIds,
  };
}

export function posScenario(data) {
  const params = {
    headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(__VU) },
    cookies: { [SESSION_COOKIE_NAME]: data.sessionId },
  };

  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/catalog/pos-products/version`, params);
  combinedDuration.add(Date.now() - start);

  check(res, {
    'pos version is 200': (r) => r.status === 200,
  });

  sleep(1);
}

export function storefrontScenario(data) {
  const productIds = data?.productIds || [1];
  const prodId = productIds[Math.floor(Math.random() * productIds.length)];

  const orderPayload = JSON.stringify({
    customerName: `Shopper VU-${__VU}-${Date.now() % 10000}`,
    customerPhone: generateRandomPhone(),
    customerAddress: 'Nasr City, Cairo',
    items: [{ productId: prodId, quantity: 1 }],
    paymentMethod: 'cash_on_delivery',
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders`, orderPayload, {
    headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(__VU) },
  });
  combinedDuration.add(Date.now() - start);

  if (res.body && (res.body.includes('40P01') || res.body.toLowerCase().includes('deadlock'))) {
    deadlocksCount.add(1);
  }

  check(res, {
    'storefront order created or valid': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1.5);
}

export function healthScenario() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health probe ok': (r) => r.status === 200,
  });
  sleep(5);
}
