import { useState, type CSSProperties } from 'react';
import { Button } from '@/shared/ui/button';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { useTwoFactor } from '@/features/auth/hooks/useTwoFactor';

const inputControlStyle: CSSProperties = {
  width: '100%',
  height: '38px',
  minHeight: '38px',
  padding: '0 12px',
  fontSize: '0.86rem',
  fontWeight: 600,
  color: '#0f172a',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '5px',
};

const noticeStyle = (tone: 'info' | 'warn' | 'ok'): CSSProperties => ({
  padding: '10px 12px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  lineHeight: 1.7,
  background: tone === 'ok' ? '#dcfce7' : tone === 'warn' ? '#fff7ed' : '#f1f5f9',
  color: tone === 'ok' ? '#166534' : tone === 'warn' ? '#9a3412' : '#334155',
  border: `1px solid ${tone === 'ok' ? '#bbf7d0' : tone === 'warn' ? '#fed7aa' : '#e2e8f0'}`,
});

const primaryButtonStyle: CSSProperties = {
  height: '38px',
  fontWeight: 700,
  fontSize: '0.86rem',
  background: '#0f172a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '0 20px',
};

/**
 * التحقق بخطوتين لحساب المستخدم نفسه.
 *
 * بلا رمز QR عمداً: توليد الـQR يحتاج حزمة جديدة في مسار المصادقة، والبديل يعمل في كل التطبيقات —
 * رابط `otpauth://` يفتح تطبيق المصادقة مباشرة على الهاتف، والسر مكتوب في مجموعات للإدخال اليدوي.
 */
export function TwoFactorCard() {
  const {
    stage, status, setup, recoveryCodes, error, busy,
    beginSetup, confirmSetup, disable, regenerateRecoveryCodes, dismissCodes, cancelSetup,
  } = useTwoFactor();

  const [code, setCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopySecret() {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // نسخ الحافظة محجوب أحياناً — السر معروض على الشاشة على أي حال.
    }
  }

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      {error ? <div style={noticeStyle('warn')}>{error}</div> : null}

      {stage === 'loading' ? <div style={noticeStyle('info')}>جاري قراءة حالة التحقق بخطوتين...</div> : null}

      {stage === 'off' ? (
        <>
          {status?.required ? (
            <div style={noticeStyle('warn')}>
              سياسة المنصة تفرض التحقق بخطوتين على هذا الحساب. فعّله الآن لتجنّب رفض تسجيل الدخول لاحقاً.
            </div>
          ) : (
            <div style={noticeStyle('info')}>
              خطوة تانية بعد كلمة المرور: رمز متغيّر كل 30 ثانية من تطبيق على هاتفك. كلمة مرور مسروقة وحدها
              تبقى غير كافية للدخول.
            </div>
          )}
          <div>
            <Button type="button" onClick={beginSetup} disabled={busy} style={primaryButtonStyle}>
              {busy ? 'جاري التجهيز...' : 'تفعيل التحقق بخطوتين'}
            </Button>
          </div>
        </>
      ) : null}

      {stage === 'enrolling' && setup ? (
        <>
          <div style={noticeStyle('info')}>
            <div style={{ marginBottom: 8 }}>1. افتح تطبيق مصادقة (Google Authenticator أو Authy أو مدير كلمات المرور عندك).</div>
            <div style={{ marginBottom: 8 }}>
              2. من الهاتف اضغط <a href={setup.otpauthUri} style={{ color: '#170c5c', fontWeight: 700 }}>هذا الرابط</a> ليُضاف الحساب تلقائياً،
              أو أضِفه يدوياً بالمفتاح التالي:
            </div>
            <div
              dir="ltr"
              style={{
                fontFamily: "'SFMono-Regular', Consolas, monospace",
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 12px',
                textAlign: 'center',
                wordBreak: 'break-all',
              }}
            >
              {setup.secretFormatted}
            </div>
            <button
              type="button"
              onClick={handleCopySecret}
              style={{ background: 'none', border: 'none', color: '#170c5c', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0 0' }}
            >
              {copied ? 'تم النسخ' : 'نسخ المفتاح'}
            </button>
          </div>

          <div>
            <label htmlFor="mfa-confirm-code" style={labelStyle}>3. اكتب الرمز الظاهر في التطبيق الآن</label>
            <input
              id="mfa-confirm-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="000000"
              style={inputControlStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              onClick={async () => { await confirmSetup(code); setCode(''); }}
              disabled={busy || code.trim().length < 6}
              style={primaryButtonStyle}
            >
              {busy ? 'جاري التأكيد...' : 'تأكيد وتفعيل'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setCode(''); cancelSetup(); }} disabled={busy}>
              إلغاء
            </Button>
          </div>
        </>
      ) : null}

      {stage === 'showing-codes' ? (
        <>
          <div style={noticeStyle('warn')}>
            <strong>احفظ رموز الاسترداد دلوقتي.</strong> دي طريقتك الوحيدة للدخول لو ضاع الهاتف، وكل رمز يعمل
            مرة واحدة. **لن تُعرض مرة أخرى** — مخزَّنة عندنا مجزَّأة فقط.
          </div>
          <div
            dir="ltr"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '8px',
              fontFamily: "'SFMono-Regular', Consolas, monospace",
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {recoveryCodes.map((recoveryCode) => (
              <div key={recoveryCode} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                {recoveryCode}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n')).catch(() => undefined)}
              variant="secondary"
            >
              نسخ الرموز
            </Button>
            <Button type="button" onClick={dismissCodes} style={primaryButtonStyle}>حفظتها، تم</Button>
          </div>
        </>
      ) : null}

      {stage === 'on' ? (
        <>
          <div style={noticeStyle('ok')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AppIcons.ShieldCheck size={16} />
              التحقق بخطوتين مفعّل على هذا الحساب.
            </span>
            <div style={{ marginTop: 4, fontWeight: 600 }}>
              رموز الاسترداد المتبقية: {status?.recoveryCodesRemaining ?? 0}
              {(status?.recoveryCodesRemaining ?? 0) <= 2 ? ' — جدّدها قبل ما تخلص.' : ''}
            </div>
          </div>

          <div>
            <label htmlFor="mfa-action-code" style={labelStyle}>رمز من تطبيق المصادقة</label>
            <input
              id="mfa-action-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="000000"
              style={inputControlStyle}
            />
          </div>

          {showDisableForm ? (
            <div>
              <label htmlFor="mfa-disable-password" style={labelStyle}>كلمة المرور الحالية</label>
              <input
                id="mfa-disable-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                type="password"
                dir="ltr"
                autoComplete="current-password"
                spellCheck={false}
                placeholder="••••••••"
                style={inputControlStyle}
              />
              <div style={{ ...noticeStyle('info'), marginTop: 8 }}>
                الإيقاف يحتاج كلمة المرور ورمزاً صالحاً معاً — جلسة مفتوحة وحدها لا تكفي لنزع الحماية.
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || code.trim().length < 6}
              onClick={async () => { await regenerateRecoveryCodes(code); setCode(''); }}
            >
              تجديد رموز الاسترداد
            </Button>
            {showDisableForm ? (
              <>
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy || code.trim().length < 6 || !disablePassword}
                  onClick={async () => {
                    const done = await disable(disablePassword, code);
                    if (done) { setShowDisableForm(false); setDisablePassword(''); setCode(''); }
                  }}
                >
                  {busy ? 'جاري الإيقاف...' : 'تأكيد الإيقاف'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowDisableForm(false); setDisablePassword(''); }}>
                  تراجع
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setShowDisableForm(true)}>
                إيقاف التحقق بخطوتين
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
