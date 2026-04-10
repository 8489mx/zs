import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';

function RouteLoadingFallback() {
  return (
    <div className="screen-center">
      <div className="loading-card">جاري تحميل الصفحة...</div>
    </div>
  );
}

type LazyLoader = () => Promise<{ default: ComponentType<unknown> }>;

export function createLazyRoute(loader: LazyLoader): ReactNode {
  const LazyComponent = lazy(loader);
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LazyComponent />
    </Suspense>
  );
}
