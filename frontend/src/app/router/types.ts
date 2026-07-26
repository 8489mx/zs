import type { ReactNode } from 'react';

export interface AppRouteDefinition {
  index?: boolean;
  path?: string;
  element: ReactNode;
}

export interface NavigationItemDefinition {
  key: string;
  label: string;
  to: string;
  end?: boolean;
  platformOnly?: boolean;
  activePaths?: string[];
}

export interface FeatureRouteModule {
  routes: AppRouteDefinition[];
  navigation?: NavigationItemDefinition[];
}
