import { type ReactNode, type CSSProperties } from 'react';
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
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
  zIndex?: number;
  ariaLabel?: string;
  badge?: ReactNode;
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
  badge,
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
  size,
}: StandardDialogProps) {
  const isVisible = open !== undefined ? open : Boolean(isOpen);
  if (!isVisible) return null;

  const sizeMap: Record<string, string> = {
    sm: 'min(500px, 90vw)',
    md: 'min(680px, 92vw)',
    lg: 'min(840px, 95vw)',
    xl: 'min(1080px, 95vw)',
  };

  const resolvedWidth = width || maxWidth || (size && sizeMap[size]) || 'min(840px, 95vw)';
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="standard-dialog-title">{title}</h3>
              {badge && (
                <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {badge}
                </span>
              )}
            </div>
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
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  onCancel?: () => void;
  onClose?: () => void;
  onSubmit?: (e?: any) => void | Promise<void>;
  onConfirm?: (e?: any) => void | Promise<void>;
  cancelText?: string;
  cancelLabel?: string;
  closeLabel?: string;
  submitText?: string;
  submitLabel?: string;
  confirmText?: string;
  confirmLabel?: string;
  primaryLabel?: string;
  onPrimary?: (e?: any) => void | Promise<void>;
  isSubmitting?: boolean;
  isPending?: boolean;
  isPrimaryLoading?: boolean;
  loadingText?: string;
  submitDisabled?: boolean;
  disabled?: boolean;
  isPrimaryDisabled?: boolean;
  extraActions?: ReactNode;
  primaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: string;
  };
}

export function StandardDialogFooter({
  onCancel,
  onClose,
  onSubmit,
  onConfirm,
  onPrimary,
  cancelText,
  cancelLabel,
  closeLabel,
  submitText,
  submitLabel,
  confirmText,
  confirmLabel,
  primaryLabel,
  isSubmitting = false,
  isPending = false,
  isPrimaryLoading = false,
  loadingText = 'جاري الحفظ...',
  submitDisabled = false,
  disabled = false,
  isPrimaryDisabled = false,
  extraActions,
  primaryButton,
  children,
  style,
  className,
}: StandardDialogFooterProps) {
  if (children) {
    return (
      <div className={`standard-dialog-footer ${className || ''}`.trim()} style={style}>
        {children}
      </div>
    );
  }

  const handleCancel = onCancel || onClose;
  const handleSubmit = onSubmit || onConfirm || onPrimary || primaryButton?.onClick;
  const resolvedCancelText = cancelText || cancelLabel || closeLabel || 'إلغاء';
  const resolvedSubmitText = confirmText || confirmLabel || submitText || submitLabel || primaryLabel || primaryButton?.label || 'حفظ التغييرات';
  const resolvedIsSubmitting = isSubmitting || isPending || isPrimaryLoading;
  const resolvedSubmitDisabled = submitDisabled || disabled || isPrimaryDisabled || Boolean(primaryButton?.disabled);

  return (
    <div className={`standard-dialog-footer ${className || ''}`.trim()} style={style}>
      {extraActions}
      {handleCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={resolvedIsSubmitting}
        >
          {resolvedCancelText}
        </Button>
      )}
      {handleSubmit && (
        <Button
          type="button"
          variant={(primaryButton?.variant as any) || 'primary'}
          onClick={handleSubmit}
          disabled={resolvedSubmitDisabled || resolvedIsSubmitting}
        >
          {resolvedIsSubmitting ? loadingText : resolvedSubmitText}
        </Button>
      )}
    </div>
  );
}
