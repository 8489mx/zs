import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { ErrorState } from '@/shared/ui/error-state';
import { activationApi } from '@/shared/api/activation';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';

export function ActivationPage() {
  const status = useAuthStore((state) => state.activationStatus);
  const setAppGate = useAuthStore((state) => state.setAppGate);
  const [activationCode, setActivationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const machineId = status?.machineId || '';
  const copyLabel = useMemo(() => (machineId ? 'نسخ معرف الجهاز' : 'لا يوجد معرف جهاز'), [machineId]);

  async function handleActivate() {
    if (!activationCode.trim()) {
      setError('أدخل كود التفعيل أولًا.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await activationApi.activate(activationCode.trim());
      if (response.setupRequired) setAppGate('setup', response);
      else setAppGate('login', response);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر تفعيل البرنامج. تحقق من الكود ثم أعد المحاولة.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen-center auth-screen-shell">
      <Card title="تفعيل البرنامج" description="أرسل معرف الجهاز إلى الإدارة ثم الصق كود التفعيل هنا مرة واحدة فقط." className="activation-card">
        <div className="stack gap-16">
          <div className="activation-machine-box">
            <div>
              <strong>معرف هذا الجهاز</strong>
              <div className="mono activation-machine-id">{machineId || 'جارٍ تجهيز المعرف...'}</div>
            </div>
            <Button type="button" variant="secondary" disabled={!machineId} onClick={() => navigator.clipboard?.writeText(machineId)}>
              {copyLabel}
            </Button>
          </div>
          <Field label="كود التفعيل">
            <textarea
              rows={5}
              value={activationCode}
              onChange={(event) => setActivationCode(event.target.value)}
              placeholder="الصق كود التفعيل هنا"
            />
          </Field>
          {error ? <ErrorState title="فشل التفعيل" hint={error} /> : null}
          <div className="inline-actions inline-actions-end">
            <Button type="button" onClick={handleActivate} disabled={submitting || !activationCode.trim()}>
              {submitting ? 'جارٍ التفعيل...' : 'تفعيل البرنامج'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
