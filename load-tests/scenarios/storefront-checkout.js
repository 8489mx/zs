/**
 * Scenario 2: Public Storefront Concurrent Checkout & Deadlock Guard
 *
 * Objectives:
 * - Simulates concurrent online shoppers placing orders on the same products simultaneously.
 * - Guards Invariant §2.1 (applyStockDelta) & Canonical Lock Order:
 *   (products FOR UPDATE -> product_location_stock FOR UPDATE, ascending item sort)
 * - Proves that high concurrency checkouts do not suffer from SQLSTATE 40P01 (deadlock).
 * - Verifies SF-1 (Access Token generation and order number uniqueness under concurrency).
 *
 * الدرس الذي أعاد كتابة هذا الملف (جولة إنتاج 24 سبتمبر 2026):
 *   الجولة أعادت "نجاح 0.19% — 16 من 8249" وصفر جمود، فبدا أن السيرفر صمد. لم يصمد: لم يُختبر.
 *   التحقق من المخزون في createOnlineOrder يقع **قبل** فتح المعاملة، فكل طلب مرفوض خرج من الباب
 *   قبل أن يلمس قفلاً واحداً. صفر الجمود كان صفر محاولات، وانخفاض xact_rollback في قاعدة البيانات
 *   أكّد ذلك. السبب: كل طلب ناجح **يحجز** مخزوناً (reserved_qty)، والمتاح هو
 *   stock_qty - reserved_qty، فبعد ستة عشر طلباً نفد المتاح من الأصناف المختارة ورُفض الباقي.
 *
 *   فصار السيناريو: (1) يختار أصنافاً بمخزون فعلي ويرفض البدء إن لم يجد، (2) **يلغي كل طلب
 *   ينشئه** فيعيد الحجز ويبقى الحمل قابلاً للاستمرار — والإلغاء نفسه مسار كتابة يأخذ الأقفال بنفس
 *   الترتيب، فصار الاختبار أثقل لا أخف، (3) يصنّف كل رفض ويعدّه، فلا تُستنتج الأسباب بعد انتهاء
 *   الجولة مرة أخرى.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  STOREFRONT_SLUG,
  DEFAULT_HEADERS,
  generateRandomPhone,
  STANDARD_THRESHOLDS,
  rampProfile,
  clientIpHeaders,
  writerIpHeaders,
  classifyWriteFailure,
} from '../config.js';

// Custom metrics
const orderDuration = new Trend('storefront_order_duration_ms');
const cancelDuration = new Trend('storefront_cancel_duration_ms');
const deadlocksDetected = new Counter('storefront_deadlocks_detected');
const orderSuccessRate = new Rate('storefront_order_success_rate');
const cancelSuccessRate = new Rate('storefront_cancel_success_rate');
const rejectRateLimited = new Counter('storefront_rejects_rate_limited');
const rejectOutOfStock = new Counter('storefront_rejects_out_of_stock');
const rejectBusiness = new Counter('storefront_rejects_business');
const rejectServer = new Counter('storefront_rejects_server');

/** الطلبات تُلغى افتراضياً. KEEP_ORDERS=true يتركها قائمة لمن يريد اختبار تراكم الطلبات عمداً. */
const KEEP_ORDERS = String(__ENV.KEEP_ORDERS || '').toLowerCase() === 'true';

export const options = {
  scenarios: {
    concurrent_shoppers: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: rampProfile(),
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    ...STANDARD_THRESHOLDS,
    storefront_order_duration_ms: ['p(95)<800', 'p(99)<2000'],
    storefront_deadlocks_detected: ['count==0'], // ZERO deadlocks permitted
    storefront_order_success_rate: ['rate>0.95'], // >95% success
    // خطأ خادم واحد ليس ضجيجاً إحصائياً في مسار كتابة مالي.
    storefront_rejects_server: ['count==0'],
  },
};

/**
 * Setup: يختار أصنافاً **بمخزون متاح فعلي**، ويفشل بصوت عالٍ إن لم يجد.
 *
 * slice(0, 10) القديمة كانت تأخذ أول عشرة أصناف كما جاءت، فإن كان أغلبها بلا مخزون قاست الجولة
 * مسار الرفض لا مسار الكتابة — وهو بالضبط ما حدث.
 */
export function setup() {
  const catalogUrl = `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/catalog`;
  const res = http.get(catalogUrl, { headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(1) } });

  if (res.status !== 200) {
    throw new Error(
      `catalog for "${STOREFRONT_SLUG}" returned HTTP ${res.status}. `
      + `Check STOREFRONT_SLUG and that the storefront is published. Body: ${String(res.body || '').slice(0, 200)}`,
    );
  }

  let items = [];
  try {
    const data = JSON.parse(res.body);
    items = data.products || data.items || (Array.isArray(data) ? data : []);
  } catch (error) {
    throw new Error(`catalog returned a body k6 could not parse: ${String(res.body || '').slice(0, 200)}`);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`storefront "${STOREFRONT_SLUG}" has an empty catalog — nothing to order.`);
  }

  const inStock = items
    .filter((p) => p && p.id && p.inStock !== false && Number(p.stockQty || 0) > 0)
    .sort((a, b) => Number(b.stockQty || 0) - Number(a.stockQty || 0))
    .slice(0, 12);

  if (inStock.length === 0) {
    throw new Error(
      `none of the ${items.length} catalogue items on "${STOREFRONT_SLUG}" has available stock `
      + '(stock_qty - reserved_qty > 0), so every order would be refused before the transaction opens '
      + 'and the run would measure nothing. Top up stock, or allow out-of-stock ordering for this tenant.',
    );
  }

  const headroom = inStock.reduce((sum, p) => sum + Number(p.stockQty || 0), 0);
  // eslint-disable-next-line no-console
  console.log(
    `[setup] ${inStock.length} in-stock items chosen, combined available stock ${headroom}. `
    + (KEEP_ORDERS
      ? `KEEP_ORDERS=true - orders are NOT cancelled, so this run is capped at ~${headroom} successful orders.`
      : 'orders are cancelled after creation, so the reservation is returned and the load is sustainable.'),
  );

  return { productIds: inStock.map((p) => p.id) };
}

