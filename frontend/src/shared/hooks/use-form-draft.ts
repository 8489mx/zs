import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseFormDraftOptions<T> {
  /** Unique localStorage key for this draft */
  key: string;
  /** Current state data to persist */
  data: T;
  /** Function to check if the current data is considered completely empty / initial */
  isEmpty: (data: T) => boolean;
  /** Callback fired when an existing draft is detected and restored on mount */
  onRestore: (restoredData: T) => void;
  /** Debounce delay in milliseconds before saving to localStorage (default 400ms) */
  debounceMs?: number;
  /** Whether draft saving is currently enabled (default true) */
  enabled?: boolean;
}

export interface UseFormDraftResult {
  /** Completely wipe the draft from storage */
  clearDraft: () => void;
  /** Whether a draft was restored on initial mount */
  isDraftRestored: boolean;
  /** Dismiss the restored notification badge/banner */
  dismissRestoredNotice: () => void;
  /** Whether a draft currently exists in localStorage */
  hasSavedDraft: boolean;
  /** Force an immediate synchronous write to storage */
  flushDraft: () => void;
}

/**
 * Universal zero-overhead debounced draft hook.
 *
 * Saves form state to browser localStorage debounced (400ms), avoiding any server calls
 * or UI lag. Automatically purges the draft when the form is empty or explicitly submitted.
 */
export function useFormDraft<T>({
  key,
  data,
  isEmpty,
  onRestore,
  debounceMs = 400,
  enabled = true,
}: UseFormDraftOptions<T>): UseFormDraftResult {
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const isInitializedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>('');
  const timeoutRef = useRef<number | null>(null);
  const currentDataRef = useRef<T>(data);
  const isEmptyRef = useRef(isEmpty);
  const onRestoreRef = useRef(onRestore);

  currentDataRef.current = data;
  isEmptyRef.current = isEmpty;
  onRestoreRef.current = onRestore;

  // 1. Initial Mount: Restore draft if one exists
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        if (parsed && typeof parsed === 'object' && !isEmptyRef.current(parsed)) {
          lastSavedSnapshotRef.current = raw;
          setHasSavedDraft(true);
          setIsDraftRestored(true);
          onRestoreRef.current(parsed);
        } else {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    } finally {
      isInitializedRef.current = true;
    }
  }, [key]);

  // Flush function to write dirty state immediately
  const flushDraft = useCallback(() => {
    if (typeof window === 'undefined' || !enabled || !isInitializedRef.current) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const current = currentDataRef.current;
      if (isEmptyRef.current(current)) {
        window.localStorage.removeItem(key);
        lastSavedSnapshotRef.current = '';
        setHasSavedDraft(false);
      } else {
        const snapshot = JSON.stringify(current);
        if (snapshot !== lastSavedSnapshotRef.current) {
          window.localStorage.setItem(key, snapshot);
          lastSavedSnapshotRef.current = snapshot;
          setHasSavedDraft(true);
        }
      }
    } catch {
      // ignore storage quota errors silently
    }
  }, [enabled, key]);

  // Clear draft helper
  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastSavedSnapshotRef.current = '';
    setHasSavedDraft(false);
    setIsDraftRestored(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }, [key]);

  // 2. Debounced auto-save effect on data change
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || !isInitializedRef.current) return;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isEmpty(data)) {
      // If form was cleared back to empty state, remove draft
      if (lastSavedSnapshotRef.current || hasSavedDraft) {
        clearDraft();
      }
      return;
    }

    let snapshot = '';
    try {
      snapshot = JSON.stringify(data);
    } catch {
      return;
    }

    // Skip if unchanged
    if (snapshot === lastSavedSnapshotRef.current) return;

    timeoutRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, snapshot);
        lastSavedSnapshotRef.current = snapshot;
        setHasSavedDraft(true);
      } catch {
        // storage quota exceeded or blocked
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, enabled, isEmpty, key, clearDraft, hasSavedDraft]);

  // 3. Flush on component unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushDraft();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushDraft();
    };
  }, [flushDraft]);

  return {
    clearDraft,
    isDraftRestored,
    dismissRestoredNotice: () => setIsDraftRestored(false),
    hasSavedDraft,
    flushDraft,
  };
}
