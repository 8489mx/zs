import { Kysely, sql } from '../../database/kysely';
import { AppError } from '../errors/app-error';
import { Database } from '../../database/database.types';
import { ensureNonNegativeStock } from './financial-integrity';

type LockedProductRow = {
  id: number;
  name: string;
  stock_qty: number | string | null;
};

type StockBalanceRow = {
  id: number;
  product_id: number;
  branch_id: number | null;
  location_id: number | null;
  qty: number | string | null;
};

type StockScopeParams = {
  productId: number;
  branchId?: number | null;
  locationId?: number | null;
};

type StockDeltaParams = StockScopeParams & {
  delta: number;
  errorCode?: string;
  errorMessage?: string;
  allowNegative?: boolean;
};

type StockSetParams = StockScopeParams & {
  nextQty: number;
  errorCode?: string;
  errorMessage?: string;
};

type StockTransferParams = {
  productId: number;
  qty: number;
  fromBranchId?: number | null;
  fromLocationId: number;
  toBranchId?: number | null;
  toLocationId: number;
  errorCode?: string;
  errorMessage?: string;
};

type StockTransitParams = {
  productId: number;
  qty: number;
  branchId?: number | null;
  locationId: number;
  errorCode?: string;
  errorMessage?: string;
};

type StockDeltaResult = {
  globalBefore: number;
  globalAfter: number;
  scopeBefore: number;
  scopeAfter: number;
};

type StockTransferResult = {
  globalBefore: number;
  globalAfter: number;
  sourceBefore: number;
  sourceAfter: number;
  targetBefore: number;
  targetAfter: number;
};

type LockedState = {
  product: LockedProductRow;
  globalQty: number;
  balances: StockBalanceRow[];
};

function roundStockQty(value: number | string | null | undefined): number {
  return Number((Number(value || 0) + Number.EPSILON).toFixed(3));
}

async function loadLockedState(db: Kysely<Database>, productId: number): Promise<LockedState> {
  const product = await db
    .selectFrom('products')
    .select(['id', 'name', 'stock_qty'])
    .where('id', '=', productId)
    .forUpdate()
    .executeTakeFirst();

  if (!product) {
    throw new AppError(`Product #${productId} not found`, 'PRODUCT_NOT_FOUND', 404);
  }

  const balances = await db
    .selectFrom('product_location_stock')
    .select(['id', 'product_id', 'branch_id', 'location_id', 'qty'])
    .where('product_id', '=', productId)
    .forUpdate()
    .execute();

  return {
    product: {
      id: Number(product.id),
      name: String(product.name || ''),
      stock_qty: product.stock_qty,
    },
    globalQty: roundStockQty(product.stock_qty),
    balances: balances.map((row) => ({
      id: Number(row.id),
      product_id: Number(row.product_id),
      branch_id: row.branch_id == null ? null : Number(row.branch_id),
      location_id: row.location_id == null ? null : Number(row.location_id),
      qty: row.qty,
    })),
  };
}

async function insertBalanceRow(
  db: Kysely<Database>,
  productId: number,
  branchId: number | null,
  locationId: number | null,
  qty: number,
): Promise<StockBalanceRow> {
  const inserted = await db
    .insertInto('product_location_stock')
    .values({
      product_id: productId,
      branch_id: branchId,
      location_id: locationId,
      qty: roundStockQty(qty),
    })
    .returning(['id', 'product_id', 'branch_id', 'location_id', 'qty'])
    .executeTakeFirstOrThrow();

  return {
    id: Number(inserted.id),
    product_id: Number(inserted.product_id),
    branch_id: inserted.branch_id == null ? null : Number(inserted.branch_id),
    location_id: inserted.location_id == null ? null : Number(inserted.location_id),
    qty: inserted.qty,
  };
}

async function ensureUnassignedBalance(db: Kysely<Database>, state: LockedState): Promise<StockBalanceRow> {
  const existing = state.balances.find((row) => row.location_id == null);
  if (existing) return existing;
  const seedQty = state.balances.length === 0 ? state.globalQty : 0;
  const inserted = await insertBalanceRow(db, state.product.id, null, null, seedQty);
  state.balances.push(inserted);
  return inserted;
}

async function ensureLocationBalance(
  db: Kysely<Database>,
  state: LockedState,
  locationId: number,
  branchId: number | null,
): Promise<StockBalanceRow> {
  const existing = state.balances.find((row) => Number(row.location_id || 0) === Number(locationId));
  if (existing) {
    if (branchId != null && existing.branch_id == null) {
      await db
        .updateTable('product_location_stock')
        .set({ branch_id: branchId, updated_at: sql`NOW()` })
        .where('id', '=', existing.id)
        .execute();
      existing.branch_id = branchId;
    }
    return existing;
  }
  const inserted = await insertBalanceRow(db, state.product.id, branchId, locationId, 0);
  state.balances.push(inserted);
  return inserted;
}

