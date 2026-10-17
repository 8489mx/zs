import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { SUPPORTED_LANGUAGES, getLanguageMeta } from '@/lib/languages';

interface LanguageSwitcherMenuProps {
  compact?: boolean;
}

export function LanguageSwitcherMenu({ compact = false }: LanguageSwitcherMenuProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language || 'ar';
  const currentMeta = getLanguageMeta(currentLang);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={t('common.switch_language', 'تغيير لغة النظام (Change Language)')}
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '0 8px' : '0 10px',
          backgroundColor: currentMeta.code !== 'ar' ? '#eff6ff' : 'var(--surface-sunken)',
          border: currentMeta.code !== 'ar' ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
          borderRadius: 8,
          cursor: 'pointer',
          flexShrink: 0,
          fontSize: '11.5px',
          fontWeight: 700,
          color: currentMeta.code !== 'ar' ? '#1e40af' : '#334155',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}
      >
        <GlobeIcon size={16} color={currentMeta.code !== 'ar' ? '#2563eb' : '#475569'} />
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {currentMeta.shortCode}
        </span>
        <svg
          viewBox="0 0 20 20"
          width="12"
          height="12"
          fill="currentColor"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            opacity: 0.6,
          }}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('common.languages', 'اللغات المتاحة')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            insetInlineEnd: 0,
            width: '240px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div
            style={{
              padding: '6px 10px 4px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#64748b',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{t('common.system_language', 'لغة النظام')}</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              {SUPPORTED_LANGUAGES.length} {t('common.languages_count', 'لغات')}
            </span>
          </div>

          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentMeta.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectLanguage(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'start',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span
                      style={{
                        width: '26px',
                        height: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#bbf7d0' : '#f1f5f9',
                        color: isSelected ? '#166534' : '#475569',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {lang.shortCode}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? '#15803d' : '#0f172a',
                        }}
                      >
                        {lang.nativeLabel}
                      </span>
                      {lang.nativeLabel !== lang.label && (
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {lang.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: '#f8fafc',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {lang.dir}
                    </span>
                    {isSelected && (
                      <CheckCircleIcon size={15} color="#16a34a" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
