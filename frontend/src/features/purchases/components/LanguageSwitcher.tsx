import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../utils/i18n-purchase-prototype';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleLanguage = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="language-switcher-root" ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="purchase-prototype-icon-button purchase-prototype-toolbar-icon-button"
        aria-label="Language"
        title="Language"
        onClick={() => setIsOpen(!isOpen)}
      >
        🌐
      </button>

      {isOpen && (
        <div className="language-switcher-dropdown" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          [language === 'ar' ? 'left' : 'right']: 0,
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          minWidth: '150px',
          zIndex: 100,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '4px'
        }}>
          <button
            type="button"
            className="language-switcher-option"
            onClick={() => toggleLanguage('ar')}
            style={{
              padding: '8px 12px',
              textAlign: language === 'ar' ? 'right' : 'left',
              background: language === 'ar' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: language === 'ar' ? '#2563eb' : 'inherit',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: language === 'ar' ? 600 : 400,
            }}
          >
            <span>🇪🇬</span>
            <span>العربية</span>
          </button>
          <button
            type="button"
            className="language-switcher-option"
            onClick={() => toggleLanguage('en')}
            style={{
              padding: '8px 12px',
              textAlign: language === 'ar' ? 'right' : 'left',
              background: language === 'en' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: language === 'en' ? '#2563eb' : 'inherit',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: language === 'en' ? 600 : 400,
            }}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>
        </div>
      )}
    </div>
  );
}