async function updateBalanceQty(
  db: Kysely<Database>,
  row: StockBalanceRow,
  nextQty: number,
  branchId?: number | null,
): Promise<void> {
  const payload: Record<string, unknown> = { qty: roundStockQty(nextQty), updated_at: sql`NOW()` };
  if (branchId !== undefined && branchId !== row.branch_id) {
    payload.branch_id = branchId;
    row.branch_id = branchId ?? null;
  }
  await db.updateTable('product_location_stock').set(payload).where('id', '=', row.id).execute();
  row.qty = roundStockQty(nextQty);
}

async function updateGlobalQty(db: Kysely<Database>, productId: number, nextQty: number): Promise<void> {
  await db.updateTable('products').set({ stock_qty: roundStockQty(nextQty), updated_at: sql`NOW()` }).where('id', '=', productId).execute();
}

export async function previewConsumableStockQty(db: Kysely<Database>, params: StockScopeParams): Promise<number> {
  const state = await loadLockedState(db, params.productId);
  if (!params.locationId) return state.globalQty;
  const unassigned = await ensureUnassignedBalance(db, state);
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  return roundStockQty(Number(location.qty || 0) + Number(unassigned.qty || 0));
}

export async function previewAssignedLocationStockQty(db: Kysely<Database>, params: StockScopeParams): Promise<number> {
  const state = await loadLockedState(db, params.productId);
  if (!params.locationId) return state.globalQty;
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  return roundStockQty(location.qty);
}

export async function applyStockDelta(db: Kysely<Database>, params: StockDeltaParams): Promise<StockDeltaResult> {
  const delta = roundStockQty(params.delta);
  const state = await loadLockedState(db, params.productId);
  const globalBefore = state.globalQty;
  const globalAfter = roundStockQty(globalBefore + delta);
  const errorCode = params.errorCode || 'INSUFFICIENT_STOCK';
  const errorMessage = params.errorMessage || `Insufficient stock for ${state.product.name || `#${params.productId}`}`;

  if (!params.allowNegative) ensureNonNegativeStock(globalAfter, errorCode, errorMessage);

  if (!params.locationId) {
    const unassigned = await ensureUnassignedBalance(db, state);
    const scopeBefore = roundStockQty(unassigned.qty);
    const scopeAfter = roundStockQty(scopeBefore + delta);
    if (!params.allowNegative) ensureNonNegativeStock(scopeAfter, errorCode, errorMessage);
    await updateBalanceQty(db, unassigned, scopeAfter, null);
    await updateGlobalQty(db, params.productId, globalAfter);
    return { globalBefore, globalAfter, scopeBefore, scopeAfter };
  }

  const unassigned = await ensureUnassignedBalance(db, state);
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  let locationBefore = roundStockQty(location.qty);

  if (!params.allowNegative && delta < 0 && locationBefore + 0.0001 < Math.abs(delta)) {
    const shortage = roundStockQty(Math.abs(delta) - locationBefore);
    const unassignedBefore = roundStockQty(unassigned.qty);
    const unassignedAfter = roundStockQty(unassignedBefore - shortage);
    if (!params.allowNegative) ensureNonNegativeStock(unassignedAfter, errorCode, errorMessage);
    const provisionedLocationQty = roundStockQty(locationBefore + shortage);
    await updateBalanceQty(db, unassigned, unassignedAfter, null);
    await updateBalanceQty(db, location, provisionedLocationQty, params.branchId ?? null);
    locationBefore = provisionedLocationQty;
  }

  const scopeAfter = roundStockQty(locationBefore + delta);
  if (!params.allowNegative) ensureNonNegativeStock(scopeAfter, errorCode, errorMessage);
  await updateBalanceQty(db, location, scopeAfter, params.branchId ?? null);
  await updateGlobalQty(db, params.productId, globalAfter);
  return { globalBefore, globalAfter, scopeBefore: locationBefore, scopeAfter };
}

export async function setScopedStockQty(db: Kysely<Database>, params: StockSetParams): Promise<StockDeltaResult> {
  const nextQty = roundStockQty(params.nextQty);
  const state = await loadLockedState(db, params.productId);
  const errorCode = params.errorCode || 'INSUFFICIENT_STOCK';
  const errorMessage = params.errorMessage || `Invalid stock quantity for ${state.product.name || `#${params.productId}`}`;

  ensureNonNegativeStock(nextQty, errorCode, errorMessage);

  if (!params.locationId) {
    const unassigned = await ensureUnassignedBalance(db, state);
    const scopeBefore = roundStockQty(unassigned.qty);
    const delta = roundStockQty(nextQty - scopeBefore);
    const globalBefore = state.globalQty;
    const globalAfter = roundStockQty(globalBefore + delta);
    ensureNonNegativeStock(globalAfter, errorCode, errorMessage);
    await updateBalanceQty(db, unassigned, nextQty, null);
    await updateGlobalQty(db, params.productId, globalAfter);
    return { globalBefore, globalAfter, scopeBefore, scopeAfter: nextQty };
  }

  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  const scopeBefore = roundStockQty(location.qty);
  const delta = roundStockQty(nextQty - scopeBefore);
  const globalBefore = state.globalQty;
  const globalAfter = roundStockQty(globalBefore + delta);
  ensureNonNegativeStock(globalAfter, errorCode, errorMessage);
  await updateBalanceQty(db, location, nextQty, params.branchId ?? null);
  await updateGlobalQty(db, params.productId, globalAfter);
  return { globalBefore, globalAfter, scopeBefore, scopeAfter: nextQty };
}

