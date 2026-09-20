import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { AppError } from '../../src/common/errors/app-error';
import {
  PORTAL_TOKEN_TTL_MS,
  resolvePortalTokenSecret,
  signPortalToken,
  verifyPortalToken,
  type PortalTokenErrorSpec,
} from '../../src/core/auth/utils/portal-token';

const ERRORS: PortalTokenErrorSpec = {
  missing: { message: 'missing', code: 'MISSING' },
  invalid: { message: 'invalid', code: 'INVALID' },
  signature: { message: 'signature', code: 'BAD_SIGNATURE' },
  expired: { message: 'expired', code: 'EXPIRED' },
};

const REAL_SECRET = 'a-real-production-session-secret-value';

/** الأسرار الافتراضية التي كانت مكتوبة داخل الكود قبل الإصلاح. */
const LEAKED_LEGACY_SECRETS = [
  'zs-attendance-mobile-punch-secret-2026',
  'zs-delivery-secret-token-key-2026',
];

function withEnv(env: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key] as string;
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key] as string;
    }
  }
}

function expectAppError(code: string, fn: () => unknown): void {
  assert.throws(fn, (error: unknown) => error instanceof AppError && error.code === code, `expected ${code}`);
}

const CLOUD_ENV = {
  APP_MODE: 'CLOUD_SAAS',
  SESSION_SECRET: undefined,
  PORTABLE_MODE: undefined,
  IS_ELECTRON: undefined,
};

function run(): void {
  // 1. فشل آمن: في السحابة بلا SESSION_SECRET لا يُصدَر ولا يُقبَل أي رمز إطلاقاً.
  //    (عكس هذا هو النمط F12 — قيمة افتراضية تجعل التحقق يمر.)
  withEnv(CLOUD_ENV, () => {
    expectAppError('PORTAL_TOKEN_SECRET_MISSING', () => resolvePortalTokenSecret());
    expectAppError('PORTAL_TOKEN_SECRET_MISSING', () => signPortalToken({ employeeId: 1 }, PORTAL_TOKEN_TTL_MS));
  });

  // 2. سر قصير جداً في السحابة يُعامَل كغياب سر.
  withEnv({ ...CLOUD_ENV, SESSION_SECRET: 'short' }, () => {
    expectAppError('PORTAL_TOKEN_SECRET_MISSING', () => resolvePortalTokenSecret());
  });

  // 3. الديسكتوب/الأوفلاين يعمل بلا سر مضبوط (لا شبكة عامة ولا تعدد مستأجرين).
  withEnv({ APP_MODE: 'SELF_CONTAINED', SESSION_SECRET: undefined }, () => {
    const token = signPortalToken({ employeeId: 7, tenantId: 'default' }, PORTAL_TOKEN_TTL_MS);
    const payload = verifyPortalToken<any>(`Bearer ${token}`, ERRORS);
    assert.equal(payload.employeeId, 7);
  });

  withEnv({ APP_MODE: 'CLOUD_SAAS', SESSION_SECRET: REAL_SECRET }, () => {
    // 4. الدورة الكاملة: توقيع ثم تحقق يعيد نفس الحمولة، ويضيف iat/exp.
    const token = signPortalToken({ employeeId: 42, tenantId: 'tenant-a' }, PORTAL_TOKEN_TTL_MS);
    const payload = verifyPortalToken<any>(`Bearer ${token}`, ERRORS);
    assert.equal(payload.employeeId, 42);
    assert.equal(payload.tenantId, 'tenant-a');
    assert.ok(payload.exp > Date.now());

    // يقبل الرمز الخام بلا بادئة Bearer أيضاً.
    assert.equal(verifyPortalToken<any>(token, ERRORS).tenantId, 'tenant-a');

    // 5. تبديل المستأجر داخل الحمولة يكسر التوقيع — لا عبور بين المستأجرين.
    const forgedPayload = Buffer
      .from(JSON.stringify({ employeeId: 42, tenantId: 'tenant-b', exp: Date.now() + 60_000 }))
      .toString('base64url');
    const stolenSignature = token.split('.')[1];
    expectAppError('BAD_SIGNATURE', () => verifyPortalToken(`${forgedPayload}.${stolenSignature}`, ERRORS));

    // 6. رمز موقّع بأي سر افتراضي قديم مسرَّب يُرفض بعد ضبط سر حقيقي.
    for (const legacySecret of LEAKED_LEGACY_SECRETS) {
      const encoded = Buffer
        .from(JSON.stringify({ employeeId: 999, tenantId: 'victim-tenant', exp: Date.now() + 60_000 }))
        .toString('base64url');
      const legacySignature = createHmac('sha256', legacySecret).update(encoded).digest('base64url');
      expectAppError('BAD_SIGNATURE', () => verifyPortalToken(`${encoded}.${legacySignature}`, ERRORS));
    }

    // 7. الرموز المنتهية والمشوّهة والغائبة.
    const expired = signPortalToken({ employeeId: 1 }, -1000);
    expectAppError('EXPIRED', () => verifyPortalToken(expired, ERRORS));
    expectAppError('MISSING', () => verifyPortalToken('', ERRORS));
    expectAppError('MISSING', () => verifyPortalToken(undefined, ERRORS));
    expectAppError('INVALID', () => verifyPortalToken('no-dot-separator', ERRORS));
    expectAppError('INVALID', () => verifyPortalToken('a.b.c', ERRORS));

    // 8. حمولة ليست JSON صالحاً لكنها موقّعة بشكل سليم → INVALID لا انهيار.
    const badBody = Buffer.from('not-json').toString('base64url');
    const badSignature = createHmac('sha256', REAL_SECRET).update(badBody).digest('base64url');
    expectAppError('INVALID', () => verifyPortalToken(`${badBody}.${badSignature}`, ERRORS));
  });

  console.log('portal-token.spec: ok');
}

run();
