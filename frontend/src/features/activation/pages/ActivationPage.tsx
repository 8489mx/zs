import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { ErrorState } from '@/shared/ui/error-state';
import { useActivationPageController } from '@/features/activation/hooks/useActivationPageController';

export function ActivationPage() {
  const { activationCode, setActivationCode, copyLabel, error, handleActivate, handleCopyMachineId, machineId, submitting } = useActivationPageController();

  return (
    <div className="screen-center auth-screen-shell">
      <Card title="تفعيل البرنامج" description="أرسل معرف الجهاز إلى الإدارة ثم الصق كود التفعيل هنا مرة واحدة فقط." className="activation-card">
        <div className="stack gap-16">
          <div className="activation-machine-box">
            <div>
              <strong>معرف هذا الجهاز</strong>
              <div className="mono activation-machine-id">{machineId || 'جارٍ تجهيز المعرف...'}</div>
            </div>
            <Button type="button" variant="secondary" disabled={!machineId} onClick={() => void handleCopyMachineId()}>
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
            <Button type="button" onClick={() => void handleActivate()} disabled={submitting || !activationCode.trim()}>
              {submitting ? 'جارٍ التفعيل...' : 'تفعيل البرنامج'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
