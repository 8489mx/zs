import { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { PrinterIcon, ReceiptIcon, FileTextIcon, ChevronDownIcon } from '@/shared/components/icons/AppIcons';

export interface ReportPrintMenuProps {
  onPrintA4?: () => void | Promise<void>;
  onPrintReceipt?: () => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  title?: string;
  variant?: 'menu' | 'dual';
  buttonVariant?: 'primary' | 'secondary';
  style?: React.CSSProperties;
  className?: string;
}

export function ReportPrintMenu({
  onPrintA4,
  onPrintReceipt,
  disabled = false,
  label = 'طباعة',
  title,
  variant = 'menu',
  buttonVariant = 'secondary',
  style,
  className,
}: ReportPrintMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // If only one print handler is provided, render a direct button
  if (!onPrintReceipt && onPrintA4) {
    return (
      <Button
        variant={buttonVariant}
        onClick={() => void onPrintA4()}
        disabled={disabled}
        title={title || label}
        style={style}
        className={className}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <PrinterIcon size={14} />
          <span>{label}</span>
        </span>
      </Button>
    );
  }

  if (variant === 'dual') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }} className={className}>
        {onPrintA4 && (
          <Button
            variant={buttonVariant}
            onClick={() => void onPrintA4()}
            disabled={disabled}
            title="طباعة A4 (مستند قياسي)"
            style={{ fontSize: '12px', padding: '0 10px', minHeight: '30px' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FileTextIcon size={13} />
              <span>{label} A4</span>
            </span>
          </Button>
        )}
        {onPrintReceipt && (
          <Button
            variant={buttonVariant}
            onClick={() => void onPrintReceipt()}
            disabled={disabled}
            title="طباعة ريسيت حراري (80mm)"
            style={{ fontSize: '12px', padding: '0 10px', minHeight: '30px' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ReceiptIcon size={13} />
              <span>{label} ريسيت</span>
            </span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', ...style }} className={className}>
      <Button
        variant={buttonVariant}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        title={title || `${label} (A4 أو ريسيت حراري)`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <PrinterIcon size={14} />
        <span>{label}</span>
        <ChevronDownIcon size={12} style={{ transition: 'transform 0.15s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </Button>

      {isOpen && !disabled && (
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 100,
            minWidth: '210px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {onPrintA4 && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                void onPrintA4();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 10px',
                border: 'none',
                background: 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#170e5e', flexShrink: 0 }}>
                <FileTextIcon size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>طباعة A4 (قياسي / PDF)</span>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>مستند عريض كامل للمكاتب والأرشفة</span>
              </div>
            </button>
          )}

          {onPrintReceipt && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                void onPrintReceipt();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 10px',
                border: 'none',
                background: 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', flexShrink: 0 }}>
                <ReceiptIcon size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, color: '#166534' }}>طباعة ريسيت حراري (80mm)</span>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>مضغوط وموفر للورق لطابعات البون</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
