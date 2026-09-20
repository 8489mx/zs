import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../../common/errors/app-error';

/**
 * المصدر الوحيد للحقيقة لرموز بوابات الأطراف الخارجية (موظف / مندوب / بصمة موبايل).
 *
 * هذه البوابات لا تمر على `SessionAuthGuard` ولا على جدول `sessions`، فهي تعتمد
 * كلياً على توقيع HMAC. أي التفاف على هذا الملف (سر افتراضي مكتوب في الكود، أو
 * مقارنة توقيع بـ`!==`) يعيد فتح ثغرة انتحال هوية عابرة للمستأجرين.
 *
 * قاعدتان مفروضتان هنا:
 *  1. **فشل آمن (Fail-Closed):** في وضع السحابة لا يوجد سر افتراضي إطلاقاً.
 *     غياب `SESSION_SECRET` يرفض إصدار/قبول أي رمز بدل أن يوقّع بمفتاح معروف للجميع.
 *  2. **مقارنة ثابتة الزمن:** `timingSafeEqual` لا `!==`.
 */

const MIN_SECRET_LENGTH = 16;

/** سر محلي للديسكتوب/الأوفلاين فقط — لا يُستخدم أبداً في وضع السحابة. */
const DESKTOP_LOCAL_SECRET = 'zs-desktop-offline-portal-token-secret';

function isDesktopMode(): boolean {
  const appMode = String(process.env.APP_MODE || '').trim().toUpperCase();
  if (appMode === 'CLOUD_SAAS') return false;
  return appMode === 'SELF_CONTAINED'
    || appMode === 'PORTABLE'
    || process.env.PORTABLE_MODE === 'true'
    || process.env.IS_ELECTRON === 'true';
}

/**
 * يعيد سر توقيع رموز البوابات، أو يرمي استثناءً في وضع السحابة إن لم يُضبط.
 */
export function resolvePortalTokenSecret(): string {
  const configured = String(process.env.SESSION_SECRET || '').trim();
  if (configured.length >= MIN_SECRET_LENGTH) {
    return configured;
  }

  if (isDesktopMode()) {
    return DESKTOP_LOCAL_SECRET;
  }

  throw new AppError(
    'إعداد الأمان غير مكتمل على الخادم (SESSION_SECRET غير مضبوط). تم إيقاف بوابات الموظفين والمندوبين حتى يتم ضبطه.',
    'PORTAL_TOKEN_SECRET_MISSING',
    500,
  );
}

export type PortalTokenErrorSpec = {
  /** لا يوجد رأس Authorization إطلاقاً */
  missing: { message: string; code: string };
  /** الرمز مشوّه (ليس جزأين، أو JSON غير صالح) */
  invalid: { message: string; code: string };
  /** التوقيع لا يطابق */
  signature: { message: string; code: string };
  /** انتهت الصلاحية */
  expired: { message: string; code: string };
};

function fail(spec: { message: string; code: string }): never {
  throw new AppError(spec.message, spec.code, 401);
}

function safeEquals(expected: string, provided: string): boolean {
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(String(provided || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * يوقّع حمولة رمز بوابة. `iat`/`exp` تُضافان هنا حصراً حتى لا يختلف عمر الرمز بين بوابة وأخرى.
 */
export function signPortalToken(payload: Record<string, unknown>, ttlMs: number): string {
  const secret = resolvePortalTokenSecret();
  const now = Date.now();
  const body = { ...payload, iat: now, exp: now + ttlMs };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

/**
 * يتحقق من رمز بوابة ويعيد حمولته. يقبل `Bearer <token>` أو الرمز الخام.
 */
export function verifyPortalToken<T extends Record<string, unknown>>(
  rawToken: string | undefined,
  errors: PortalTokenErrorSpec,
): T {
  const raw = String(rawToken || '').trim();
  if (!raw) fail(errors.missing);

  const token = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) fail(errors.invalid);

  const [encoded, signature] = parts;
  const secret = resolvePortalTokenSecret();
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!safeEquals(expected, signature)) fail(errors.signature);

  let payload: T;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    fail(errors.invalid);
  }

  if (!payload || typeof payload !== 'object') fail(errors.invalid);

  const exp = Number((payload as Record<string, unknown>).exp || 0);
  if (exp && Date.now() > exp) fail(errors.expired);

  return payload;
}

/** عمر رمز البوابة الموحّد (30 يوماً) — كان مكرراً في ثلاث خدمات. */
export const PORTAL_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