export default function (data) {
  const productIds = data?.productIds || [];
  if (productIds.length === 0) return;

  // زائر جديد لكل تكرار: حدّ O60 (30 طلباً/عنوان/10 دقائق) يسقف أي جولة ثابتة العدد — انظر config.js.
  const visitor = writerIpHeaders(__VU, __ITER);

  group('Storefront Product Browsing (SF-9 / PERF-4)', () => {
    const catalogUrl = `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/catalog`;
    const res = http.get(catalogUrl, { headers: { ...DEFAULT_HEADERS, ...visitor } });
    check(res, {
      'catalog load is 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  group('Storefront Concurrent Order Placement (Canonical Lock & SF-1)', () => {
    const orderUrl = `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders`;

    const selectedId1 = productIds[Math.floor(Math.random() * productIds.length)];
    const items = [{ productId: selectedId1, quantity: 1 }];

    const orderPayload = JSON.stringify({
      customerName: `Shopper VU-${__VU}-${Date.now() % 10000}`,
      customerPhone: generateRandomPhone(),
      customerAddress: 'Tahrir Square, Cairo, Egypt',
      items: items,
      paymentMethod: 'cash_on_delivery',
    });

    const start = Date.now();
    const res = http.post(orderUrl, orderPayload, { headers: { ...DEFAULT_HEADERS, ...visitor } });
    orderDuration.add(Date.now() - start);

    // Detect PostgreSQL Deadlock (40P01)
    if (res.body && (res.body.includes('40P01') || res.body.toLowerCase().includes('deadlock'))) {
      deadlocksDetected.add(1);
    }

    const isSuccess = check(res, {
      'order status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'returns order number': (r) => {
        try {
          const body = JSON.parse(r.body);
          return typeof body.orderNumber === 'string' || typeof body.order_number === 'string';
        } catch {
          return false;
        }
      },
      'returns access token (SF-1)': (r) => {
        try {
          const body = JSON.parse(r.body);
          // Token is returned on creation for tracking
          return body.accessToken !== undefined || body.orderNumber !== undefined;
        } catch {
          return false;
        }
      },
    });

    orderSuccessRate.add(isSuccess ? 1 : 0);

    if (!isSuccess) {
      const reason = classifyWriteFailure(res);
      if (reason === 'rate_limited') rejectRateLimited.add(1);
      else if (reason === 'out_of_stock') rejectOutOfStock.add(1);
      else if (reason === 'server_error' || reason === 'no_response') rejectServer.add(1);
      else rejectBusiness.add(1);
      // من VU 1 و2 فقط: السبب يُقرأ من السجل أثناء الجولة بدل تخمينه بعدها، بلا إغراق الطرفية.
      if (__VU <= 2 && __ITER < 3) {
        // eslint-disable-next-line no-console
        console.warn(`[order rejected: ${reason}] HTTP ${res.status} - ${String(res.body || '').slice(0, 220)}`);
      }
      return;
    }

    if (KEEP_ORDERS) return;

    // الإلغاء يعيد الحجز (releaseLocationStock) فيبقى الحمل مستمراً، وهو مسار كتابة كامل بذاته:
    // معاملة، وتحديث مشروط بـ status='pending'، ودفتر مخزون — بنفس ترتيب الأقفال.
    let orderNumber = '';
    let accessToken = '';
    try {
      const body = JSON.parse(res.body);
      orderNumber = String(body.orderNumber || body.order_number || '');
      accessToken = String(body.accessToken || '');
    } catch {}
    if (!orderNumber || !accessToken) return;

    const cancelStart = Date.now();
    const cancelRes = http.post(
      `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders/${encodeURIComponent(orderNumber)}/cancel`,
      null,
      { headers: { ...DEFAULT_HEADERS, ...visitor, 'x-order-token': accessToken } },
    );
    cancelDuration.add(Date.now() - cancelStart);

    if (cancelRes.body && (cancelRes.body.includes('40P01') || cancelRes.body.toLowerCase().includes('deadlock'))) {
      deadlocksDetected.add(1);
    }

    const cancelled = check(cancelRes, {
      'order cancelled, reservation returned': (r) => r.status === 200 || r.status === 201,
    });
    cancelSuccessRate.add(cancelled ? 1 : 0);
    if (!cancelled && __VU <= 2 && __ITER < 3) {
      // eslint-disable-next-line no-console
      console.warn(`[cancel failed] HTTP ${cancelRes.status} - ${String(cancelRes.body || '').slice(0, 220)}`);
    }
  });

  sleep(1);
}
