/**
 * Scenario 5: كاشيرات تبيع فعلاً — مسار الفاتورة الكامل تحت الحمل
 *
 * هذا هو السيناريو الذي كان ناقصاً. الجناح كله قبله كان **قراءة**: «مزامنة الكاشير» تسأل عن نسخة
 * الكتالوج ولا تصدر فاتورة واحدة، وجولة الإنتاج الأولى قاست السيرفر ولم تقس النظام.
 *
 * `POST /api/sales` ليس طلباً واحداً: هو معاملة تكتب في `sales` و`sale_items`، وتخصم المخزون عبر
 * `applyStockDelta` بالترتيب القانوني للأقفال، وترحّل قيداً مزدوجاً (وتُنشئ شجرة الحسابات إن لم
 * تكن موجودة — `ensureTenantFoundation`)، وتحدّث صف **الوردية** في `cashier_shifts`. الصف الأخير
 * هو المكان الذي يتزاحم فيه كل كاشير على نفسه: كل بيعة نقدية تحدّثه، فيتسلسل بيع الكاشير الواحد.
 *
 * ثلاث مجموعات تعمل معاً:
 *   cashiers    — كل VU يبيع أصنافاً عشوائية من الكتالوج (الحمل الواقعي).
 *   hot_product — كل VU يبيع **نفس الصنف**، فيتزاحم الجميع على صف واحد في `products` وصف واحد في
 *                 `product_location_stock`. هنا يظهر خرق ترتيب الأقفال إن وُجد، لا في الحمل الموزّع.
 *   health      — مسبار صحة يكشف إن كان الصندوق ما زال يرد أثناء ذلك.
 *
 * ⚠️ الفواتير **لا تُلغى**: البيع حركة حقيقية تخصم مخزوناً وترحّل قيداً، والقيد المزدوج غير قابل
 *    للحذف بحكم ثابت معماري. لا تشغّل هذا على منشأة حقيقية. الغرض منه منشأة اختبار بمخزون وفير.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
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
  selectOrderableItems,
  buildOrderPayload,
  loginOrDie,
  sessionParams,
  writeParams,
  RAMP_SECONDS,
  HOLD_SECONDS,
} from '../config.js';

const saleDuration = new Trend('sale_duration_ms');
const hotSaleDuration = new Trend('hot_product_sale_duration_ms');
const saleSuccessRate = new Rate('sale_success_rate');
const hotSaleSuccessRate = new Rate('hot_product_sale_success_rate');
const deadlocks = new Counter('sell_deadlocks_detected');
const rejectStock = new Counter('sell_rejects_out_of_stock');
const rejectShift = new Counter('sell_rejects_no_open_shift');
const rejectBusiness = new Counter('sell_rejects_business');
const rejectServer = new Counter('sell_rejects_server');
const unitsSold = new Counter('sell_units_sold');

/**
 * كاشيرات متعددة: `CASHIERS=user1:pass1,user2:pass2`. الوردية في `cashier_shifts` مفتاحها
 * `opened_by`، أي **مستخدم واحد = وردية واحدة**، فعدد المستخدمين هو عدد الورديات المتزامنة فعلاً.
 * بمستخدم واحد يبقى الاختبار صحيحاً لكنه يقيس تزاحم كاشير واحد على ورديته، لا عدة كاشيرات.
 */
function cashierCredentials() {
  const raw = String(__ENV.CASHIERS || '').trim();
  if (!raw) return [{ username: AUTH_USERNAME, password: AUTH_PASSWORD }];
  return raw
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const at = pair.indexOf(':');
      if (at < 1) throw new Error(`CASHIERS entry "${pair}" must be username:password`);
      return { username: pair.slice(0, at), password: pair.slice(at + 1) };
    });
}

/** نسبة الحمل التي تذهب إلى الصنف الساخن. الباقي بيع موزّع. */
const HOT_SHARE = Math.min(0.9, Math.max(0, Number(__ENV.HOT_PRODUCT_SHARE || 0.25)));
const WITH_STOREFRONT = String(__ENV.WITH_STOREFRONT || 'true').toLowerCase() !== 'false';

function stagesFor(share) {
  return rampProfile().map((stage) => ({
    duration: stage.duration,
    target: Math.max(stage.target > 0 ? 1 : 0, Math.round(stage.target * share)),
  }));
}

export const options = {
  scenarios: {
    cashiers: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: stagesFor(1 - HOT_SHARE),
      exec: 'cashierScenario',
      gracefulRampDown: '10s',
    },
    hot_product: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: stagesFor(HOT_SHARE),
      exec: 'hotProductScenario',
      gracefulRampDown: '10s',
    },
    health: {
      executor: 'constant-vus',
      vus: 2,
      duration: `${RAMP_SECONDS + HOLD_SECONDS + 10}s`,
      exec: 'healthScenario',
    },
  },
  thresholds: {
    ...STANDARD_THRESHOLDS,
    sale_duration_ms: ['p(95)<1500', 'p(99)<3000'],
    sale_success_rate: ['rate>0.95'],
    hot_product_sale_success_rate: ['rate>0.90'], // تزاحم مقصود على صف واحد
    sell_deadlocks_detected: ['count==0'],
    sell_rejects_server: ['count==0'],
  },
};

