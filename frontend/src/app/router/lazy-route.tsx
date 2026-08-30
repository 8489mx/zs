import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';

function RouteLoadingFallback() {
  return null;
}

export type LazyLoader = () => Promise<{ default: ComponentType<unknown> }>;

const registeredLoaders = new Set<LazyLoader>();

function lazyWithRetry(loader: LazyLoader) {
  registeredLoaders.add(loader);
  return lazy(() =>
    loader().catch(() => {
      // Chunk failed to load (likely a new deployment changed the hash).
      // Reload the page once to fetch fresh assets.
      const reloadKey = '_chunk_reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      } else {
        sessionStorage.removeItem(reloadKey);
      }
      // Return a no-op component so TypeScript is satisfied.
      return { default: (() => null) as unknown as ComponentType<unknown> };
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
