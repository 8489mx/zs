import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const productsRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'products', element: createLazyRoute(() => import('@/features/products/pages/ProductsPage').then((module) => ({ default: module.ProductsPage }))) },
    { path: 'products/new', element: createLazyRoute(() => import('@/features/products/pages/NewProductPage').then((module) => ({ default: module.NewProductPage }))) },
    { path: 'products/:id/edit', element: createLazyRoute(() => import('@/features/products/pages/EditProductPage').then((module) => ({ default: module.EditProductPage }))) },
  ],
  navigation: [{ key: 'products', label: 'الأصناف', to: '/products' }]
};
