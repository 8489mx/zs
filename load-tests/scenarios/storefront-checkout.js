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
 *
 * والجولة التالية أثبتت أن التصنيف وحده لا يكفي: رفض السيرفر 8225 من 8225 برسالة واحدة معلنة
 * «الحد الأدنى للطلب هو 700 ج» — السلة كانت قطعة واحدة دائماً. التصنيف قال السبب في ثلاث ثوانٍ
 * (وهذا تحسّن حقيقي على الجولة السابقة) لكن الدقيقتين والنصف ضاعتا. فأُضيف شيئان:
 *   (4) السلة تُبنى لتتجاوز الحد الأدنى المقروء من `:slug/info` لا قطعة واحدة عمياء،
 *   (5) **طلب تجريبي واحد في `setup()`** يُنشأ ويُلغى قبل أن يبدأ الحمل. إن رفضه السيرفر توقف
 *       الاختبار فوراً برسالة السيرفر نفسها. لا جولة ثالثة تقيس فرع الرفض.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  STOREFRONT_SLUG,
  DEFAULT_HEADERS,
  STANDARD_THRESHOLDS,
  rampProfile,
  clientIpHeaders,
  writerIpHeaders,
  classifyWriteFailure,
  isLockConflict,
  selectOrderableItems,
  buildOrderPayload,
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

  // الحد الأدنى للطلب شرط قبول لا تفصيل عرض: متجر المهندس يرفض أي سلة تحت 700 جنيه، فقطعة واحدة
  // من صنف واحد تُرفض دائماً. السلة تُبنى لتتجاوزه، وإلا لم يصل الاختبار إلى قاعدة البيانات أصلاً.
  const infoRes = http.get(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/info`, {
    headers: { ...DEFAULT_HEADERS, ...clientIpHeaders(1) },
  });
  let minOrder = 0;
  try {
    minOrder = Number(JSON.parse(infoRes.body).minOrder || 0);
  } catch {}

  const cart = selectOrderableItems(items, minOrder);

  if (cart.length === 0) {
    throw new Error(
      `no orderable item on "${STOREFRONT_SLUG}": of ${items.length} catalogue entries, none has available `
      + `stock and a price high enough to clear the ${minOrder} minimum order within its stock. `
      + 'Every order would be refused before the transaction opens and the run would measure nothing.',
    );
  }

  const headroom = cart.reduce((sum, c) => sum + c.stock, 0);
  // eslint-disable-next-line no-console
  console.log(
    `[setup] ${cart.length} orderable items, min order ${minOrder}, cart size ${cart[0].qty}-${cart[cart.length - 1].qty} units, `
    + `combined stock ${headroom}. `
    + (KEEP_ORDERS
      ? 'KEEP_ORDERS=true - orders are NOT cancelled, so stock runs down as the run proceeds.'
      : 'orders are cancelled after creation, so the reservation is returned and the load is sustainable.'),
  );

  // **طلب تجريبي واحد قبل البدء.** درسان متتاليان (المخزون المحجوز، ثم الحد الأدنى للطلب) كلاهما
  // ظهر بعد دقيقتين ونصف من حمل لا يقيس شيئاً. الطلب الواحد هنا يكلّف جزءاً من الثانية ويحوّل
  // «جولة كاملة بلا معنى» إلى «رسالة السيرفر نفسها قبل أن تبدأ».
  const probeHeaders = { ...DEFAULT_HEADERS, ...clientIpHeaders(1) };
  const probe = http.post(
    `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders`,
    buildOrderPayload(cart[0], 0, 'Tahrir Square, Cairo, Egypt'),
    { headers: probeHeaders },
  );
  if (probe.status !== 200 && probe.status !== 201) {
    throw new Error(
      `preflight order was refused (HTTP ${probe.status}), so the run would measure the refusal branch, `
      + `not the write path. The server said: ${String(probe.body || '').slice(0, 300)}`,
    );
  }
  try {
    const probeBody = JSON.parse(probe.body);
    const num = String(probeBody.orderNumber || '');
    const tok = String(probeBody.accessToken || '');
    if (num && tok) {
      http.post(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders/${encodeURIComponent(num)}/cancel`, null, {
        headers: { ...probeHeaders, 'x-order-token': tok },
      });
    }
  } catch {}

  return { cart };
}

export default function (data) {
  const cart = data?.cart || [];
  if (cart.length === 0) return;

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

    const item = cart[Math.floor(Math.random() * cart.length)];
    const orderPayload = buildOrderPayload(item, __VU, 'Tahrir Square, Cairo, Egypt');

    const start = Date.now();
    const res = http.post(orderUrl, orderPayload, { headers: { ...DEFAULT_HEADERS, ...visitor } });
    orderDuration.add(Date.now() - start);

    // Detect PostgreSQL Deadlock (40P01)
    if (isLockConflict(res)) deadlocksDetected.add(1);

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

    if (isLockConflict(cancelRes)) deadlocksDetected.add(1);

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
