import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const productsRouteModule: FeatureRouteModule = {
  routes: [{ path: 'products', element: createLazyRoute(() => import('@/features/products/pages/ProductsPage').then((module) => ({ default: module.ProductsPage }))) }],
  navigation: [{ key: 'products', label: 'الأصناف', to: '/products' }]
};
