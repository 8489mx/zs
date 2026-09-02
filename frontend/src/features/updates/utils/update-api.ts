/**
 * Returns the base URL for the offline update API.
 * Do NOT use window.location.origin here.
 */
export function getOfflineUpdateApiBaseUrl(): string {
  return import.meta.env.VITE_OFFLINE_UPDATE_API_BASE_URL || '';
}
