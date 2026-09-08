import { useState, useRef, useEffect } from 'react';
import { getDualDate } from '@/lib/hijri';
import { CalendarIcon, CheckCircleIcon, CopyIcon } from '@/shared/components/icons/AppIcons';

export function DualCalendarBadge() {
  const [dualDate] = useState(() => getDualDate());
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef} dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 12px',
          backgroundColor: isOpen ? '#ffffff' : 'var(--surface-sunken, #f8fafc)',
          border: isOpen ? '1px solid #170e5e' : '1px solid var(--border-color, #e2e8f0)',
          borderRadius: 8,
          cursor: 'pointer',
          flexShrink: 0,
          fontSize: '12px',
          fontWeight: 600,
          color: '#0f172a',
          fontFamily: '"IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif',
          boxShadow: isOpen ? '0 0 0 2px rgba(23, 14, 94, 0.1)' : 'none',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
        title="التقويم المزدوج (أم القرى والميلادي) — اضغط لعرض التفاصيل"
      >
        <CalendarIcon size={15} color="#170e5e" strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 700, color: '#0f172a' }}>
          {dualDate.dayName}، {dualDate.gregorian.day} {dualDate.gregorian.monthName} {dualDate.gregorian.year}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '310px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
            padding: '14px',
            zIndex: 1000,
            fontFamily: '"IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif',
            textAlign: 'right',
          }}
        >
          {/* Popover Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarIcon size={16} color="#170e5e" strokeWidth={2.2} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>التقويم المزدوج</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>اليوم: {dualDate.dayName}</p>
              </div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px' }}>
              أم القرى الرسمي
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Hijri Card */}
            <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block' }}>التاريخ الهجري (أم القرى)</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{dualDate.hijri.formatted}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dualDate.hijri.formatted, 'hijri')}
                style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                title="نسخ التاريخ الهجري"
              >
                {copiedKey === 'hijri' ? (
                  <CheckCircleIcon size={15} color="#059669" />
                ) : (
                  <CopyIcon size={15} color="#64748b" />
                )}
              </button>
            </div>

            {/* Gregorian Card */}
            <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block' }}>التاريخ الميلادي</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{dualDate.gregorian.formatted}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dualDate.gregorian.formatted, 'gregorian')}
                style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                title="نسخ التاريخ الميلادي"
              >
                {copiedKey === 'gregorian' ? (
                  <CheckCircleIcon size={15} color="#059669" />
                ) : (
                  <CopyIcon size={15} color="#64748b" />
                )}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>السنة المالية: <strong>{dualDate.gregorian.year}</strong></span>
            <button
              type="button"
              onClick={() => handleCopy(dualDate.combined, 'combined')}
              style={{ border: 'none', background: 'transparent', color: '#170e5e', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              {copiedKey === 'combined' ? 'تم النسخ!' : 'نسخ التاريخين معاً'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

