import { useEffect, useState } from 'react';

export function FullScreenToggleButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const electronRuntime = (window as any).electronRuntime;
    if (electronRuntime && typeof electronRuntime.getFullScreenState === 'function') {
      electronRuntime.getFullScreenState().then((state: boolean) => {
        setIsFullscreen(Boolean(state));
      });
      if (typeof electronRuntime.onFullScreenChange === 'function') {
        const unsubscribe = electronRuntime.onFullScreenChange((state: boolean) => {
          setIsFullscreen(Boolean(state));
        });
        return () => {
          unsubscribe();
        };
      }
    } else {
      // Browser fallback
      const handleFsChange = async () => {
        const isFS = Boolean(document.fullscreenElement);
        setIsFullscreen(isFS);
        if (isFS) {
          if ('keyboard' in navigator && typeof (navigator as any).keyboard?.lock === 'function') {
            try {
              await (navigator as any).keyboard.lock(['Escape']);
            } catch {
              // ignore
            }
          }
        } else {
          if ('keyboard' in navigator && typeof (navigator as any).keyboard?.unlock === 'function') {
            try {
              (navigator as any).keyboard.unlock();
            } catch {
              // ignore
            }
          }
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F11') {
          e.preventDefault();
          void handleToggle();
        }
      };
      document.addEventListener('fullscreenchange', handleFsChange);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('fullscreenchange', handleFsChange);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  const handleToggle = async () => {
    const electronRuntime = (window as any).electronRuntime;
    if (electronRuntime && typeof electronRuntime.toggleFullScreen === 'function') {
      const newState = await electronRuntime.toggleFullScreen();
      setIsFullscreen(Boolean(newState));
    } else {
      // Browser fallback
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          if ('keyboard' in navigator && typeof (navigator as any).keyboard?.lock === 'function') {
            try {
              await (navigator as any).keyboard.lock(['Escape']);
            } catch {
              // ignore
            }
          }
          setIsFullscreen(true);
        } catch {
          // ignore
        }
      } else {
        try {
          if ('keyboard' in navigator && typeof (navigator as any).keyboard?.unlock === 'function') {
            try {
              (navigator as any).keyboard.unlock();
            } catch {
              // ignore
            }
          }
          await document.exitFullscreen();
          setIsFullscreen(false);
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <button
      type="button"
      style={{
        width: 40,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--surface-sunken)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        cursor: 'pointer',
        flexShrink: 0
      }}
      title={isFullscreen ? 'إلغاء ملء الشاشة وإظهار شريط المهام (F11)' : 'ملء الشاشة وإخفاء شريط المهام (F11)'}
      onClick={handleToggle}
      aria-label={isFullscreen ? 'إلغاء ملء الشاشة' : 'ملء الشاشة'}
    >
      {isFullscreen ? (
        // Exit Fullscreen / Restore icon
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      ) : (
        // Fullscreen Expand icon
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      )}
    </button>
  );
}
