import { type ReactNode } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';

export interface StandardDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  width?: string;
  maxWidth?: string;
  minHeight?: string;
  height?: string;
  maxHeight?: string;
  zIndex?: number;
  ariaLabel?: string;
  footerActions?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  loadingText?: string;
}

/**
 * StandardDialog - المكون المعياري الرسمي للنوافذ المنبثقة (Popups / Modals) في Z-Systems
 * 
 * يضمن:
 * 1. مساحة تنفس وحشو داخلي مريح يمنع تآكل الحواف (Zero Margin Clipping).
 * 2. ثبات أبعاد النافذة تلقائياً ومنع التمدد الفجائي أو الانكماش (Anti-Ballooning & Anti-Shrink Standard).
 * 3. ترويسة مؤسسية موحدة بالخط الأزرق الملكي وزر الإغلاق.
 * 4. خلو تام من كلاسات Tailwind غير المدعومة.
 * 5. أزرار إجراءات قياسية متناسقة مع دستور النظام.
 */
export function StandardDialog({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width,
  maxWidth,
  minHeight,
  height,
  maxHeight,
  zIndex = 10000,
  ariaLabel,
  footerActions,
  footer,
  loading = false,
  loadingText,
}: StandardDialogProps) {
  const isVisible = open !== undefined ? open : Boolean(isOpen);
  if (!isVisible) return null;
  const resolvedWidth = width || maxWidth || 'min(840px, 95vw)';
  const resolvedFooter = footerActions || footer;

  // Universal Pre-balanced Dimensions:
  // Prevents popups from opening collapsed (100px) then jumping/ballooning when async data loads.
  // Can be explicitly overridden with minHeight="auto" for small confirmation dialogs.
  const resolvedHeight = height;
  const resolvedMinHeight =
    minHeight !== undefined
      ? minHeight === 'auto'
        ? undefined
        : minHeight
      : resolvedHeight
      ? undefined
      : 'min(560px, 85vh)';

  return (
    <DialogShell
      open={isVisible}
      onClose={onClose}
      width={resolvedWidth}
      height={resolvedHeight}
      minHeight={resolvedMinHeight}
      maxHeight={maxHeight}
      zIndex={zIndex}
      ariaLabel={ariaLabel || (typeof title === 'string' ? title : 'نافذة منبثقة')}
    >
      <div
        className="standard-dialog-container"
        dir="rtl"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          height: resolvedHeight ? '100%' : undefined,
          minHeight: resolvedMinHeight || 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">{title}</h3>
            {subtitle && <p className="standard-dialog-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق النافذة"
            title="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          className="standard-dialog-body"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: resolvedHeight ? '100%' : undefined,
            minHeight: resolvedHeight ? 0 : (resolvedMinHeight ? '280px' : 'auto'),
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
            overflowY: resolvedHeight ? 'hidden' : undefined,
          }}
        >
          {loading ? (
            <div
              style={{
                flex: 1,
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #cbd5e1',
                  borderTopColor: '#170e5e',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}>
                {loadingText || 'جارٍ تحميل البيانات...'}
              </span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Optional Footer */}
        {resolvedFooter && (
          <div className="standard-dialog-footer">
            {resolvedFooter}
          </div>
        )}
      </div>
    </DialogShell>
  );
}

/**
 * StandardDialogFooter - تذييل قياسي لأزرار الحفظ والإلغاء
 */
export interface StandardDialogFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  cancelText?: string;
  submitText?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  extraActions?: ReactNode;
}

export function StandardDialogFooter({
  onCancel,
  onSubmit,
  cancelText = 'إلغاء',
  submitText = 'حفظ التغييرات',
  isSubmitting = false,
  submitDisabled = false,
  extraActions,
}: StandardDialogFooterProps) {
  return (
    <div className="standard-dialog-footer">
      {extraActions}
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
      {onSubmit && (
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={submitDisabled || isSubmitting}
        >
          {isSubmitting ? 'جاري الحفظ...' : submitText}
        </Button>
      )}
    </div>
  );
}
