import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';

function RouteLoadingFallback() {
  return null;
}

type LazyLoader = () => Promise<{ default: ComponentType<unknown> }>;

function lazyWithRetry(loader: LazyLoader) {
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
