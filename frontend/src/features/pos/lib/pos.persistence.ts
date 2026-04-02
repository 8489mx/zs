import type { Sale } from '@/types/domain';
import type { HeldPosDraft, PosDraftSnapshot } from '@/features/pos/hooks/usePosWorkspace';

const POS_STORAGE_PREFIX = 'zsystems.react.pos';
const POS_DRAFT_STORAGE_KEY = `${POS_STORAGE_PREFIX}.draft`;
const POS_HELD_STORAGE_KEY = `${POS_STORAGE_PREFIX}.held`;
const POS_RECENT_STORAGE_KEY = `${POS_STORAGE_PREFIX}.recent`;
const POS_LAST_SALE_STORAGE_KEY = `${POS_STORAGE_PREFIX}.last-sale`;

const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 2;
const HELD_MAX_ITEMS = 15;
const HELD_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
const RECENT_MAX_ITEMS = 8;

interface StoredEnvelope<T> {
  savedAt: string;
  value: T;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readEnvelope<T>(key: string): StoredEnvelope<T> | null {
  const storage = getStorage();
  if (!storage) return null;
  const parsed = safeParse<StoredEnvelope<T> | null>(storage.getItem(key), null);
  if (!parsed || typeof parsed !== 'object' || !('savedAt' in parsed) || !('value' in parsed)) return null;
  return parsed;
}

function writeEnvelope<T>(key: string, value: T) {
  const storage = getStorage();
  if (!storage) return;
  const payload: StoredEnvelope<T> = { savedAt: new Date().toISOString(), value };
  storage.setItem(key, JSON.stringify(payload));
}

function isFresh(savedAt: string, maxAgeMs: number) {
  const time = new Date(savedAt).getTime();
  return Number.isFinite(time) && Date.now() - time <= maxAgeMs;
}

export function buildDraftState(initial?: Partial<PosDraftSnapshot>): PosDraftSnapshot {
  return {
    cart: initial?.cart || [],
    customerId: initial?.customerId || '',
    discount: Number(initial?.discount || 0),
    paidAmount: Number(initial?.paidAmount || 0),
    cashAmount: Number(initial?.cashAmount || 0),
    cardAmount: Number(initial?.cardAmount || 0),
    paymentType: initial?.paymentType || 'cash',
    paymentChannel: initial?.paymentChannel || 'cash',
    note: initial?.note || '',
    search: initial?.search || '',
    priceType: initial?.priceType || 'retail',
    branchId: initial?.branchId || '',
    locationId: initial?.locationId || '',
  };
}

export function loadPosWorkspaceStorage() {
  const draftEnvelope = readEnvelope<PosDraftSnapshot>(POS_DRAFT_STORAGE_KEY);
  const heldEnvelope = readEnvelope<HeldPosDraft[]>(POS_HELD_STORAGE_KEY);
  const recentEnvelope = readEnvelope<string[]>(POS_RECENT_STORAGE_KEY);
  const lastSaleEnvelope = readEnvelope<Sale>(POS_LAST_SALE_STORAGE_KEY);

  const draft = draftEnvelope && isFresh(draftEnvelope.savedAt, DRAFT_MAX_AGE_MS)
    ? buildDraftState(draftEnvelope.value)
    : null;

  const heldDrafts = (heldEnvelope?.value || [])
    .filter((entry) => entry && typeof entry === 'object' && typeof entry.savedAt === 'string')
    .filter((entry) => isFresh(entry.savedAt, HELD_MAX_AGE_MS))
    .slice(0, HELD_MAX_ITEMS)
    .map((entry) => ({ ...buildDraftState(entry), id: String(entry.id || Date.now()), savedAt: entry.savedAt }));

  const recentProductIds = Array.from(new Set((recentEnvelope?.value || []).map((item) => String(item || '')).filter(Boolean))).slice(0, RECENT_MAX_ITEMS);
  const lastSale = lastSaleEnvelope?.value || null;

  return { draft, heldDrafts, recentProductIds, lastSale };
}

export function persistDraftSnapshot(snapshot: PosDraftSnapshot) {
  writeEnvelope(POS_DRAFT_STORAGE_KEY, buildDraftState(snapshot));
}

export function clearDraftSnapshot() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(POS_DRAFT_STORAGE_KEY);
}

export function persistHeldDrafts(heldDrafts: HeldPosDraft[]) {
  writeEnvelope(POS_HELD_STORAGE_KEY, heldDrafts.slice(0, HELD_MAX_ITEMS));
}

export function persistRecentProductIds(recentProductIds: string[]) {
  writeEnvelope(POS_RECENT_STORAGE_KEY, Array.from(new Set(recentProductIds)).slice(0, RECENT_MAX_ITEMS));
}

export function persistLastSale(lastSale: Sale | null) {
  const storage = getStorage();
  if (!storage) return;
  if (!lastSale) {
    storage.removeItem(POS_LAST_SALE_STORAGE_KEY);
    return;
  }
  writeEnvelope(POS_LAST_SALE_STORAGE_KEY, lastSale);
}
