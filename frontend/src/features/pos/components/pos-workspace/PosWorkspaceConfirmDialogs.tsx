import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { HeldPosDraftSummary } from '@/features/pos/components/pos-cart-panel/posCartPanel.types';
import type { PosItem } from '@/features/pos/types/pos.types';

interface PosWorkspaceConfirmDialogsProps {
  clearCartConfirmOpen: boolean;
  lineDeleteConfirmItem: PosItem | null;
  heldDeleteConfirmDraft: HeldPosDraftSummary | null;
  clearHeldConfirmOpen: boolean;
  heldDraftsCount: number;
  onCancelClearCart: () => void;
  onConfirmClearCart: () => void;
  onCancelLineDelete: () => void;
  onConfirmLineDelete: () => void;
  onCancelHeldDelete: () => void;
  onConfirmHeldDelete: () => void | Promise<void>;
  onCancelClearHeld: () => void;
  onConfirmClearHeld: () => void | Promise<void>;
}

export function PosWorkspaceConfirmDialogs({
  clearCartConfirmOpen,
  lineDeleteConfirmItem,
  heldDeleteConfirmDraft,
  clearHeldConfirmOpen,
  heldDraftsCount,
  onCancelClearCart,
  onConfirmClearCart,
  onCancelLineDelete,
  onConfirmLineDelete,
  onCancelHeldDelete,
  onConfirmHeldDelete,
  onCancelClearHeld,
  onConfirmClearHeld,
}: PosWorkspaceConfirmDialogsProps) {
  return (
    <>
      <ActionConfirmDialog
        open={clearCartConfirmOpen}
        title="هل تريد تفريغ الفاتورة الحالية؟"
        description="سيتم حذف كل بنود الفاتورة الحالية فقط، ولن يتم حذف أي فاتورة معلقة."
        confirmLabel="تفريغ"
        cancelLabel="إلغاء"
        confirmVariant="danger"
        onCancel={onCancelClearCart}
        onConfirm={onConfirmClearCart}
      />

      <ActionConfirmDialog
        open={Boolean(lineDeleteConfirmItem)}
        title="تأكيد حذف البند"
        description={lineDeleteConfirmItem ? `سيتم حذف ${lineDeleteConfirmItem.name} من الفاتورة الحالية.` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        confirmVariant="danger"
        onCancel={onCancelLineDelete}
        onConfirm={onConfirmLineDelete}
      />

      <ActionConfirmDialog
        open={Boolean(heldDeleteConfirmDraft)}
        title="تأكيد حذف الفاتورة المعلقة"
        description={heldDeleteConfirmDraft ? `سيتم حذف ${heldDeleteConfirmDraft.label} من الفواتير المعلقة.` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        confirmVariant="danger"
        onCancel={onCancelHeldDelete}
        onConfirm={onConfirmHeldDelete}
      />

      <ActionConfirmDialog
        open={clearHeldConfirmOpen}
        title="تأكيد حذف كل الفواتير المعلقة"
        description={`سيتم حذف ${heldDraftsCount} فاتورة معلقة من هذه الشاشة. اكتب حذف الكل للتأكيد.`}
        confirmLabel="حذف الكل"
        cancelLabel="إلغاء"
        confirmVariant="danger"
        confirmationKeyword="حذف الكل"
        confirmationLabel="اكتب حذف الكل لتأكيد حذف كل الفواتير المعلقة"
        onCancel={onCancelClearHeld}
        onConfirm={onConfirmClearHeld}
      />
    </>
  );
}
