import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DialogShell } from '@/components/shared/DialogShell';

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
  onConfirm,
  onCancel
}: ActionConfirmDialogProps) {
  const [confirmationValue, setConfirmationValue] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setConfirmationValue('');
      setManagerPin('');
      setReason('');
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

  if (!open) return null;

  return (
    <DialogShell open={open} onClose={isBusy ? () => {} : onCancel} width="min(560px, 100%)" zIndex={60}>
      <Card title={title} className="dialog-card">
        <div className="muted dialog-description">{description}</div>
        {requiresKeyword ? (
          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <span>{confirmationLabel}</span>
              <input
                value={confirmationValue}
                onChange={(event) => setConfirmationValue(event.target.value)}
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
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={reasonPlaceholder}
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
                type="password"
                inputMode="numeric"
                value={managerPin}
                onChange={(event) => setManagerPin(event.target.value)}
                placeholder="أدخل رمز المدير"
                autoFocus={!requiresKeyword}
                disabled={isBusy}
              />
            </label>
            <div className="muted small" style={{ marginTop: 8 }}>
              {managerPinHint || 'هذه العملية تتطلب اعتماد المدير.'}
            </div>
          </div>
        ) : null}
        <div className="actions dialog-actions">
          <Button variant="secondary" onClick={onCancel} disabled={isBusy}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={() => onConfirm({ confirmationValue, managerPin: managerPin.trim(), reason: trimmedReason })} disabled={isBusy || !isKeywordMatched || !isManagerPinReady || !isReasonReady}>{isBusy ? 'جاري التنفيذ...' : confirmLabel}</Button>
        </div>
      </Card>
    </DialogShell>
  );
}
