import { FormEvent, useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';

interface PosManagerPasswordDialogProps {
  open: boolean;
  isPending?: boolean;
  onClose: () => void;
  onApprove: (password: string) => Promise<unknown>;
}

export function PosManagerPasswordDialog({ open, isPending = false, onClose, onApprove }: PosManagerPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
      setSubmitError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    setSubmitError('');
    try {
      await onApprove(password);
      setPassword('');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر اعتماد الخصم بكلمة مرور المدير.'));
    }
  }

  return (
    <DialogShell open={open} onClose={isPending ? () => {} : onClose} width="min(520px, 100%)" zIndex={85} ariaLabel="اعتماد خصم المدير">
      <Card title="اعتماد خصم للفاتورة الحالية" className="dialog-card">
        <p className="muted dialog-description">
          هذا المستخدم لا يملك صلاحية خصم مباشرة. أدخل كلمة مرور المدير لفتح الخصم لهذه الفاتورة فقط.
        </p>

        <form onSubmit={(event) => { void handleSubmit(event); }}>
          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <span>كلمة مرور المدير</span>
              <input
                data-autofocus
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (submitError) setSubmitError('');
                }}
                placeholder="أدخل كلمة المرور"
                disabled={isPending}
              />
            </label>
          </div>

          {submitError ? (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(220, 38, 38, 0.25)',
                background: 'rgba(220, 38, 38, 0.08)',
                color: '#991b1b',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {submitError}
            </div>
          ) : null}

          <div className="actions" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>إلغاء</Button>
            <Button type="submit" variant="primary" disabled={isPending || !password.trim()}>{isPending ? 'جارٍ الاعتماد...' : 'اعتماد الخصم'}</Button>
          </div>
        </form>
      </Card>
    </DialogShell>
  );
}
