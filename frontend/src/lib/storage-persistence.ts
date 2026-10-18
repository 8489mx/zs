/**
 * Storage Persistence Manager
 * Ensures IndexedDB and localStorage (POS offline catalog & sales queue) are granted
 * persistent storage mode by the browser (NavigatorStorage.persist()).
 * Prevents Safari/iOS WebKit and Chrome from evicting offline records under storage pressure
 * or after inactivity.
 */

export async function isStoragePersisted(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator?.storage?.persisted) {
    return false;
  }
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator?.storage?.persist) {
    return false;
  }

  try {
    const alreadyPersisted = await isStoragePersisted();
    if (alreadyPersisted) {
      return true;
    }

    const granted = await navigator.storage.persist();
    if (import.meta.env.DEV) {
      console.log(`[StoragePersistence] Persistent storage granted: ${granted}`);
    }
    return granted;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[StoragePersistence] Could not request storage persistence:', error);
    }
    return false;
  }
}

export async function getStorageEstimate(): Promise<{
  quotaMb?: number;
  usageMb?: number;
  percentUsed?: number;
} | null> {
  if (typeof window === 'undefined' || !navigator?.storage?.estimate) {
    return null;
  }
  try {
    const { quota, usage } = await navigator.storage.estimate();
    const quotaMb = quota ? Math.round(quota / (1024 * 1024)) : undefined;
    const usageMb = usage ? Math.round(usage / (1024 * 1024)) : undefined;
    const percentUsed = quota && usage ? Math.round((usage / quota) * 100) : undefined;
    return { quotaMb, usageMb, percentUsed };
  } catch {
    return null;
  }
}
