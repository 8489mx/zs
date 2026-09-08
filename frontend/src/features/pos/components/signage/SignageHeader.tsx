import React from 'react';
import { ShoppingCartIcon, Maximize2Icon, SettingsIcon } from '@/shared/components/icons/AppIcons';

interface SignageHeaderProps {
  storeName: string;
  currentTime: string;
  currentDate: string;
  progressPercent: number;
  onToggleFullscreen: () => void;
  onToggleSettings: () => void;
}

export const SignageHeader: React.FC<SignageHeaderProps> = ({
  storeName,
  currentTime,
  currentDate,
  progressPercent,
  onToggleFullscreen,
  onToggleSettings,
}) => {
  return (
    <>
      <header
        style={{
          padding: '12px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          zIndex: 20,
        }}
      >
        {/* Store Brand & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}
          >
            <ShoppingCartIcon size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 900,
                  letterSpacing: '-0.3px',
                  color: '#0f172a',
                }}
              >
                {storeName}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    display: 'inline-block',
                  }}
                />
                <span>بث مباشر بصالة العرض</span>
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              شاشة العروض الترويجية والصفقات الحصرية • Digital Showroom Board
            </p>
          </div>
        </div>

        {/* Live Clock & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'left', direction: 'ltr' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: '#170e5e',
                letterSpacing: '1px',
              }}
            >
              {currentTime}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, direction: 'rtl' }}>
              {currentDate}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onToggleFullscreen}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.15s ease',
              }}
              title="ملء الشاشة"
            >
              <Maximize2Icon size={18} color="#334155" />
            </button>

            <button
              type="button"
              onClick={onToggleSettings}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#170e5e',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.15s ease',
              }}
              title="إعدادات الشاشة وسرعة العرض"
            >
              <SettingsIcon size={18} color="#170e5e" />
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar for Current Slide */}
      <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #170e5e 0%, #2563eb 100%)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </>
  );
};
