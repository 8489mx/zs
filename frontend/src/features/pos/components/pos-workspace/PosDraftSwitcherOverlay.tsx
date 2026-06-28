import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/format';

const ClockIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

interface PosDraftSwitcherOverlayProps {
  drafts: { id: string; label: string; total: number; itemsCount: number; savedAt: string }[];
  onRecall: (draftIndex: number) => void;
}

export function PosDraftSwitcherOverlay({ drafts, onRecall }: PosDraftSwitcherOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-scroll to the selected item when it changes
  useEffect(() => {
    if (isOpen) {
      const selectedEl = document.getElementById(`draft-row-${selectedIndex}`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  const stateRef = useRef({ isOpen, selectedIndex, drafts, onRecall });
  
  useEffect(() => {
    stateRef.current = { isOpen, selectedIndex, drafts, onRecall };
  }, [isOpen, selectedIndex, drafts, onRecall]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.altKey && (event.key.toLowerCase() === 'f' || event.code === 'KeyF')) {
        event.preventDefault();
        
        const current = stateRef.current;
        if (current.drafts.length === 0) return;
        
        if (!current.isOpen) {
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex((prev) => (prev + 1) % current.drafts.length);
        }
      } else if (stateRef.current.isOpen && event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const current = stateRef.current;
      if (!current.isOpen) return;
      
      // If the user released either Control or Alt, it means the modifier chord is broken
      if (event.key === 'Control' || event.key === 'Alt' || (!event.ctrlKey || !event.altKey)) {
        event.preventDefault();
        setIsOpen(false);
        if (current.drafts[current.selectedIndex]) {
          current.onRecall(current.selectedIndex);
        }
      }
    }

    // Use capturing phase so we can intercept before other components process it
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  if (!isOpen || drafts.length === 0) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)'
      }}
      dir="rtl"
    >
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '600px',
        border: '1px solid #e2e8f0',
        pointerEvents: 'auto',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockIcon style={{ width: '18px', height: '18px', color: '#64748b' }} />
            تبديل سريع للفواتير المعلقة
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>افلت زراير Ctrl + Alt لاختيار الفاتورة</p>
        </div>
        <div style={{ padding: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
          {drafts.map((draft, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                id={`draft-row-${idx}`}
                key={draft.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                  backgroundColor: isSelected ? '#f5f3ff' : '#fff',
                  border: isSelected ? '2px solid #170c5c' : '1px solid transparent',
                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem', color: isSelected ? '#170c5c' : '#334155' }}>
                      {draft.label}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      border: '1px solid',
                      backgroundColor: isSelected ? '#170c5c' : '#f1f5f9',
                      color: isSelected ? '#fff' : '#475569',
                      borderColor: isSelected ? '#170c5c' : '#e2e8f0',
                    }}>
                      فاتورة #{idx + 1}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: isSelected ? '#4338ca' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ClockIcon style={{ width: '12px', height: '12px' }} />
                      {new Date(draft.savedAt).toLocaleString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>عدد العناصر: {draft.itemsCount}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: isSelected ? '#170c5c' : '#334155' }}>
                  {formatCurrency(draft.total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
