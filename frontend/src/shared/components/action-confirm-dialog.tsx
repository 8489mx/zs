import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DialogShell } from '@/shared/components/dialog-shell';
import { getErrorMessage } from '@/lib/errors';

interface ActionConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'danger';
  isBusy?: boolean;
  confirmationKeyword?: string;
  confirmationLabel?: string;
  confirmationHint?: ReactNode;
  managerPinRequired?: boolean;
  managerPinLabel?: string;
  managerPinHint?: ReactNode;
  reasonRequired?: boolean;
  reasonLabel?: string;
  reasonHint?: ReactNode;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  overlayClassName?: string;
  shellClassName?: string;
  onConfirm: (context: { confirmationValue: string; managerPin: string; reason: string }) => void | Promise<void>;
  onCancel: () => void;
}

export function ActionConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  confirmVariant = 'danger',
  isBusy = false,
  confirmationKeyword = '',
  confirmationLabel = 'اكتب كلمة التأكيد للمتابعة',
  confirmationHint,
  managerPinRequired = false,
  managerPinLabel = 'رمز اعتماد المدير',
  managerPinHint,
  reasonRequired = false,
  reasonLabel = 'سبب التنفيذ',
  reasonHint,
  reasonPlaceholder = 'اكتب السبب باختصار',
  minReasonLength = 8,
  overlayClassName = '',
  shellClassName = '',
  onConfirm,
  onCancel
}: ActionConfirmDialogProps) {
  const [confirmationValue, setConfirmationValue] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setConfirmationValue('');
      setManagerPin('');
      setReason('');
      setSubmitError('');
    }
  }, [open]);

  const requiresKeyword = Boolean(confirmationKeyword.trim());
  const isKeywordMatched = useMemo(() => {
    if (!requiresKeyword) return true;
    return confirmationValue.trim() === confirmationKeyword.trim();
  }, [confirmationKeyword, confirmationValue, requiresKeyword]);

  const trimmedReason = reason.trim();
  const isManagerPinReady = !managerPinRequired || Boolean(managerPin.trim());
  const isReasonReady = !reasonRequired || trimmedReason.length >= minReasonLength;
  const canSubmit = isKeywordMatched && isManagerPinReady && isReasonReady && !isBusy;

  async function handleConfirm() {
    if (!canSubmit) return;

    setSubmitError('');

    try {
      await onConfirm({
        confirmationValue: confirmationValue.trim(),
        managerPin: managerPin.trim(),
        reason: trimmedReason,
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر تنفيذ العملية المطلوبة.'));
    }
  }

  if (!open) return null;

  return (
    <DialogShell open={open} onClose={isBusy ? () => {} : onCancel} width="min(560px, 100%)" zIndex={60} overlayClassName={overlayClassName} shellClassName={shellClassName}>
      <Card title={title} className="dialog-card">
        <div className="muted dialog-description">{description}</div>

        {requiresKeyword ? (
          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <span>{confirmationLabel}</span>
              <input
                value={confirmationValue}
                onChange={(event) => {
                  setConfirmationValue(event.target.value);
                  if (submitError) setSubmitError('');
                }}
                placeholder={confirmationKeyword}
                autoFocus={!managerPinRequired}
                disabled={isBusy}
              />
            </label>
            <div className="muted small" style={{ marginTop: 8 }}>
              {confirmationHint || `اكتب ${confirmationKeyword} لتأكيد العملية.`}
            </div>
          </div>
        ) : null}

        {reasonRequired ? (
          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <span>{reasonLabel}</span>
              <textarea
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (submitError) setSubmitError('');
                }}
                placeholder={reasonPlaceholder}
                rows={3}
                disabled={isBusy}
              />
            </label>
            <div className="muted small" style={{ marginTop: 8 }}>
              {reasonHint || `اكتب سببًا واضحًا لا يقل عن ${minReasonLength} أحرف.`}
            </div>
          </div>
        ) : null}

        {managerPinRequired ? (
          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <span>{managerPinLabel}</span>
              <input
                value={managerPin}
                onChange={(event) => {
                  setManagerPin(event.target.value);
                  if (submitError) setSubmitError('');
                }}
                type="password"
                placeholder="أدخل الرمز"
                inputMode="numeric"
                autoFocus={managerPinRequired && !requiresKeyword}
                disabled={isBusy}
              />
            </label>
            <div className="muted small" style={{ marginTop: 8 }}>
              {managerPinHint || 'أدخل رمز اعتماد المدير لإتمام هذه العملية.'}
            </div>
          </div>
        ) : null}

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
          <Button variant="secondary" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={() => void handleConfirm()}
            disabled={!canSubmit}
            data-autofocus={!requiresKeyword && !managerPinRequired && !reasonRequired ? true : undefined}
          >
            {isBusy ? 'جارٍ التنفيذ...' : confirmLabel}
          </Button>
        </div>
      </Card>
    </DialogShell>
  );
}
