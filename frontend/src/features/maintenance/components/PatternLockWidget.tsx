import { useState } from 'react';

interface PatternLockWidgetProps {
  value?: string;
  onChange: (val: string) => void;
}

export function PatternLockWidget({ value = '', onChange }: PatternLockWidgetProps) {
  const [mode, setMode] = useState<'text' | 'pattern'>('text');
  const [selectedDots, setSelectedDots] = useState<number[]>([]);

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
    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
          🔒 رمز القفل أو النمط (Pattern):
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('text')}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            رمز / PIN
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'pattern' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('pattern')}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            رسمة النمط (3x3)
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <input
          type="text"
          dir="ltr"
          className="purchase-prototype-field-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="مثال: 1234 أو كلمة المرور..."
          style={{ width: '100%' }}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 44px)',
              gap: '12px',
              justifyContent: 'center',
              margin: '8px auto',
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
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2563eb' : '2px solid #cbd5e1',
                    background: isSelected ? '#3b82f6' : '#fff',
                    color: isSelected ? '#fff' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{dot}</span>
                  {isSelected && (
                    <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>#{orderIndex + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              النمط المحدد: <strong dir="ltr">{value || 'لم يتم التحديد'}</strong>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleClear}
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              مسح
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
