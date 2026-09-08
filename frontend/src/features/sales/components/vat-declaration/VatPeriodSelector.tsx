import React from 'react';

export type PeriodPreset = 'current_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom';

interface VatPeriodSelectorProps {
  country: 'EG' | 'SA';
  setCountry: (c: 'EG' | 'SA') => void;
  periodPreset: PeriodPreset;
  setPeriodPreset: (p: PeriodPreset) => void;
  customFrom: string;
  setCustomFrom: (f: string) => void;
  customTo: string;
  setCustomTo: (t: string) => void;
}

export const VatPeriodSelector: React.FC<VatPeriodSelectorProps> = ({
  country,
  setCountry,
  periodPreset,
  setPeriodPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginTop: '16px',
        marginBottom: '20px',
      }}
    >
      {/* Country Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setCountry('EG')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: country === 'EG' ? '#170e5e' : '#f1f5f9',
            color: country === 'EG' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>نموذج 10 (مصلحة الضرائب المصرية 14%)</span>
        </button>
        <button
          type="button"
          onClick={() => setCountry('SA')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: country === 'SA' ? '#170e5e' : '#f1f5f9',
            color: country === 'SA' ? '#ffffff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>إقرار القيمة المضافة (ZATCA السعودية 15%)</span>
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>الفترة:</span>
        <select
          value={periodPreset}
          onChange={(e) => setPeriodPreset(e.target.value as any)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            backgroundColor: '#ffffff',
            outline: 'none',
          }}
        >
          <option value="current_month">الشهر الحالي</option>
          <option value="last_month">الشهر السابق</option>
          <option value="q1">الربع الأول (Q1)</option>
          <option value="q2">الربع الثاني (Q2)</option>
          <option value="q3">الربع الثالث (Q3)</option>
          <option value="q4">الربع الرابع (Q4)</option>
          <option value="custom">فترة مخصصة</option>
        </select>

        {periodPreset === 'custom' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <span>إلى</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
