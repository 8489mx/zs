import { FormEvent, useMemo, useState } from 'react';
import { authApi } from '@/shared/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

export function PasswordRotationGate() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldEnforceRotation = user?.mustChangePassword === true;

  const helperText = useMemo(() => {
    if (!shouldEnforceRotation) return '';
    return 'يجب تغيير كلمة المرور الحالية قبل متابعة استخدام النظام.';
  }, [shouldEnforceRotation]);

  if (!shouldEnforceRotation) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
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
      updateUser({ mustChangePassword: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('تم تحديث كلمة المرور بنجاح. يمكنك متابعة العمل الآن.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تحديث كلمة المرور. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="password-rotation-overlay" role="dialog" aria-modal="true" aria-labelledby="password-rotation-title">
      <div className="password-rotation-card">
        <div className="stack gap-8">
          <div className="eyebrow">تنبيه أمني مهم</div>
          <h2 id="password-rotation-title" style={{ margin: 0 }}>تغيير كلمة المرور قبل المتابعة</h2>
          <p className="muted" style={{ margin: 0 }}>{helperText}</p>
        </div>
        <form className="stack gap-12" onSubmit={handleSubmit}>
          <Field label="كلمة المرور الحالية" error="">
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="كلمة المرور الجديدة" error="">
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة" error="">
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
          </Field>
          {error ? <div className="error-box">{error}</div> : null}
          {success ? <div className="success-box">{success}</div> : null}
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}</Button>
        </form>
      </div>
    </div>
  );
}
