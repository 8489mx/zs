// PERF-9 (PERFORMANCE_CONSTITUTION.md) — when a POS terminal re-downloads its offline catalog.
//
// The IndexedDB copy exists so the cashier can keep searching, scanning and selling when the internet
// drops (usePosCatalog / PosWorkspace fall back to it; sales queue in pos-offline-sync). It must NOT be
// removed or shrunk. What changed is only WHEN it is refreshed:
//   1. the server catalog version changed  → something a cashier sees changed (price, name, barcode,
//      unit, offer, product added/removed). The version ignores stock on purpose (migration 137).
//   2. the local copy is older than one hour → keeps the offline stock figures reasonably fresh, and is
//      the safety net for any catalog edit the version somehow missed.
// The version check itself (cheap) still runs every 5 minutes.
export const POS_CATALOG_FULL_REFRESH_MS = 60 * 60_000;

export interface PosCatalogSyncState {
  remoteVersion: string;
  storedVersion: string | null;
  storedCount: number;
  lastSyncedAt: string | null;
  now?: number;
}

export function shouldDownloadFullCatalog(state: PosCatalogSyncState): boolean {
  if (!state.storedVersion || state.storedCount <= 0) return true;
  if (state.storedVersion !== state.remoteVersion) return true;
  const lastSynced = state.lastSyncedAt ? new Date(state.lastSyncedAt).getTime() : NaN;
  if (!Number.isFinite(lastSynced)) return true;
  const now = state.now ?? Date.now();
  // A clock moved backwards (lastSynced in the future) counts as stale rather than "fresh forever".
  return now - lastSynced >= POS_CATALOG_FULL_REFRESH_MS || lastSynced > now + 60_000;
}
