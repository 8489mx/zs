import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('zs_pwa_dismissed') === 'true';
  });
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect if iOS Safari and not standalone
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = (window.navigator as any).standalone === true;

    if (isIosDevice && !isStandalone && !dismissed) {
      setIsIOS(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [dismissed]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('zs_pwa_dismissed', 'true');
    setInstallPrompt(null);
    setShowIOSTip(false);
  };

  if (dismissed) return null;
  if (!installPrompt && !isIOS) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderTop: '3px solid #170e5e',
        borderRadius: '12px',
        padding: '10px 16px',
        boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '460px',
        width: 'calc(100% - 32px)',
        boxSizing: 'border-box',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        📱
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: '12.5px', color: '#0f172a', display: 'block', fontWeight: 800 }}>
          تثبيت تطبيق Z-Systems على الهاتف
        </strong>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {isIOS
            ? 'لتشغيل شاشات الكاشير والمتابعة بكامل الشاشة كالبرامج الأصلية'
            : 'يعمل بكامل الشاشة بدون شريط متصفح وبسرعة فائقة'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {installPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            تثبيت الآن
          </button>
        )}

        {isIOS && (
          <button
            type="button"
            onClick={() => setShowIOSTip(!showIOSTip)}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            كيفية التثبيت؟
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {showIOSTip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            marginTop: '6px',
            fontSize: '11.5px',
            color: '#334155',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}
        >
          📱 على أجهزة آبل: اضغط على زر المشاركة <strong>(Share ⎋)</strong> أسفل المتصفح، ثم اختر <strong>"إضافة إلى الشاشة الرئيسية (Add to Home Screen ➕)"</strong>.
        </div>
      )}
    </div>
  );
}
