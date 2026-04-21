export const APP_MODES = ['offline', 'online'] as const;

export type AppMode = (typeof APP_MODES)[number];

export const LEGACY_APP_MODE_ALIASES = {
  LOCAL_PILOT: 'offline',
  SELF_CONTAINED: 'offline',
  CLOUD_SAAS: 'online',
} as const;

export function normalizeAppMode(value: string | null | undefined): AppMode {
  const normalized = String(value || '').trim();
  if (normalized === 'offline' || normalized === 'online') return normalized;
  return LEGACY_APP_MODE_ALIASES[normalized as keyof typeof LEGACY_APP_MODE_ALIASES] ?? 'online';
}

export function isLocalRuntimeMode(mode: AppMode): boolean {
  return mode === 'offline';
}
