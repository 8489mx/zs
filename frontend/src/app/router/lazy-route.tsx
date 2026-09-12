import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';

function RouteLoadingFallback() {
  return (
    <div
      className="page-stack page-shell route-loading-placeholder"
      dir="rtl"
      aria-busy="true"
      style={{
        minHeight: '60vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: 0.6,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '44px',
          width: '100%',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          background: 'linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%)',
          backgroundSize: '200% 100%',
          animation: 'routeShimmer 1.4s infinite ease-in-out',
        }}
      />
      <div
        style={{
          height: '280px',
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      />
    </div>
  );
}

export type LazyLoader = () => Promise<{ default: ComponentType<any> }>;

const registeredLoaders = new Set<LazyLoader>();

function RouteLoadErrorFallback() {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoDashboard = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '36px 28px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isOffline ? '#fffbeb' : '#f8fafc',
            border: isOffline ? '1px solid #fde68a' : '1px solid #e2e8f0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: isOffline ? '#d97706' : '#64748b',
          }}
        >
          {isOffline ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
          {isOffline ? 'تعذر الاتصال بالخادم (غير متصل بالإنترنت)' : 'تعذر تحميل محتوى هذه الصفحة'}
        </h3>

        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
          {isOffline
            ? 'يبدو أن جهازك غير متصل بالإنترنت حالياً. تتطلب هذه الشاشة اتصالاً بالخادم لتحميل أحدث ملفاتها وبياناتها السحابية.'
            : 'تعذر تحميل ملفات الصفحة المطلوبة، قد يكون ذلك بسبب تحديثات جديدة للمنظومة أو انقطاع مؤقت في الاتصال. يمكنك إعادة تحميل الصفحة للمحاولة مجدداً.'}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReload}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>إعادة تحميل الصفحة</span>
          </button>

          <button
            type="button"
            onClick={handleGoDashboard}
            style={{
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>العودة إلى لوحة التحكم</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function lazyWithRetry(loader: LazyLoader) {
  registeredLoaders.add(loader);
  return lazy(() =>
    loader().catch((_err) => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        return { default: RouteLoadErrorFallback as unknown as ComponentType<unknown> };
      }

      // Chunk failed to load (likely a new deployment changed the hash).
      // Reload the page once to fetch fresh assets.
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const reloadKey = `_chunk_reload_${encodeURIComponent(pathname)}`;
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return new Promise(() => {});
      } else if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(reloadKey);
      }
      return { default: RouteLoadErrorFallback as unknown as ComponentType<unknown> };
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

export function prefetchRoute(loader: LazyLoader) {
  try {
    void loader();
  } catch {}
}

export function prefetchAllRouteModules() {
  if (typeof window === 'undefined') return;

  // Staggered progressive loader that waits for initial rendering and queries to complete
  const scheduleStaggeredLoad = () => {
    const loaders = Array.from(registeredLoaders);
    let index = 0;

    const loadNext = () => {
      if (index >= loaders.length) return;
      try {
        void loaders[index]();
      } catch {}
      index++;

      // Stagger subsequent loads by 1200ms using idle callback to avoid starving user interactions
      setTimeout(() => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(loadNext, { timeout: 3000 });
        } else {
          loadNext();
        }
      }, 1200);
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadNext, { timeout: 6000 });
    } else {
      setTimeout(loadNext, 2500);
    }
  };

  // Delay kickoff so critical page bootstrap, auth, and queries execute without contention
  setTimeout(scheduleStaggeredLoad, 3000);
}
