import React from 'react';
import { GlobeIcon } from '@/shared/components/icons/AppIcons';

interface DisplayLanguageToggleProps {
  currentLang: string;
  onToggle: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const DisplayLanguageToggle: React.FC<DisplayLanguageToggleProps> = ({
  currentLang,
  onToggle,
  style,
  className,
}) => {
  const isEn = currentLang === 'en';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={className}
      title={isEn ? 'تبديل الواجهة إلى العربية' : 'Switch display interface to English'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        borderRadius: '8px',
        border: '1.5px solid #cbd5e1',
        background: '#ffffff',
        color: '#170e5e',
        fontSize: '12px',
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        lineHeight: 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      <GlobeIcon size={14} color="#170e5e" strokeWidth={2.4} />
      <span>{isEn ? 'AR | العربية' : 'EN | English'}</span>
    </button>
  );
};
