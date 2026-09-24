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
  STANDARD_THRESHOLDS,
  rampProfile,
  clientIpHeaders,
  writerIpHeaders,
  classifyWriteFailure,
  isLockConflict,
  selectOrderableItems,
  buildOrderPayload,
  loginOrDie,
  RAMP_SECONDS,
  HOLD_SECONDS,
} from '../config.js';

const combinedDuration = new Trend('stress_all_duration_ms');
const deadlocksCount = new Counter('stress_all_deadlocks_count');
const rejectRateLimited = new Counter('stress_all_rejects_rate_limited');
const rejectOutOfStock = new Counter('stress_all_rejects_out_of_stock');
const rejectBusiness = new Counter('stress_all_rejects_business');
const rejectServer = new Counter('stress_all_rejects_server');

/** الطلبات تُلغى افتراضياً فيعود الحجز ويبقى الحمل مستمراً — انظر storefront-checkout.js. */
const KEEP_ORDERS = String(__ENV.KEEP_ORDERS || '').toLowerCase() === 'true';

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
    stress_all_rejects_server: ['count==0'],
  },
};

export function setup() {
  const session = loginOrDie();

  // أصناف **بمخزون متاح فعلي** فقط. الاكتفاء بأول عشرة أصناف كما تأتي جعل جولة 24 سبتمبر تقيس
  // مسار الرفض: كل الطلبات ارتدت من تحقّق المخزون قبل أن تُفتح معاملة واحدة.
  const catalogRes = http.get(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/catalog`, { headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(1) } });
  let items = [];
  try {
    const data = JSON.parse(catalogRes.body);
    items = data.products || data.items || (Array.isArray(data) ? data : []);
  } catch {}
  // الحد الأدنى للطلب شرط قبول: سلة من قطعة واحدة رُفضت 8225 مرة من 8225 على متجر حدّه 700 جنيه.
  let minOrder = 0;
  try {
    const infoRes = http.get(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/info`, { headers: DEFAULT_HEADERS });
    minOrder = Number(JSON.parse(infoRes.body).minOrder || 0);
  } catch {}

  const cart = selectOrderableItems(items, minOrder);

  if (cart.length === 0) {
    throw new Error(
      `storefront "${STOREFRONT_SLUG}" has no orderable item (available stock and a price that clears the `
      + `${minOrder} minimum), so the write half of this stress run would measure refusals, not the database.`,
    );
  }

  // طلب تجريبي واحد يُنشأ ويُلغى: أرخص بكثير من اكتشاف الرفض بعد ثلاث دقائق من حمل بلا معنى.
  const probe = http.post(
    `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders`,
    buildOrderPayload(cart[0], 0, 'Nasr City, Cairo'),
    { headers: DEFAULT_HEADERS },
  );
  if (probe.status !== 200 && probe.status !== 201) {
    throw new Error(
      `preflight order was refused (HTTP ${probe.status}); the write half would measure the refusal branch. `
      + `The server said: ${String(probe.body || '').slice(0, 300)}`,
    );
  }
  try {
    const pb = JSON.parse(probe.body);
    if (pb.orderNumber && pb.accessToken) {
      http.post(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders/${encodeURIComponent(pb.orderNumber)}/cancel`,
        null, { headers: { ...DEFAULT_HEADERS, 'x-order-token': pb.accessToken } });
    }
  } catch {}

  return {
    sessionId: session.sessionId,
    cookieName: session.cookieName,
    cart,
  };
}

export function posScenario(data) {
  const params = {
    headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(__VU) },
    cookies: { [data.cookieName]: data.sessionId },
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
  const cart = data?.cart || [];
  if (cart.length === 0) return;
  const item = cart[Math.floor(Math.random() * cart.length)];
  // زائر جديد لكل تكرار: حدّ O60 على إنشاء الطلب مفتاحه العنوان — انظر config.js:writerIpHeaders.
  const visitor = writerIpHeaders(__VU, __ITER);

  const orderPayload = buildOrderPayload(item, __VU, 'Nasr City, Cairo');

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders`, orderPayload, {
    headers: { ...DEFAULT_HEADERS, ...visitor },
  });
  combinedDuration.add(Date.now() - start);

  if (isLockConflict(res)) deadlocksCount.add(1);

  const created = check(res, {
    'storefront order created or valid': (r) => r.status === 200 || r.status === 201,
  });

  if (!created) {
    const reason = classifyWriteFailure(res);
    if (reason === 'rate_limited') rejectRateLimited.add(1);
    else if (reason === 'out_of_stock') rejectOutOfStock.add(1);
    else if (reason === 'server_error' || reason === 'no_response') rejectServer.add(1);
    else rejectBusiness.add(1);
    if (__VU <= 2 && __ITER < 3) {
      // eslint-disable-next-line no-console
      console.warn(`[order rejected: ${reason}] HTTP ${res.status} - ${String(res.body || '').slice(0, 220)}`);
    }
    sleep(1.5);
    return;
  }

  if (!KEEP_ORDERS) {
    // الإلغاء يعيد الحجز فيبقى نصف الكتابة حياً طوال الجولة، وهو بنفسه معاملة ثانية على نفس الأقفال.
    let orderNumber = '';
    let accessToken = '';
    try {
      const body = JSON.parse(res.body);
      orderNumber = String(body.orderNumber || body.order_number || '');
      accessToken = String(body.accessToken || '');
    } catch {}
    if (orderNumber && accessToken) {
      const cancelRes = http.post(
        `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders/${encodeURIComponent(orderNumber)}/cancel`,
        null,
        { headers: { ...DEFAULT_HEADERS, ...visitor, 'x-order-token': accessToken } },
      );
      if (isLockConflict(cancelRes)) deadlocksCount.add(1);
      check(cancelRes, {
        'storefront order cancelled, reservation returned': (r) => r.status === 200 || r.status === 201,
      });
    }
  }

  sleep(1.5);
}

export function healthScenario() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health probe ok': (r) => r.status === 200,
  });
  sleep(5);
}