/** يفتح وردية للمستخدم إن لم تكن له واحدة مفتوحة، ويعيد معرّفها. */
function ensureOpenShift(session) {
  const listed = http.get(`${BASE_URL}/api/cashier-shifts?filter=open`, sessionParams(session));
  if (listed.status === 200) {
    try {
      const rows = JSON.parse(listed.body).cashierShifts || [];
      const mine = rows.find((r) => String(r.status || '').toLowerCase() === 'open');
      if (mine) return Number(mine.id);
    } catch {}
  }

  const opened = http.post(
    `${BASE_URL}/api/cashier-shifts/open`,
    JSON.stringify({ openingCash: 0, note: 'load test' }),
    writeParams(session),
  );
  if (opened.status !== 200 && opened.status !== 201) {
    throw new Error(
      `could not open a cashier shift for "${session.username}" (HTTP ${opened.status}). `
      + 'A POS sale needs one unless requireCashierShiftForSales is false. '
      + `Server said: ${String(opened.body || '').slice(0, 250)}`,
    );
  }
  return 0; // الوردية مفتوحة؛ معرّفها لا يلزم البيع نفسه.
}

function buildSalePayload(items) {
  const lines = items.map((p) => ({ productId: p.id, qty: p.qty, price: p.price }));
  const total = Math.round(lines.reduce((sum, l) => sum + l.price * l.qty, 0) * 100) / 100;
  return {
    body: JSON.stringify({
      paymentType: 'cash',
      paymentChannel: 'cash',
      source: 'pos',
      items: lines,
      payments: [{ paymentChannel: 'cash', amount: total }],
      tenderedAmount: total,
      note: 'load test',
    }),
    total,
    units: lines.reduce((sum, l) => sum + l.qty, 0),
  };
}

