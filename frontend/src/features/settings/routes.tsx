import { Navigate } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const settingsRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'settings', element: <Navigate to="/settings/overview" replace /> },
    { path: 'settings/:section', element: createLazyRoute(() => import('@/features/settings/pages/SettingsPage').then((module) => ({ default: module.SettingsPage }))) }
  ],
  navigation: [{ key: 'settings', label: 'الإعدادات', to: '/settings' }]
};
