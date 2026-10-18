import { describe, expect, it, vi, afterEach } from 'vitest';
import { requestStoragePersistence, isStoragePersisted, getStorageEstimate } from './storage-persistence';

describe('storage-persistence', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('returns false when navigator.storage is not available', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const persisted = await requestStoragePersistence();
    expect(persisted).toBe(false);

    const isPersist = await isStoragePersisted();
    expect(isPersist).toBe(false);

    const estimate = await getStorageEstimate();
    expect(estimate).toBeNull();
  });

  it('returns true if already persisted without calling persist()', async () => {
    const persistMock = vi.fn().mockResolvedValue(true);
    const persistedMock = vi.fn().mockResolvedValue(true);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          persist: persistMock,
          persisted: persistedMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await requestStoragePersistence();
    expect(result).toBe(true);
    expect(persistedMock).toHaveBeenCalledTimes(1);
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('calls persist() when not already persisted and returns result', async () => {
    const persistMock = vi.fn().mockResolvedValue(true);
    const persistedMock = vi.fn().mockResolvedValue(false);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          persist: persistMock,
          persisted: persistedMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await requestStoragePersistence();
    expect(result).toBe(true);
    expect(persistedMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledTimes(1);
  });

  it('calculates quota and usage accurately in getStorageEstimate()', async () => {
    const estimateMock = vi.fn().mockResolvedValue({
      quota: 100 * 1024 * 1024,
      usage: 25 * 1024 * 1024,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          estimate: estimateMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const estimate = await getStorageEstimate();
    expect(estimate).not.toBeNull();
    expect(estimate?.quotaMb).toBe(100);
    expect(estimate?.usageMb).toBe(25);
    expect(estimate?.percentUsed).toBe(25);
  });
});
