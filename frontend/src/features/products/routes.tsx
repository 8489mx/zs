import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const productsRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'products',
      element: createLazyRoute(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage }))),
    },
    {
      path: 'products/categories',
      element: createLazyRoute(() => import('./pages/ProductCategoriesPage').then((m) => ({ default: m.ProductCategoriesPage }))),
    },
    {
      path: 'products/new',
      element: createLazyRoute(() => import('./pages/NewProductPage').then((m) => ({ default: m.NewProductPage }))),
    },
    {
      path: 'products/:id/edit',
      element: createLazyRoute(() => import('./pages/EditProductPage').then((m) => ({ default: m.EditProductPage }))),
    }
  ],
  navigation: [
    { key: 'products', label: 'الأصناف', to: '/products', end: true },
    { key: 'product-categories', label: 'أقسام الأصناف', to: '/products/categories' }
  ]
};
