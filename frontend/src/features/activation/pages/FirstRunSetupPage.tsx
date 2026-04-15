import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { ErrorState } from '@/shared/ui/error-state';
import { activationApi } from '@/shared/api/activation';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';

const INITIAL_STATE = {
  storeName: '',
  branchName: '',
  branchCode: '',
  locationName: '',
  locationCode: '',
  adminDisplayName: '',
  adminUsername: '',
  adminPassword: '',
};

export function FirstRunSetupPage() {
  const navigate = useNavigate();
  const setAppGate = useAuthStore((state) => state.setAppGate);
  const [form, setForm] = useState(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof typeof INITIAL_STATE>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await activationApi.initialize({ ...form, theme: 'light' });
      setAppGate('login');
      navigate('/login?setup=done', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر حفظ التهيئة الأولية. راجع البيانات ثم أعد المحاولة.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen-center auth-screen-shell setup-screen-shell">
      <Card title="التهيئة الأولى" description="أكمل بيانات المنشأة وأنشئ أول مستخدم إدارة مرة واحدة فقط." className="activation-card setup-card">
        <form className="stack gap-16" onSubmit={handleSubmit}>
          <div className="grid two-columns gap-12">
            <Field label="اسم المنشأة"><input value={form.storeName} onChange={(event) => updateField('storeName', event.target.value)} /></Field>
            <Field label="اسم الفرع"><input value={form.branchName} onChange={(event) => updateField('branchName', event.target.value)} /></Field>
            <Field label="كود الفرع (اختياري)"><input value={form.branchCode} onChange={(event) => updateField('branchCode', event.target.value)} /></Field>
            <Field label="اسم المخزن"><input value={form.locationName} onChange={(event) => updateField('locationName', event.target.value)} /></Field>
            <Field label="كود المخزن (اختياري)"><input value={form.locationCode} onChange={(event) => updateField('locationCode', event.target.value)} /></Field>
            <Field label="اسم مسؤول النظام"><input value={form.adminDisplayName} onChange={(event) => updateField('adminDisplayName', event.target.value)} /></Field>
            <Field label="اسم المستخدم"><input value={form.adminUsername} onChange={(event) => updateField('adminUsername', event.target.value)} /></Field>
            <Field label="كلمة المرور"><input type="password" value={form.adminPassword} onChange={(event) => updateField('adminPassword', event.target.value)} /></Field>
          </div>
          {error ? <ErrorState title="فشل التهيئة" hint={error} /> : null}
          <div className="inline-actions inline-actions-end">
            <Button type="submit" disabled={submitting}>{submitting ? 'جارٍ تجهيز البرنامج...' : 'إنشاء الحساب وبدء الاستخدام'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
