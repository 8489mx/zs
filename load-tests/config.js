/**
 * Z-Systems ERP Enterprise Load Testing Suite
 * k6 Shared Configuration & Environment Helpers
 */

import http from 'k6/http';

export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';
export const STOREFRONT_SLUG = __ENV.STOREFRONT_SLUG || 'almhnds';
export const AUTH_USERNAME = __ENV.AUTH_USERNAME || 'admin';
export const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || 'admin';
export const TENANT_ID = __ENV.TENANT_ID || 'dev-tenant';

/**
 * اسم كوكي الجلسة كما يضبطه الباك إند (`SESSION_COOKIE_NAME`).
 *
 * الجلسة تُحمل في **كوكي** لا في ترويسة: `ALLOW_SESSION_ID_HEADER` معطَّل عمداً في وضع السحابة
 * (`session-auth.guard.ts:allowSessionIdHeaderFallback` — الترويسة مسموحة في التطوير والديسكتوب
 * فقط). وهذا سلوك صحيح لا يُلتف عليه: الاختبار يتصرف كالمتصفح.
 * وCSRF لا يُفحص على طلبات القراءة، فالكوكي وحدها تكفي لسيناريوهات الكاشير.
 */
export const SESSION_COOKIE_NAME = __ENV.SESSION_COOKIE_NAME || 'session_id';

/**
 * حجم الحمل قابل للضبط من البيئة، فالملف الواحد يخدم "تأكد إن حاجة ما اتكسرتش" و"اضغط
 * السيرفر لحد ما يقول لأ" بلا تعديل كود.
 *   PEAK_VUS=200 RAMP_SECONDS=30 HOLD_SECONDS=120 bash run.sh scenarios/stress-all.js
 */
export const PEAK_VUS = Number(__ENV.PEAK_VUS || 50);
export const RAMP_SECONDS = Number(__ENV.RAMP_SECONDS || 15);
export const HOLD_SECONDS = Number(__ENV.HOLD_SECONDS || 30);

/** ملف حِمل متدرّج: تصاعد ← ثبات على الذروة ← هبوط. */
export function rampProfile(peak = PEAK_VUS) {
  return [
    { duration: `${RAMP_SECONDS}s`, target: Math.max(1, Math.round(peak / 2)) },
    { duration: `${HOLD_SECONDS}s`, target: peak },
    { duration: `${Math.max(5, Math.round(RAMP_SECONDS / 2))}s`, target: 0 },
  ];
}

/**
 * عنوان عميل مختلف لكل VU — **لاختبار الحمل من داخل السيرفر فقط**، وبموافقة صريحة عبر
 * `SPOOF_CLIENT_IPS=true`.
 *
 * السبب: حدود المحاولات (O60 للمتجر، O72 للدخول) مفتاحها عنوان العميل. اختبار يعمل من
 * السيرفر نفسه يبدو للتطبيق كعميل **واحد**، فبعد الطلب الثلاثين يرد 429 على كل شيء — فيقيس
 * الاختبار الحارس لا قاعدة البيانات، ويطلع أحمر بسبب حماية تعمل صح.
 *
 * هذا ليس التفافاً على الحماية: `resolveClientIp` تثق بـ`X-Real-IP` **فقط** حين يكون القرين
 * عنواناً داخلياً (بروكسي)، و k6 هنا يعمل على `127.0.0.1`. عميل من الخارج لا يستطيع فعل هذا.
 * ومع ذلك يبقى خلف مفتاح صريح حتى لا يُشغَّل بالغلط ويُخفي حدّاً مكسوراً.
 */
export function clientIpHeaders(vu) {
  if (String(__ENV.SPOOF_CLIENT_IPS || '').toLowerCase() !== 'true') return {};
  const n = Number(vu) || 1;
  return { 'X-Real-IP': `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` };
}

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Standard SLA Thresholds
 */
export const STANDARD_THRESHOLDS = {
  // 95% of requests must complete below 500ms
  http_req_duration: ['p(90)<300', 'p(95)<500', 'p(99)<1500'],
  // HTTP failure rate must stay below 1%
  http_req_failed: ['rate<0.01'],
};

/**
 * عتبات **مسار الكتابة**.
 *
 * قياس إصدار فاتورة بعتبة فحص نسخة كتالوج مقارنة غلط: الفاتورة معاملة تكتب في خمسة جداول، وتحرّك
 * مخزوناً بأقفال، وترحّل قيداً مزدوجاً، وتحدّث صف الوردية. أول جولة بيع حقيقية على الإنتاج أعطت
 * `p(95) = 1.41s` عند خمسين كاشيراً متزامناً على نواتين — فالعتبة هنا تقيس ذلك، لا تتظاهر بأنه قراءة.
 *
 * وبقاء عتبة مستحيلة حمراء دائماً أسوأ من غيابها: تعوّد العين على الأحمر فلا يُرى حين يعني شيئاً.
 */
