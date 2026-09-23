import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { AppError } from '../../../common/errors/app-error';

/**
 * تشفير سر المصادقة الثنائية قبل تخزينه.
 *
 * سر TOTP **لا يمكن** أن يُخزَّن مجزَّأً كما تُخزَّن كلمة المرور أو رمز الاستعادة: التحقق يحتاج
 * السر نفسه ليحسب الرمز الحالي. البديل الوحيد هو التشفير المتماثل — ومعناه أن من يقرأ القاعدة
 * وحدها (نسخة احتياطية مسروقة، وصول قراءة) لا يستطيع توليد رموز أحد، لأن المفتاح في البيئة لا
 * في القاعدة.
 *
 * هذا هو الفرق العملي بين هذا الملف وبين البند O48 (`client_secret` الضريبي المخزَّن نصاً).
 *
 * المفتاح: `MFA_ENCRYPTION_KEY` إن وُجد، وإلا يُشتق بـscrypt من `SESSION_SECRET`. في وضع السحابة
 * **لا يوجد مفتاح افتراضي إطلاقاً** — غيابهما معاً يرفض التشفير وفك التشفير معاً، تماماً كما
 * يفعل `portal-token.ts`. وفي الديسكتوب/الأوفلاين يُستعمل مفتاح محلي ثابت، لأن القاعدة والمفتاح
 * على نفس الجهاز أصلاً فلا يضيف الفصل شيئاً هناك.
 *
 * **تنبيه تشغيلي:** تغيير `SESSION_SECRET` (بلا `MFA_ENCRYPTION_KEY` مضبوط) يُبطل أسرار المصادقة
 * الثنائية القائمة، فيدخل أصحابها برموز الاسترداد ويعيدون التفعيل.
 */

const MIN_SECRET_LENGTH = 16;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SCRYPT_SALT = 'zs-mfa-secret-v1';
const DESKTOP_LOCAL_KEY = 'zs-desktop-offline-mfa-encryption-key';
const FORMAT_PREFIX = 'v1';

function isDesktopMode(env: NodeJS.ProcessEnv): boolean {
  const appMode = String(env.APP_MODE || '').trim().toUpperCase();
  if (appMode === 'CLOUD_SAAS') return false;
  return appMode === 'SELF_CONTAINED'
    || appMode === 'PORTABLE'
    || env.PORTABLE_MODE === 'true'
    || env.IS_ELECTRON === 'true';
}

export function resolveMfaEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const dedicated = String(env.MFA_ENCRYPTION_KEY || '').trim();
  if (dedicated.length >= MIN_SECRET_LENGTH) {
    return scryptSync(dedicated, SCRYPT_SALT, KEY_BYTES);
  }

  const sessionSecret = String(env.SESSION_SECRET || '').trim();
  if (sessionSecret.length >= MIN_SECRET_LENGTH) {
    return scryptSync(sessionSecret, SCRYPT_SALT, KEY_BYTES);
  }

  if (isDesktopMode(env)) {
    return scryptSync(DESKTOP_LOCAL_KEY, SCRYPT_SALT, KEY_BYTES);
  }

  throw new AppError(
    'إعداد الأمان غير مكتمل على الخادم (SESSION_SECRET / MFA_ENCRYPTION_KEY غير مضبوط). تم إيقاف المصادقة الثنائية حتى يتم ضبطه.',
    'MFA_ENCRYPTION_KEY_MISSING',
    500,
  );
}

export function encryptMfaSecret(plain: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = resolveMfaEncryptionKey(env);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [FORMAT_PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptMfaSecret(payload: string, env: NodeJS.ProcessEnv = process.env): string {
  const parts = String(payload || '').split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_PREFIX) {
    throw new AppError('تعذر قراءة إعداد المصادقة الثنائية.', 'MFA_SECRET_CORRUPT', 500);
  }

  try {
    const key = resolveMfaEncryptionKey(env);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    // GCM: `final()` يرمي إن لم تطابق بصمة المصادقة، فالسر المعدَّل في القاعدة يُرفض ولا يُقرأ.
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('تعذر فك تشفير إعداد المصادقة الثنائية.', 'MFA_SECRET_CORRUPT', 500);
  }
}

/**
 * رموز الاسترداد: عشرة رموز عالية الإنتروبيا تُعرض مرة واحدة عند التفعيل، وتُخزَّن مجزَّأة.
 * بدونها يفقد المستخدم حسابه بفقد هاتفه، ويصير أثر المصادقة الثنائية الأرجح هو قفل الحساب لا
 * حمايته. (SHA-256 يكفي هنا لنفس سبب PWR-1: القيمة عشوائية كاملة لا كلمة مرور يختارها بشر.)
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = randomBytes(8).toString('hex').toUpperCase(); // 64 بت
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  return String(code || '').toUpperCase().replace(/[^A-F0-9]/g, '');
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code), 'utf8').digest('hex');
}
