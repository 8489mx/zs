import { type ReactNode } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';

export interface StandardDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  width?: string;
  zIndex?: number;
  ariaLabel?: string;
  footerActions?: ReactNode;
}

/**
 * StandardDialog - المكون المعياري الرسمي للنوافذ المنبثقة (Popups / Modals) في Z-Systems
 * 
 * يضمن:
 * 1. مساحة تنفس وحشو داخلي مريح يمنع تآكل الحواف (Zero Margin Clipping).
 * 2. ترويسة مؤسسية موحدة بالخط الأزرق الملكي وزر الإغلاق.
 * 3. خلو تام من كلاسات Tailwind غير المدعومة.
 * 4. أزرار إجراءات قياسية متناسقة مع دستور النظام.
 */
export function StandardDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'min(720px, 95vw)',
  zIndex = 10000,
  ariaLabel,
  footerActions,
}: StandardDialogProps) {
  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width={width}
      zIndex={zIndex}
      ariaLabel={ariaLabel || (typeof title === 'string' ? title : 'نافذة منبثقة')}
    >
      <div className="standard-dialog-container" dir="rtl" style={{ width: '100%' }}>
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
        <div className="standard-dialog-body">
          {children}
        </div>

        {/* Optional Footer */}
        {footerActions && (
          <div className="standard-dialog-footer">
            {footerActions}
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
