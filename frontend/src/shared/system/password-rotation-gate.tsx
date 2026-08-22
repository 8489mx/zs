import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '@/shared/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/shared/ui/button';

function ShieldLockIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect width="8" height="5" x="8" y="11" rx="1" />
      <path d="M10 11V9a2 2 0 1 1 4 0v2" />
    </svg>
  );
}

const inputControlStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  minHeight: '40px',
  padding: '0 12px',
  fontSize: '0.88rem',
  fontWeight: 600,
  color: '#0f172a',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '4px',
};

export function PasswordRotationGate() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const successTimerRef = useRef<number | null>(null);

  const shouldEnforceRotation = user?.mustChangePassword === true || user?.usingDefaultAdminPassword === true;
  const shouldShowSuccessState = !shouldEnforceRotation && Boolean(success);

  const helperText = useMemo(() => {
    if (!shouldEnforceRotation) return '';
    if (user?.usingDefaultAdminPassword === true) {
      return 'حساب التثبيت ما زال يستخدم كلمة المرور الافتراضية. يمكنك تغييرها الآن أو المتابعة بكلمة المرور الحالية.';
    }
    return 'يمكنك تعيين كلمة مرور جديدة لحسابك الآن، أو اختيار المتابعة بكلمة المرور الحالية.';
  }, [shouldEnforceRotation, user?.usingDefaultAdminPassword]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  if (!shouldEnforceRotation && !shouldShowSuccessState) return null;

  async function handleDismiss() {
    if (isDismissing || isSubmitting) return;
    setIsDismissing(true);
    try {
      await authApi.dismissPasswordChange();
    } catch {
      // Ignored if offline or unsupported
    } finally {
      updateUser({ mustChangePassword: false, usingDefaultAdminPassword: false });
      setIsDismissing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isDismissing) return;
    setError('');
    setSuccess('');

    if (!currentPassword.trim() || !newPassword.trim()) {
      setError('أدخل كلمة المرور الحالية والجديدة.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('كلمة المرور الجديدة يجب أن تختلف عن الحالية.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      updateUser({ mustChangePassword: false, usingDefaultAdminPassword: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('تم تحديث كلمة المرور بنجاح. يمكنك متابعة العمل الآن.');
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setSuccess('');
      }, 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تحديث كلمة المرور. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (shouldShowSuccessState) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-rotation-title"
      >
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '28px 32px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#dcfce7',
            color: '#16a34a',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <ShieldLockIcon size={24} />
          </div>
          <h3 id="password-rotation-title" style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
            تم تأمين الحساب بنجاح
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#166534', background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            {success}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-rotation-title"
    >
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '28px 32px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            flexShrink: 0,
          }}>
            <ShieldLockIcon size={22} />
          </div>
          <div>
            <h3 id="password-rotation-title" style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
              تغيير كلمة المرور قبل المتابعة
            </h3>
            <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {helperText}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label htmlFor="currentPasswordInput" style={labelStyle}>كلمة المرور الحالية</label>
            <input
              id="currentPasswordInput"
              aria-label="كلمة المرور الحالية"
              type="text"
              className="secure-password-field"
              style={inputControlStyle}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="newPasswordInput" style={labelStyle}>كلمة المرور الجديدة</label>
            <input
              id="newPasswordInput"
              aria-label="كلمة المرور الجديدة"
              type="text"
              className="secure-password-field"
              style={inputControlStyle}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPasswordInput" style={labelStyle}>تأكيد كلمة المرور الجديدة</label>
            <input
              id="confirmPasswordInput"
              aria-label="تأكيد كلمة المرور الجديدة"
              type="text"
              className="secure-password-field"
              style={inputControlStyle}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '0.8rem', border: '1px solid #fecaca', fontWeight: 600 }}>
              {error}
            </div>
          ) : null}

          {success ? (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '0.8rem', border: '1px solid #bbf7d0', fontWeight: 600 }}>
              {success}
            </div>
          ) : null}

          {/* Action Buttons: Change or Continue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <Button
              type="submit"
              disabled={isSubmitting || isDismissing}
              style={{
                width: '100%',
                height: '40px',
                fontWeight: 700,
                fontSize: '0.88rem',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
              }}
            >
              {isSubmitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
            </Button>

            <button
              type="button"
              onClick={handleDismiss}
              disabled={isSubmitting || isDismissing}
              style={{
                width: '100%',
                height: '38px',
                fontWeight: 600,
                fontSize: '0.84rem',
                background: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isDismissing ? 'جارٍ المتابعة...' : 'المتابعة بكلمة المرور الحالية (تخطي)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


