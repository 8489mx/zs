import React from 'react';
import { UtensilsIcon, BellIcon, BellOffIcon, Maximize2Icon } from '@/shared/components/icons/AppIcons';

interface KdsHeaderProps {
  currentTime: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRecallLastServed: () => void;
  isRecalling: boolean;
  onToggleFullscreen: () => void;
}

export const KdsHeader: React.FC<KdsHeaderProps> = ({
  currentTime,
  soundEnabled,
  onToggleSound,
  onRecallLastServed,
  isRecalling,
  onToggleFullscreen,
}) => {
  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Brand & Live Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
          }}
        >
          <UtensilsIcon size={20} color="#ffffff" strokeWidth={2} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              شاشة المطبخ التفاعلية (KDS)
            </h1>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                backgroundColor: '#170e5e',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.5px',
              }}
            >
              LIVE
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
            نظام إدارة وتوجيه طلبات المطبخ الذكي • Z-Kitchen Operations
          </div>
        </div>
      </div>

      {/* Live Clock & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'left', direction: 'ltr' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              fontFamily: 'monospace',
              color: '#170e5e',
              letterSpacing: '0.5px',
            }}
          >
            {currentTime}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            style={{
              backgroundColor: soundEnabled ? '#eff6ff' : '#f8fafc',
              color: soundEnabled ? '#170e5e' : '#64748b',
              border: `1px solid ${soundEnabled ? '#bfdbfe' : '#cbd5e1'}`,
              borderRadius: '8px',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="تفعيل/كتم صوت جرس التنبيه"
          >
            {soundEnabled ? <BellIcon size={14} color="#170e5e" /> : <BellOffIcon size={14} color="#64748b" />}
            <span>{soundEnabled ? 'التنبيه مفعّل' : 'مكتوم'}</span>
          </button>

          {/* Recall Last Served */}
          <button
            type="button"
            onClick={onRecallLastServed}
            disabled={isRecalling}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.15s ease',
            }}
            title="استرجاع آخر طلب مكتمل"
          >
            <span>استرجاع آخر طلب</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
            title="ملء الشاشة"
          >
            <Maximize2Icon size={16} color="#334155" />
          </button>
        </div>
      </div>
    </header>
  );
};
