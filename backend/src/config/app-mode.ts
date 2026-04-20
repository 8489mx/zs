export const APP_MODES = ['LOCAL_PILOT', 'SELF_CONTAINED', 'CLOUD_SAAS'] as const;

export type AppMode = (typeof APP_MODES)[number];

export const LEGACY_APP_MODE_ALIASES = {
  offline: 'LOCAL_PILOT',
  online: 'CLOUD_SAAS',
} as const;

export function mapLegacyAppMode(value: AppMode | keyof typeof LEGACY_APP_MODE_ALIASES): AppMode {
  return LEGACY_APP_MODE_ALIASES[value as keyof typeof LEGACY_APP_MODE_ALIASES] ?? value;
}

export function isLocalRuntimeMode(mode: AppMode): boolean {
  return mode === 'LOCAL_PILOT' || mode === 'SELF_CONTAINED';
}
