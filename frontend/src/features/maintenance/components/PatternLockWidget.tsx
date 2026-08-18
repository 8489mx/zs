import { useState } from 'react';

interface PatternLockWidgetProps {
  value?: string;
  onChange: (val: string) => void;
}

export function PatternLockWidget({ value = '', onChange }: PatternLockWidgetProps) {
  const isPatternInitially = value.startsWith('نمط:') || value.startsWith('pattern:');
  const [mode, setMode] = useState<'text' | 'pattern'>(isPatternInitially ? 'pattern' : 'text');
  const [selectedDots, setSelectedDots] = useState<number[]>(() => {
    if (isPatternInitially) {
      const match = value.match(/\d+/g);
      return match ? match.map(Number) : [];
    }
    return [];
  });

  const handleDotClick = (num: number) => {
    if (selectedDots.includes(num)) return;
    const next = [...selectedDots, num];
    setSelectedDots(next);
    onChange(`نمط: ${next.join('-')}`);
  };

  const handleClear = () => {
    setSelectedDots([]);
    onChange('');
  };

  return (
    <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          رمز أو قفل الشاشة (Screen Lock)
        </span>
        
        {/* Clean Segmented Switch */}
        <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setMode('text')}
            style={{
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'text' ? '#fff' : 'transparent',
              color: mode === 'text' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'text' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            كلمة المرور / PIN
          </button>
          <button
            type="button"
            onClick={() => setMode('pattern')}
            style={{
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'pattern' ? '#fff' : 'transparent',
              color: mode === 'pattern' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'pattern' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            نمط الشاشة (Pattern)
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <div>
          <input
            type="text"
            dir="ltr"
            className="purchase-prototype-field-input"
            value={value.startsWith('نمط:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="مثال: 1234 أو Passcode أو لا يوجد قفل..."
            style={{
              width: '100%',
              fontSize: '0.9rem',
              padding: '7px 10px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginBottom: '6px' }}>
            اضغط على النقاط بالتتابع لرسم النمط المطلوب:
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 40px)',
              gap: '10px',
              justifyContent: 'center',
              margin: '2px auto 10px',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
              const isSelected = selectedDots.includes(dot);
              const orderIndex = selectedDots.indexOf(dot);
              return (
                <button
                  key={dot}
                  type="button"
                  onClick={() => handleDotClick(dot)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2563eb' : '1px dashed #cbd5e1',
                    background: isSelected ? '#2563eb' : '#f8fafc',
                    color: isSelected ? '#fff' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{dot}</span>
                  {isSelected && (
                    <span style={{ fontSize: '0.6rem', lineHeight: 1, opacity: 0.9 }}>
                      #{orderIndex + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#334155' }}>
              النمط المسجل:{' '}
              <strong dir="ltr" style={{ color: selectedDots.length ? '#2563eb' : '#94a3b8' }}>
                {selectedDots.length ? `[ ${selectedDots.join(' → ')} ]` : 'لم يتم تحديد نمط'}
              </strong>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleClear}
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              إعادة ضبط
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


