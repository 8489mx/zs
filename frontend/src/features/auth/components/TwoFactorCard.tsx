import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

      {stage === 'loading' ? <div style={noticeStyle('info')}>{t('auth.two_factor_card.s0', "جاري قراءة حالة التحقق بخطوتين...")}</div> : null}

      {stage === 'off' ? (
        <>
          {status?.required ? (
            <div style={noticeStyle('warn')}>
              {t('auth.two_factor_card.s1', "سياسة المنصة تفرض التحقق بخطوتين على هذا الحساب. فعّله الآن لتجنّب رفض تسجيل الدخول لاحقاً.")}
            </div>
          ) : (
            <div style={noticeStyle('info')}>
              {t('auth.two_factor_card.s2', "خطوة تانية بعد كلمة المرور: رمز متغيّر كل 30 ثانية من تطبيق على هاتفك. كلمة مرور مسروقة وحدها\n              تبقى غير كافية للدخول.")}
            </div>
          )}
          <div>
            <Button type="button" onClick={beginSetup} disabled={busy} style={primaryButtonStyle}>
              {busy ? t('auth.two_factor_card.s3', "جاري التجهيز...") : t('auth.two_factor_card.s4', "تفعيل التحقق بخطوتين")}
            </Button>
          </div>
        </>
      ) : null}

      {stage === 'enrolling' && setup ? (
        <>
          <div style={noticeStyle('info')}>
            <div style={{ marginBottom: 8 }}>{t('auth.two_factor_card.s5', "1. افتح تطبيق مصادقة (Google Authenticator أو Authy أو مدير كلمات المرور عندك).")}</div>
            <div style={{ marginBottom: 8 }}>
              {t('auth.two_factor_card.s6', "2. من الهاتف اضغط")} <a href={setup.otpauthUri} style={{ color: '#170c5c', fontWeight: 700 }}>{t('auth.two_factor_card.s7', "هذا الرابط")}</a> {t('auth.two_factor_card.s8', "ليُضاف الحساب تلقائياً،\n              أو أضِفه يدوياً بالمفتاح التالي:")}
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
              {copied ? t('auth.two_factor_card.s9', "تم النسخ") : t('auth.two_factor_card.s10', "نسخ المفتاح")}
            </button>
          </div>

          <div>
            <label htmlFor="mfa-confirm-code" style={labelStyle}>{t('auth.two_factor_card.s11', "3. اكتب الرمز الظاهر في التطبيق الآن")}</label>
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
              {busy ? t('auth.two_factor_card.s12', "جاري التأكيد...") : t('auth.two_factor_card.s13', "تأكيد وتفعيل")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setCode(''); cancelSetup(); }} disabled={busy}>
              {t('auth.two_factor_card.s14', "إلغاء")}
            </Button>
          </div>
        </>
      ) : null}

      {stage === 'showing-codes' ? (
        <>
          <div style={noticeStyle('warn')}>
            <strong>{t('auth.two_factor_card.s15', "احفظ رموز الاسترداد دلوقتي.")}</strong> {t('auth.two_factor_card.s16', "دي طريقتك الوحيدة للدخول لو ضاع الهاتف، وكل رمز يعمل\n            مرة واحدة. **لن تُعرض مرة أخرى** — مخزَّنة عندنا مجزَّأة فقط.")}
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
              {t('auth.two_factor_card.s17', "نسخ الرموز")}
            </Button>
            <Button type="button" onClick={dismissCodes} style={primaryButtonStyle}>{t('auth.two_factor_card.s18', "حفظتها، تم")}</Button>
          </div>
        </>
      ) : null}

      {stage === 'on' ? (
        <>
          <div style={noticeStyle('ok')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AppIcons.ShieldCheck size={16} />
              {t('auth.two_factor_card.s19', "التحقق بخطوتين مفعّل على هذا الحساب.")}
            </span>
            <div style={{ marginTop: 4, fontWeight: 600 }}>
              {t('auth.two_factor_card.s20', "رموز الاسترداد المتبقية:")} {status?.recoveryCodesRemaining ?? 0}
              {(status?.recoveryCodesRemaining ?? 0) <= 2 ? t('auth.two_factor_card.s21', " — جدّدها قبل ما تخلص.") : ''}
            </div>
          </div>

          <div>
            <label htmlFor="mfa-action-code" style={labelStyle}>{t('auth.two_factor_card.s22', "رمز من تطبيق المصادقة")}</label>
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
              <label htmlFor="mfa-disable-password" style={labelStyle}>{t('auth.two_factor_card.s23', "كلمة المرور الحالية")}</label>
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
                {t('auth.two_factor_card.s24', "الإيقاف يحتاج كلمة المرور ورمزاً صالحاً معاً — جلسة مفتوحة وحدها لا تكفي لنزع الحماية.")}
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
              {t('auth.two_factor_card.s25', "تجديد رموز الاسترداد")}
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
                  {busy ? t('auth.two_factor_card.s26', "جاري الإيقاف...") : t('auth.two_factor_card.s27', "تأكيد الإيقاف")}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowDisableForm(false); setDisablePassword(''); }}>
                  {t('auth.two_factor_card.s28', "تراجع")}
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setShowDisableForm(true)}>
                {t('auth.two_factor_card.s29', "إيقاف التحقق بخطوتين")}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
