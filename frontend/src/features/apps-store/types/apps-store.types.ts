import type { PlanTierKey } from '@/features/settings/components/modular-configurator/modular-presets';
import type { ComponentType, CSSProperties } from 'react';

export type AppCategoryKey =
  | 'all'
  | 'installed'
  | 'pos'
  | 'inventory'
  | 'finance'
  | 'contracting'
  | 'maritime'
  | 'specialized'
  | 'logistics';

export interface AppItemDefinition {
  key: string;
  title: string;
  category: AppCategoryKey;
  categoryLabel: string;
  shortDesc: string;
  features: string[];
  requiredPlan: PlanTierKey;
  icon: ComponentType<{ size?: number; color?: string; style?: CSSProperties }>;
  accentColor: string;
  accentBg: string;
  routePath?: string;
  dependencies?: string[];
  featureFlag?: string;
}
