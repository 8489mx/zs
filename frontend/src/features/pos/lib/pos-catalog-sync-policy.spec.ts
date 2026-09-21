import { describe, expect, it } from 'vitest';
import { POS_CATALOG_FULL_REFRESH_MS, shouldDownloadFullCatalog } from './pos-catalog-sync-policy';

// PERF-9 guard (PERFORMANCE_CONSTITUTION.md). The offline catalog must stay available; only the
// refresh cadence is policed here: version change or > 1 hour old — never on every heartbeat.
const now = Date.parse('2026-09-21T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

describe('shouldDownloadFullCatalog', () => {
  it('keeps the offline copy while the version is unchanged and it is under one hour old', () => {
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 500, lastSyncedAt: minutesAgo(5), now })).toBe(false);
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 500, lastSyncedAt: minutesAgo(59), now })).toBe(false);
  });

  it('reloads when the catalog version changed (price, name, barcode, unit, offer)', () => {
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-2', storedVersion: 'v2-1', storedCount: 500, lastSyncedAt: minutesAgo(1), now })).toBe(true);
  });

  it('reloads hourly even without a version change (offline stock freshness + safety net)', () => {
    expect(POS_CATALOG_FULL_REFRESH_MS).toBe(60 * 60_000);
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 500, lastSyncedAt: minutesAgo(60), now })).toBe(true);
  });

  it('reloads when there is no usable offline copy', () => {
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: null, storedCount: 0, lastSyncedAt: null, now })).toBe(true);
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 0, lastSyncedAt: minutesAgo(1), now })).toBe(true);
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 10, lastSyncedAt: null, now })).toBe(true);
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 10, lastSyncedAt: 'garbage', now })).toBe(true);
  });

  it('treats a last-sync time in the future (clock moved back) as stale', () => {
    expect(shouldDownloadFullCatalog({ remoteVersion: 'v2-1', storedVersion: 'v2-1', storedCount: 10, lastSyncedAt: minutesAgo(-120), now })).toBe(true);
  });
});
