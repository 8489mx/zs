import React from 'react';
import {
  ShoppingCartIcon,
  ClockIcon,
  Maximize2Icon,
  Minimize2Icon,
} from '@/shared/components/icons/AppIcons';

interface CfdHeaderProps {
  storeName: string;
  branchName?: string;
  currentTime: string;
  currentDate: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const CfdHeader: React.FC<CfdHeaderProps> = ({
  storeName,
  branchName,
  currentTime,
  currentDate,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="cfd-header">
      <div className="cfd-brand-section">
        <div className="cfd-logo-badge" aria-hidden="true">
          <ShoppingCartIcon size={22} color="#ffffff" />
        </div>
        <div>
          <div className="cfd-store-name">{storeName || 'مؤسستنا التجارية'}</div>
          {branchName && (
            <span className="cfd-branch-badge">{branchName}</span>
          )}
        </div>
      </div>

      <div className="cfd-header-meta">
        <div className="cfd-clock-badge">
          <ClockIcon size={16} color="#170e5e" />
          <span style={{ fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>{currentTime}</span>
          <span style={{ opacity: 0.3, margin: '0 4px' }}>|</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{currentDate}</span>
        </div>

        <div className="cfd-status-pill">
          <span className="cfd-status-dot" aria-hidden="true" />
          <span>بث مباشر للكاشير</span>
        </div>

        <button
          type="button"
          className="cfd-fullscreen-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2Icon size={18} /> : <Maximize2Icon size={18} />}
        </button>
      </div>
    </header>
  );
};
