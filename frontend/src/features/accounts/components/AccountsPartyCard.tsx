import type { FormEventHandler, ReactNode } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

export function AccountsPartyCard({
  title,
  description,
  badge,
  isLoading,
  isError,
  error,
  isEmpty,
  loadingText,
  emptyTitle,
  emptyHint,
  quickLabel,
  quickName,
  onQuickNameChange,
  quickPhone,
  onQuickPhoneChange,
  quickPending,
  canManageParty,
  onQuickSubmit,
  quickSubmitLabel,
  permissionHint,
  children
}: {
  title: string;
  description: string;
  badge: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  loadingText: string;
  emptyTitle: string;
  emptyHint: string;
  quickLabel: string;
  quickName: string;
  onQuickNameChange: (value: string) => void;
  quickPhone: string;
  onQuickPhoneChange: (value: string) => void;
  quickPending: boolean;
  canManageParty: boolean;
  onQuickSubmit: FormEventHandler<HTMLFormElement>;
  quickSubmitLabel: string;
  permissionHint: string;
  children: ReactNode;
}) {
  return (
    <QueryCard
      title={title}
      description={description}
      actions={<span className="nav-pill">{badge}</span>}
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={isEmpty}
      loadingText={loadingText}
      emptyTitle={emptyTitle}
      emptyHint={emptyHint}
    >
      <form className="inline-create-panel" onSubmit={onQuickSubmit}>
        <div className="inline-create-grid">
          <Field label={quickLabel}>
            <input value={quickName} onChange={(event) => onQuickNameChange(event.target.value)} placeholder={quickLabel} disabled={quickPending || !canManageParty} />
          </Field>
          <Field label="الهاتف">
            <input value={quickPhone} onChange={(event) => onQuickPhoneChange(event.target.value)} placeholder="اختياري" disabled={quickPending || !canManageParty} />
          </Field>
        </div>
        <div className="actions compact-actions">
          <Button type="submit" variant="secondary" disabled={quickPending || !quickName.trim() || !canManageParty}>{quickSubmitLabel}</Button>
        </div>
      </form>
      {!canManageParty ? <div className="muted small">{permissionHint}</div> : null}
      {children}
    </QueryCard>
  );
}
