/**
 * Z-Systems ERP Enterprise Load Testing Suite
 * k6 Shared Configuration & Environment Helpers
 */

export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';
export const STOREFRONT_SLUG = __ENV.STOREFRONT_SLUG || 'almhnds';
export const AUTH_USERNAME = __ENV.AUTH_USERNAME || 'admin';
export const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || 'admin';
export const TENANT_ID = __ENV.TENANT_ID || 'dev-tenant';

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