async function moveUnassignedToLocation(
  db: Kysely<Database>,
  state: LockedState,
  qty: number,
  locationId: number,
  branchId: number | null,
  errorCode: string,
  errorMessage: string,
): Promise<{ unassignedBefore: number; unassignedAfter: number; locationBefore: number; locationAfter: number }> {
  const unassigned = await ensureUnassignedBalance(db, state);
  const location = await ensureLocationBalance(db, state, locationId, branchId);
  const unassignedBefore = roundStockQty(unassigned.qty);
  const unassignedAfter = roundStockQty(unassignedBefore - qty);
  ensureNonNegativeStock(unassignedAfter, errorCode, errorMessage);
  const locationBefore = roundStockQty(location.qty);
  const locationAfter = roundStockQty(locationBefore + qty);
  await updateBalanceQty(db, unassigned, unassignedAfter, null);
  await updateBalanceQty(db, location, locationAfter, branchId);
  return { unassignedBefore, unassignedAfter, locationBefore, locationAfter };
}

export async function beginLocationTransfer(db: Kysely<Database>, params: StockTransitParams): Promise<StockTransferResult> {
  const qty = roundStockQty(params.qty);
  const state = await loadLockedState(db, params.productId);
  const errorCode = params.errorCode || 'INSUFFICIENT_LOCATION_STOCK';
  const errorMessage = params.errorMessage || `Insufficient stock at source location for ${state.product.name || `#${params.productId}`}`;
  const source = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  const unassigned = await ensureUnassignedBalance(db, state);
  const sourceBefore = roundStockQty(source.qty);
  const sourceAfter = roundStockQty(sourceBefore - qty);
  ensureNonNegativeStock(sourceAfter, errorCode, errorMessage);
  const targetBefore = roundStockQty(unassigned.qty);
  const targetAfter = roundStockQty(targetBefore + qty);
  await updateBalanceQty(db, source, sourceAfter, params.branchId ?? null);
  await updateBalanceQty(db, unassigned, targetAfter, null);
  return {
    globalBefore: state.globalQty,
    globalAfter: state.globalQty,
    sourceBefore,
    sourceAfter,
    targetBefore,
    targetAfter,
  };
}

export async function receiveLocationTransfer(db: Kysely<Database>, params: StockTransitParams): Promise<StockTransferResult> {
  const qty = roundStockQty(params.qty);
  const state = await loadLockedState(db, params.productId);
  const errorCode = params.errorCode || 'TRANSFER_TRANSIT_STOCK_INVALID';
  const errorMessage = params.errorMessage || `Transfer stock is not available for ${state.product.name || `#${params.productId}`}`;
  const moved = await moveUnassignedToLocation(db, state, qty, params.locationId, params.branchId ?? null, errorCode, errorMessage);
  return {
    globalBefore: state.globalQty,
    globalAfter: state.globalQty,
    sourceBefore: moved.unassignedBefore,
    sourceAfter: moved.unassignedAfter,
    targetBefore: moved.locationBefore,
    targetAfter: moved.locationAfter,
  };
}

export async function restoreLocationTransfer(db: Kysely<Database>, params: StockTransitParams): Promise<StockTransferResult> {
  const qty = roundStockQty(params.qty);
  const state = await loadLockedState(db, params.productId);
  const errorCode = params.errorCode || 'TRANSFER_TRANSIT_STOCK_INVALID';
  const errorMessage = params.errorMessage || `Transfer stock is not available for ${state.product.name || `#${params.productId}`}`;
  const moved = await moveUnassignedToLocation(db, state, qty, params.locationId, params.branchId ?? null, errorCode, errorMessage);
  return {
    globalBefore: state.globalQty,
    globalAfter: state.globalQty,
    sourceBefore: moved.unassignedBefore,
    sourceAfter: moved.unassignedAfter,
    targetBefore: moved.locationBefore,
    targetAfter: moved.locationAfter,
  };
}

export async function relocateStockBetweenLocations(db: Kysely<Database>, params: StockTransferParams): Promise<StockTransferResult> {
  const sent = await beginLocationTransfer(db, {
    productId: params.productId,
    qty: params.qty,
    branchId: params.fromBranchId ?? null,
    locationId: params.fromLocationId,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
  });
  const received = await receiveLocationTransfer(db, {
    productId: params.productId,
    qty: params.qty,
    branchId: params.toBranchId ?? null,
    locationId: params.toLocationId,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
  });
  return {
    globalBefore: sent.globalBefore,
    globalAfter: received.globalAfter,
    sourceBefore: sent.sourceBefore,
    sourceAfter: sent.sourceAfter,
    targetBefore: received.targetBefore,
    targetAfter: received.targetAfter,
  };
}
