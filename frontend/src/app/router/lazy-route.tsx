import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';

function RouteLoadingFallback() {
  return null;
}

export type LazyLoader = () => Promise<{ default: ComponentType<unknown> }>;

const registeredLoaders = new Set<LazyLoader>();

function OfflineRouteFallback() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', padding: '24px', textAlign: 'center' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 28px', maxWidth: '480px', width: '100%', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#d97706',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
          الصفحة غير متاحة بدون اتصال بالإنترنت
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
          هذه الشاشة تتطلب اتصالاً بالخادم لتحميل ملفاتها وبياناتها. يمكنك العودة فوراً إلى شاشة نقطة البيع لمتابعة تسجيل الفواتير كالمعتاد دون أي توقف.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/pos');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            transition: 'opacity 0.15s ease',
          }}
        >
          <span>العودة إلى نقطة البيع (الكاشير)</span>
        </button>
      </div>
    </div>
  );
}

function lazyWithRetry(loader: LazyLoader) {
  registeredLoaders.add(loader);
  return lazy(() =>
    loader().catch((err) => {
      const isOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        String(err?.message || '').toLowerCase().includes('failed to fetch') ||
        String(err?.message || '').toLowerCase().includes('dynamically imported module') ||
        String(err?.message || '').toLowerCase().includes('loading chunk');

      if (isOffline) {
        return { default: OfflineRouteFallback as unknown as ComponentType<unknown> };
      }

      // Chunk failed to load (likely a new deployment changed the hash).
      // Reload the page once to fetch fresh assets.
      const reloadKey = '_chunk_reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      } else {
        sessionStorage.removeItem(reloadKey);
      }
      return { default: OfflineRouteFallback as unknown as ComponentType<unknown> };
    }),
  );
}

export function createLazyRoute(loader: LazyLoader): ReactNode {
  const LazyComponent = lazyWithRetry(loader);
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LazyComponent />
    </Suspense>
  );
}

export function prefetchAllRouteModules() {
  if (typeof window === 'undefined') return;
  const loadAll = () => {
    registeredLoaders.forEach((loader) => {
      try {
        void loader();
      } catch {}
    });
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(loadAll, { timeout: 4000 });
  } else {
    setTimeout(loadAll, 1200);
  }
}