export function setup() {
  const credentials = cashierCredentials();
  const sessions = credentials.map((c) => loginOrDie(c.username, c.password));

  // كتالوج نقطة البيع بجلسة الكاشير الأول.
  const catalogRes = http.get(`${BASE_URL}/api/catalog/pos-products?limit=500`, sessionParams(sessions[0]));
  if (catalogRes.status !== 200) {
    throw new Error(`POS catalog returned HTTP ${catalogRes.status}: ${String(catalogRes.body || '').slice(0, 200)}`);
  }
  let rows = [];
  try {
    const parsed = JSON.parse(catalogRes.body);
    rows = parsed.products || parsed.items || (Array.isArray(parsed) ? parsed : []);
  } catch {
    throw new Error(`POS catalog body could not be parsed: ${String(catalogRes.body || '').slice(0, 200)}`);
  }

  // `mapPosProduct` يعيد `id` نصاً و`retailPrice` و`globalStock`. ويُستبعد:
  //   - `itemType !== 'product'`: الخدمات والمواد الخام ليست مبيعات نقطة بيع عادية،
  //   - `trackSerials`: الفاتورة تحتاج أرقاماً تسلسلية حقيقية وإلا رُفضت لسبب ليس أداءً،
  //   - `hasBom`: التجميعات تسلك مساراً آخر يخلط القياس.
  const sellable = rows
    .map((p) => ({
      id: Number(p.id),
      price: Number(p.retailPrice ?? p.retail_price ?? 0),
      stock: Number(p.globalStock ?? p.stock ?? 0),
      serials: Boolean(p.trackSerials),
      bom: Boolean(p.hasBom),
      type: String(p.itemType || 'product'),
      qty: 1,
    }))
    .filter((p) => p.id > 0 && p.price > 0 && p.stock > 0 && p.type === 'product' && !p.serials && !p.bom)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 120);

  if (sellable.length === 0) {
    throw new Error(
      `no sellable product in the POS catalog (${rows.length} rows read): each one is priced at zero, out of `
      + 'stock, a service, serial-tracked or a BOM combo. Every sale would be refused before the transaction '
      + 'opens and the run would measure nothing.',
    );
  }

  // البيع **يستهلك** المخزون نهائياً (لا إلغاء، والقيد المزدوج لا يُحذف). لو المخزون أقل مما
  // ستستهلكه الجولة فالنتيجة ستنقلب إلى قياس فرع «نفد المخزون» في منتصفها.
  const headroom = sellable.reduce((sum, p) => sum + p.stock, 0);
  const hot = sellable[0];
  // eslint-disable-next-line no-console
  console.log(
    `[setup] ${sessions.length} cashier session(s), ${sellable.length} sellable products, `
    + `${headroom} units of headroom. Hot product #${hot.id} carries ${Math.round(HOT_SHARE * 100)}% of the load `
    + `with ${hot.stock} units. Invoices are NOT reversible - this must not be a live tenant.`,
  );

  for (const session of sessions) ensureOpenShift(session);

  // طلب تجريبي واحد قبل الحمل: ثلاث جولات إنتاج سابقة ضاعت لأن الرفض ظهر بعد دقيقتين ونصف.
  const probe = buildSalePayload([{ ...sellable[0], qty: 1 }]);
  const probeRes = http.post(`${BASE_URL}/api/sales`, probe.body, writeParams(sessions[0], {
    'x-idempotency-key': `loadtest-probe-${Date.now()}`,
  }));
  if (probeRes.status !== 200 && probeRes.status !== 201) {
    throw new Error(
      `preflight sale was refused (HTTP ${probeRes.status}), so the run would measure the refusal branch, `
      + `not the write path. The server said: ${String(probeRes.body || '').slice(0, 300)}`,
    );
  }

  let cart = [];
  if (WITH_STOREFRONT) {
    const sf = http.get(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/catalog`, { headers: DEFAULT_HEADERS });
    let items = [];
    try {
      const parsed = JSON.parse(sf.body);
      items = parsed.products || parsed.items || [];
    } catch {}
    let minOrder = 0;
    try {
      const info = http.get(`${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/info`, { headers: DEFAULT_HEADERS });
      minOrder = Number(JSON.parse(info.body).minOrder || 0);
    } catch {}
    cart = selectOrderableItems(items, minOrder);
  }

  return { sessions, sellable, hot, cart };
}

/** كاشير يبيع أصنافاً عشوائية: الحمل الواقعي. */
export function cashierScenario(data) {
  const session = data.sessions[__VU % data.sessions.length];
  const pool = data.sellable;

  const lineCount = 1 + Math.floor(Math.random() * 3);
  const chosen = [];
  const seen = {};
  for (let i = 0; i < lineCount; i += 1) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (seen[pick.id]) continue; // سطران لنفس الصنف مرفوضان (ensureUniqueFlowItems)
    seen[pick.id] = true;
    chosen.push({ ...pick, qty: 1 + Math.floor(Math.random() * 2) });
  }

  postSale(session, chosen, saleDuration, saleSuccessRate);

  // متسوّق إلكتروني يشتري في نفس اللحظة على نفس المخزون.
  if (data.cart && data.cart.length > 0 && Math.random() < 0.35) {
    const item = data.cart[Math.floor(Math.random() * data.cart.length)];
    const res = http.post(
      `${BASE_URL}/api/storefront/${STOREFRONT_SLUG}/orders`,
      buildOrderPayload(item, __VU, 'Nasr City, Cairo'),
      { headers: { ...DEFAULT_HEADERS, ...writerIpHeaders(__VU, __ITER) } },
    );
    if (res.body && res.body.toLowerCase().includes('deadlock')) deadlocks.add(1);
    check(res, { 'online order accepted': (r) => r.status === 200 || r.status === 201 });
  }

  sleep(1);
}

/**
 * كل VU هنا يبيع **نفس الصنف**، فيتزاحم الجميع على صف واحد في `products` وصف واحد في
 * `product_location_stock`. الحمل الموزّع لا يكشف خرق ترتيب الأقفال؛ هذا يكشفه.
 */
export function hotProductScenario(data) {
  const session = data.sessions[__VU % data.sessions.length];
  postSale(session, [{ ...data.hot, qty: 1 }], hotSaleDuration, hotSaleSuccessRate);
  sleep(0.5);
}

function postSale(session, items, durationMetric, successMetric) {
  const payload = buildSalePayload(items);
  const params = writeParams(session, {
    ...clientIpHeaders(__VU),
    'x-idempotency-key': `loadtest-${__VU}-${__ITER}-${Date.now()}`,
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/sales`, payload.body, params);
  durationMetric.add(Date.now() - start);

  const body = String(res.body || '');
  if (body.includes('40P01') || body.toLowerCase().includes('deadlock')) deadlocks.add(1);

  const ok = check(res, {
    'sale posted': (r) => r.status === 200 || r.status === 201,
  });
  successMetric.add(ok ? 1 : 0);

  if (ok) {
    unitsSold.add(payload.units);
    return;
  }

  if (body.includes('OPEN_SHIFT_REQUIRED')) rejectShift.add(1);
  else {
    const reason = classifyWriteFailure(res);
    if (reason === 'out_of_stock' || /الكمية|المخزون|stock/i.test(body)) rejectStock.add(1);
    else if (reason === 'server_error' || reason === 'no_response') rejectServer.add(1);
    else rejectBusiness.add(1);
  }
  if (__VU <= 2 && __ITER < 3) {
    // eslint-disable-next-line no-console
    console.warn(`[sale refused] HTTP ${res.status} - ${body.slice(0, 240)}`);
  }
}

export function healthScenario() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'health probe ok': (r) => r.status === 200 });
  sleep(5);
}
