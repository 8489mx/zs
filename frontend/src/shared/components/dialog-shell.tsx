import { useEffect, useRef, type ReactNode } from 'react';

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  zIndex?: number;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  ariaLabel?: string;
  overlayClassName?: string;
  shellClassName?: string;
}

function getFocusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
}

export function DialogShell({
  open,
  onClose,
  children,
  width = 'min(720px, 100%)',
  zIndex = 10000,
  closeOnBackdrop = true,
  showCloseButton = false,
  ariaLabel,
  overlayClassName = '',
  shellClassName = '',
}: DialogShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    const focusDialog = () => {
      const shell = shellRef.current;
      if (!shell) return;
      if (typeof shell.scrollIntoView === 'function') {
        shell.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      }
      const focusable = getFocusableElements(shell);
      const preferredTarget = shell.querySelector<HTMLElement>('[data-autofocus]');
      (preferredTarget || focusable[0] || shell).focus();
    };

    const frameId = window.requestAnimationFrame(focusDialog);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const shell = shellRef.current;
      if (!shell) return;
      const focusable = getFocusableElements(shell);
      if (!focusable.length) {
        event.preventDefault();
        shell.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`dialog-overlay ${overlayClassName}`.trim()}
      style={{ zIndex }}
      onClick={(event) => {
        if (!closeOnBackdrop) return;
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={shellRef}
        className={`dialog-shell ${shellClassName}`.trim()}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            aria-label="إغلاق"
            title="إغلاق (Esc)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