export const WRITE_THRESHOLDS = {
  http_req_duration: ['p(95)<2000', 'p(99)<4000'],
  http_req_failed: ['rate<0.01'],
};

/**
 * High-Throughput SLA Thresholds (for fast endpoints like version checks)
 */
export const FAST_THRESHOLDS = {
  http_req_duration: ['p(95)<150', 'p(99)<400'],
  http_req_failed: ['rate<0.01'],
};

/**
 * Generates an Egyptian / International valid phone number for customer orders
 */
export function generateRandomPhone() {
  const prefixes = ['010', '011', '012', '015'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${suffix}`;
}

/**
 * Sleep with jitter to simulate realistic user think time
 */
export function sleepWithJitter(minSec = 0.5, maxSec = 1.5) {
  const duration = minSec + Math.random() * (maxSec - minSec);
  return duration;
}

/**
 * عنوان زائر **جديد لكل تكرار** — لسيناريوهات الكتابة على المتجر وحدها.
 *
 * حدّ O60 على إنشاء الطلب هو 30 طلباً لكل عنوان في 600 ثانية، وهو حدّ صحيح للإنتاج. لكنه يعني
 * أن اختباراً بعدد مستخدمين ثابت يُسقَف عند 30 طلباً لكل VU مهما طال، فتقيس الجولة الحدّ لا
 * قاعدة البيانات. والمتجر الحقيقي الذي يستقبل ثمانية آلاف طلب في دقيقتين يستقبلها من آلاف
 * العناوين لا من مئة وخمسين، فالعنوان لكل تكرار هو **المحاكاة الأصدق** لا التفافاً على الحماية.
 *
 * ومع ذلك لا يُخفى أثر الحدّ: كل سيناريو كتابة يعدّ ردود 429 في عدّاد مستقل، ومن يريد إثبات أن
 * الحدّ نفسه يعمل فسيناريو `auth-login-burst.js` هو من يفعل ذلك بعنوان واحد مقصود.
 */
export function writerIpHeaders(vu, iter) {
  if (String(__ENV.SPOOF_CLIENT_IPS || '').toLowerCase() !== 'true') return {};
  // مجال 10.0.0.0/8 يتسع لـ 16 مليون زائر، والخلط بالـVU يمنع تصادم تكرارين متزامنين.
  const n = ((Number(vu) || 1) * 4096 + (Number(iter) || 0)) % 16777216;
  return { 'X-Real-IP': `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` };
}

/**
 * تصنيف ردّ فاشل في سيناريو كتابة.
 *
 * الجولة الأولى على الإنتاج أعادت "0.19% نجاح" بلا سبب واحد مكتوب، فاستُنتج السبب استنتاجاً.
 * اختبار حِمل لا يقول **لماذا** رفض السيرفر لا يقيس شيئاً، فالتصنيف هنا جزء من الأداة لا زينة.
 */
export function classifyWriteFailure(res) {
  if (res.status === 429) return 'rate_limited';
  if (res.status === 0) return 'no_response';
  if (res.status >= 500) return 'server_error';
  if (res.status === 400 || res.status === 422) {
    const body = String(res.body || '');
    if (/المتاح من الصنف|غير متاح|نفد|out of stock/i.test(body)) return 'out_of_stock';
    return 'rejected';
  }
  return `http_${res.status}`;
}

/**
 * بناء سلة **قابلة للقبول فعلاً** من كتالوج المتجر.
 *
 * جولة 24 سبتمبر الثانية رفض فيها السيرفر 8225 طلباً من 8225 برسالة واحدة: «الحد الأدنى للطلب
 * هو 700 ج». السيناريو كان يطلب قطعة واحدة من صنف واحد دائماً، فلم يتجاوز الحد ولا مرة، ولم
 * تُفتح معاملة واحدة. السلة إذن ليست تفصيلاً تجميلياً: هي شرط أن يصل الاختبار إلى قاعدة البيانات.
 *
 * تُفضَّل الأصناف الأغلى لأن كميتها المطلوبة أصغر، فيقل استهلاك المخزون ويقل الرفض بسبب نفاده.
 */
export function selectOrderableItems(items, minOrder, maxQty = 200) {
  const floor = Math.max(0, Number(minOrder) || 0);
  return (Array.isArray(items) ? items : [])
    .filter((p) => p && p.id && p.inStock !== false && Number(p.stockQty || 0) > 0 && Number(p.price || 0) > 0)
    .map((p) => {
      const price = Number(p.price);
      const stock = Number(p.stockQty || 0);
      const qty = floor > 0 ? Math.max(1, Math.ceil(floor / price)) : 1;
      return { id: p.id, qty, price, stock };
    })
    .filter((c) => c.qty <= Math.min(c.stock, maxQty))
    // الأقل كمية أولاً (أي الأغلى سعراً)، ثم الأوفر مخزوناً.
    .sort((a, b) => (a.qty - b.qty) || (b.stock - a.stock))
    .slice(0, 12);
}

/** جسم طلب متجر جاهز للإرسال. */
export function buildOrderPayload(item, vu, address) {
  return JSON.stringify({
    customerName: `Shopper VU-${vu}-${Date.now() % 10000}`,
    customerPhone: generateRandomPhone(),
    customerAddress: address,
    items: [{ productId: item.id, quantity: item.qty }],
    paymentMethod: 'cash_on_delivery',
  });
}

/**
 * تسجيل دخول يُفشل الاختبار **فوراً** إن فشل، ويكتشف أسماء الكوكيز بنفسه.
 *
 * كان هذا مكرراً في سيناريوهين، ثم احتاج ثالثٌ إلى CSRF فصار التكرار ثلاثة. مكانه هنا.
 *
 * أربعة دروس مدفوعة الثمن مضمَّنة فيه:
 *  1. `res.cookies` في k6 بنية غير التي يقبلها `params.cookies` — تمريرها كما هي يرسل لا شيء.
 *  2. ترويسة `X-Session-Id` مرفوضة في وضع السحابة عمداً
 *     (`session-auth.guard.ts:allowSessionIdHeaderFallback`)، وليس على الإنتاج أن يخفّف حمايته.
 *  3. اسم كوكي الجلسة ليس `session_id` على كل نشر (`SESSION_COOKIE_NAME`)، فيُكتشف من الرد:
 *     الكوكي التي قيمتها تساوي `sessionId` في الجسم هي كوكي الجلسة أياً كان اسمها.
 *  4. **الكتابة تحتاج CSRF**: الحارس يطلب كوكي CSRF وترويسة `x-csrf-token` بنفس القيمة على كل
 *     طلب غير آمن. والكوكي الأخرى في رد الدخول — التي قيمتها ليست `sessionId` — هي كوكي CSRF.
 */
export function loginOrDie(username = AUTH_USERNAME, password = AUTH_PASSWORD) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ username, password }), {
    headers: DEFAULT_HEADERS,
  });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `login failed (HTTP ${res.status}) for user "${username}". `
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

  let cookieName = '';
  let csrfName = '';
  let csrfValue = '';
  const jar = res.cookies || {};
  for (const name of Object.keys(jar)) {
    const entries = jar[name] || [];
    for (let i = 0; i < entries.length; i += 1) {
      const value = entries[i] && entries[i].value;
      if (!value) continue;
      if (value === sessionId) { cookieName = name; break; }
      if (!csrfName) { csrfName = name; csrfValue = value; }
    }
  }
  if (!cookieName) {
    cookieName = SESSION_COOKIE_NAME;
    console.warn(`could not spot the session cookie in the login response; falling back to "${cookieName}"`);
  }

  // كلمة المرور تُعاد لأن إقفال الوردية يتحقق من كلمة مرور **الكاشير نفسه**
  // (`assertCurrentUserPassword`) لا من رمز مدير. تبقى في ذاكرة k6 وحدها.
  return { username, password, sessionId, cookieName, csrfName, csrfValue };
}

/** ترويسات ومعاملات طلب **قراءة** بجلسة. */
export function sessionParams(session, extraHeaders) {
  return {
    headers: { ...DEFAULT_HEADERS, ...(extraHeaders || {}) },
    cookies: { [session.cookieName]: session.sessionId },
  };
}

/**
 * معاملات طلب **كتابة** بجلسة: الكوكي + ترويسة CSRF.
 * بدونها يرد الحارس 403 «CSRF validation failed» — وهو محقّ.
 */
export function writeParams(session, extraHeaders) {
  const cookies = { [session.cookieName]: session.sessionId };
  const headers = { ...DEFAULT_HEADERS, ...(extraHeaders || {}) };
  if (session.csrfName && session.csrfValue) {
    cookies[session.csrfName] = session.csrfValue;
    headers['x-csrf-token'] = session.csrfValue;
  }
  return { headers, cookies };
}
