import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { DialogShell } from '@/shared/components/dialog-shell';
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
      <DialogShell
        open={clearCartConfirmOpen}
        onClose={onCancelClearCart}
        width="min(450px, 92vw)"
        zIndex={80}
        overlayClassName="pos-destructive-confirm-overlay"
        shellClassName="pos-premium-clear-cart-shell"
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '36px 28px 24px',
            textAlign: 'center',
            position: 'relative',
          }}
          dir="rtl"
        >
          {/* Animated Icon Badge */}
          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2 0%, #ffedd5 100%)',
              border: '4px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 22px -6px rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
            }}
          >
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            هل تريد تفريغ الفاتورة الحالية؟
          </h3>

          {/* Description */}
          <p
            style={{
              margin: '0 0 26px',
              fontSize: '0.92rem',
              color: '#64748b',
              lineHeight: 1.6,
              fontWeight: 500,
              padding: '0 10px',
            }}
          >
            سيتم حذف كل بنود الفاتورة الحالية فقط، ولن يتم حذف أي فاتورة معلقة.
          </p>

          {/* Actions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={onCancelClearCart}
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#475569';
              }}
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={onConfirmClearCart}
              data-autofocus
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px -2px rgba(220, 38, 38, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px -2px rgba(220, 38, 38, 0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px -2px rgba(220, 38, 38, 0.45)';
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              تفريغ
            </button>
          </div>
        </div>
      </DialogShell>

      <ActionConfirmDialog
        open={Boolean(lineDeleteConfirmItem)}
        overlayClassName="pos-destructive-confirm-overlay"
        shellClassName="pos-destructive-confirm-shell"
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
        overlayClassName="pos-destructive-confirm-overlay"
        shellClassName="pos-destructive-confirm-shell"
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
        overlayClassName="pos-destructive-confirm-overlay"
        shellClassName="pos-destructive-confirm-shell"
        title="تأكيد حذف كل الفواتير المعلقة"
        description={`سيتم حذف ${heldDraftsCount} فاتورة معلقة من هذه الشاشة. اكتب حذف الكل للتأكيد.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        confirmVariant="danger"
        onCancel={onCancelClearHeld}
        onConfirm={onConfirmClearHeld}
      />
    </>
  );
}
