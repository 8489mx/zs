import { useEffect, useMemo, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { formatCurrency } from '@/lib/format';
import type { HeldPosDraftSummary } from '@/features/pos/components/pos-cart-panel/posCartPanel.types';

interface PosHeldDraftsDialogProps {
  open: boolean;
  heldDrafts: HeldPosDraftSummary[];
  hasActiveCart: boolean;
  requestedRecallDraftId?: string;
  onRequestedRecallHandled?: () => void;
  onClose: () => void;
  onRecall: (draftId: string) => Promise<void>;
  onDelete: (draftId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export function PosHeldDraftsDialog({
  open,
  heldDrafts,
  hasActiveCart,
  requestedRecallDraftId = '',
  onRequestedRecallHandled,
  onClose,
  onRecall,
  onDelete,
  onClearAll,
}: PosHeldDraftsDialogProps) {
  const [pendingRecallId, setPendingRecallId] = useState('');
  const [confirmReplaceId, setConfirmReplaceId] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const replaceDraft = useMemo(
    () => heldDrafts.find((entry) => entry.id === confirmReplaceId) || null,
    [confirmReplaceId, heldDrafts],
  );

  async function requestRecall(draftId: string) {
    if (hasActiveCart) {
      setConfirmReplaceId(draftId);
      return;
    }
    setPendingRecallId(draftId);
    await onRecall(draftId);
    setPendingRecallId('');
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    setSelectedIndex((current) => {
      if (!heldDrafts.length) return 0;
      return Math.min(current, heldDrafts.length - 1);
    });
  }, [heldDrafts, open]);

  useEffect(() => {
    if (!open || !requestedRecallDraftId) return;
    const exists = heldDrafts.some((entry) => entry.id === requestedRecallDraftId);
    if (!exists) {
      onRequestedRecallHandled?.();
      return;
    }
    void requestRecall(requestedRecallDraftId);
    onRequestedRecallHandled?.();
  }, [heldDrafts, onRequestedRecallHandled, open, requestedRecallDraftId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));
      if (isTypingTarget) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (!heldDrafts.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, heldDrafts.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const draft = heldDrafts[selectedIndex];
        if (draft) void requestRecall(draft.id);
        return;
      }
      if (event.key === 'Delete') {
        event.preventDefault();
        const draft = heldDrafts[selectedIndex];
        if (draft) void onDelete(draft.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [heldDrafts, onClose, onDelete, open, selectedIndex]);

  if (!open) return null;

  return (
    <>
      <DialogShell open={open} onClose={onClose} width="min(780px, 100%)" zIndex={87} ariaLabel="الفواتير المعلقة">
        <Card title={`الفواتير المعلقة (${heldDrafts.length})`} className="dialog-card">
          {heldDrafts.length ? (
            <div className="list-stack">
              {heldDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`list-row pos-held-draft-dialog-row ${heldDrafts[selectedIndex]?.id === draft.id ? 'is-selected' : ''}`.trim()}
                  onClick={() => setSelectedIndex(heldDrafts.findIndex((entry) => entry.id === draft.id))}
                >
                  <div className="pos-held-draft-dialog-copy">
                    <strong>{draft.label || 'عميل نقدي'}</strong>
                    <small className="muted">عدد العناصر: {draft.itemsCount}</small>
                    <small className="muted">الإجمالي: {formatCurrency(draft.total)}</small>
                  </div>
                  <div className="actions compact-actions">
                    <Button
                      variant="secondary"
                      disabled={pendingRecallId === draft.id}
                      onClick={() => { void requestRecall(draft.id); }}
                    >
                      {pendingRecallId === draft.id ? 'جاري الاسترجاع...' : 'استرجاع'}
                    </Button>
                    <Button variant="danger" onClick={() => { void onDelete(draft.id); }}>
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">لا توجد فواتير معلقة حاليًا.</p>
          )}
          <div className="actions compact-actions" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <Button variant="danger" onClick={() => { void onClearAll(); }} disabled={!heldDrafts.length}>
              حذف الكل
            </Button>
            <Button variant="secondary" onClick={onClose}>إغلاق</Button>
          </div>
        </Card>
      </DialogShell>

      <ActionConfirmDialog
        open={Boolean(replaceDraft)}
        title="استبدال السلة الحالية"
        description="السلة الحالية تحتوي على أصناف. هل تريد استبدالها بالفاتورة المعلقة المختارة؟"
        confirmLabel="استبدال واسترجاع"
        cancelLabel="رجوع"
        confirmVariant="danger"
        onCancel={() => setConfirmReplaceId('')}
        onConfirm={async () => {
          if (!confirmReplaceId) return;
          setPendingRecallId(confirmReplaceId);
          await onRecall(confirmReplaceId);
          setPendingRecallId('');
          setConfirmReplaceId('');
          onClose();
        }}
      />
    </>
  );
}
