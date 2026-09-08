import React from 'react';
import { SettingsIcon, XIcon } from '@/shared/components/icons/AppIcons';

interface SignageSettingsDrawerProps {
  onClose: () => void;
  slideIntervalSec: number;
  onSlideIntervalChange: (sec: number) => void;
  viewFilter: 'offers' | 'all';
  onViewFilterChange: (filter: 'offers' | 'all') => void;
  customTickerText: string;
  onCustomTickerTextChange: (text: string) => void;
}

export const SignageSettingsDrawer: React.FC<SignageSettingsDrawerProps> = ({
  onClose,
  slideIntervalSec,
  onSlideIntervalChange,
  viewFilter,
  onViewFilterChange,
  customTickerText,
  onCustomTickerTextChange,
}) => {
  return (
    <div
      dir="rtl"
      style={{
        position: 'absolute',
        top: '70px',
        left: '28px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        width: '340px',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.15)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800, fontSize: '15px' }}>
          <SettingsIcon size={16} color="#170e5e" />
          <span>إعدادات شاشة العروض</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XIcon size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            سرعة تبديل الشرائح (ثواني):
          </label>
          <select
            value={slideIntervalSec}
            onChange={(e) => onSlideIntervalChange(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
            }}
          >
            <option value={5}>5 ثوانٍ (سريع)</option>
            <option value={8}>8 ثوانٍ (افتراضي - ممتاز)</option>
            <option value={12}>12 ثانية (متأنٍ)</option>
            <option value={20}>20 ثانية (بطيء)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            مصدر الأصناف المعروضة:
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onViewFilterChange('offers')}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: '6px',
                border: `1px solid ${viewFilter === 'offers' ? '#170e5e' : '#cbd5e1'}`,
                backgroundColor: viewFilter === 'offers' ? '#170e5e' : '#f8fafc',
                color: viewFilter === 'offers' ? '#ffffff' : '#334155',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              العروض فقط
            </button>
            <button
              type="button"
              onClick={() => onViewFilterChange('all')}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: '6px',
                border: `1px solid ${viewFilter === 'all' ? '#170e5e' : '#cbd5e1'}`,
                backgroundColor: viewFilter === 'all' ? '#170e5e' : '#f8fafc',
                color: viewFilter === 'all' ? '#ffffff' : '#334155',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              كل المنتجات
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            نص الشريط المتحرك السفلي:
          </label>
          <textarea
            value={customTickerText}
            onChange={(e) => onCustomTickerTextChange(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              resize: 'none',
              fontSize: '11px',
              fontWeight: 600,
            }}
          />
        </div>
      </div>
    </div>
  );
};
