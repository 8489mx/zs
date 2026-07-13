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

type TenantStockScope = {
  tenantId?: string | null;
  accountId?: string | null;
};

type StockScopeParams = TenantStockScope & {
  productId: number;
  branchId?: number | null;
  locationId?: number | null;
};

type StockDeltaParams = StockScopeParams & {
  delta: number;
  errorCode?: string;
  errorMessage?: string;
  allowNegative?: boolean;
  skipGlobalUpdate?: boolean;
};

type StockSetParams = StockScopeParams & {
  nextQty: number;
  errorCode?: string;
  errorMessage?: string;
};

type StockTransferParams = TenantStockScope & {
  productId: number;
  qty: number;
  fromBranchId?: number | null;
  fromLocationId: number;
  toBranchId?: number | null;
  toLocationId: number;
  errorCode?: string;
  errorMessage?: string;
};

type StockTransitParams = TenantStockScope & {
  productId: number;
  qty: number;
  branchId?: number | null;
  locationId: number | null;
  errorCode?: string;
  errorMessage?: string;
};

type RequiredTenantStockScope = {
  tenantId: string;
  accountId: string;
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
  scope: RequiredTenantStockScope;
  product: LockedProductRow;
  globalQty: number;
  balances: StockBalanceRow[];
};

function roundStockQty(value: number | string | null | undefined): number {
  return Number((Number(value || 0) + Number.EPSILON).toFixed(3));
}

function requireStockTenantScope(params: TenantStockScope): RequiredTenantStockScope {
  const tenantId = String(params.tenantId || '').trim();
  const accountId = String(params.accountId || '').trim();
  if (!tenantId || !accountId) {
    throw new AppError('Tenant/account scope is required for stock ledger operations', 'TENANT_SCOPE_REQUIRED', 403);
  }
  return { tenantId, accountId };
}

async function loadLockedState(db: Kysely<Database>, params: TenantStockScope & { productId: number }): Promise<LockedState> {
  const scope = requireStockTenantScope(params);
  const product = await db
    .selectFrom('products')
    .select(['id', 'name', 'stock_qty'])
    .where('id', '=', params.productId)
    .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
    .forUpdate()
    .executeTakeFirst();
  if (!product) throw new AppError('Product not found or access denied', 'PRODUCT_NOT_FOUND', 404);
  const balances = await db
    .selectFrom('product_location_stock')
    .select(['id', 'product_id', 'branch_id', 'location_id', 'qty'])
    .where('product_id', '=', product.id)
    .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
    .forUpdate()
    .execute();
  return { 
    scope, 
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
  scope: RequiredTenantStockScope,
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
      tenant_id: scope.tenantId,
      account_id: scope.accountId,
    } as any)
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
  const existing = state.balances.find((row) => row.location_id == null && row.branch_id == null);
  const currentSum = roundStockQty(state.balances.reduce((sum, row) => sum + Number(row.qty || 0), 0));
  const discrepancy = roundStockQty(state.globalQty - currentSum);

  if (existing) {
    if (discrepancy > 0.001) {
      const nextQty = roundStockQty(Number(existing.qty || 0) + discrepancy);
      await db
        .updateTable('product_location_stock')
        .set({ qty: nextQty, updated_at: sql`NOW()` })
        .where('id', '=', existing.id)
        .where(sql<boolean>`tenant_id = ${state.scope.tenantId}`)
        .execute();
      existing.qty = nextQty;
    }
    return existing;
  }

  const seedQty = discrepancy > 0.001 ? discrepancy : 0;
  const inserted = await insertBalanceRow(db, state.scope, state.product.id, null, null, seedQty);
  state.balances.push(inserted);
  return inserted;
}

async function ensureLocationBalance(
  db: Kysely<Database>,
  state: LockedState,
  locationId: number | null,
  branchId: number | null,
): Promise<StockBalanceRow> {
  const searchLocationId = locationId == null ? null : Number(locationId);
  const searchBranchId = branchId == null ? null : Number(branchId);

  let existing: typeof state.balances[0] | undefined;

  if (searchLocationId !== null) {
    existing = state.balances.find((row) => 
      (row.location_id == null ? null : Number(row.location_id)) === searchLocationId && 
      (row.branch_id == null ? null : Number(row.branch_id)) === searchBranchId
    );
  } else if (searchBranchId !== null) {
    existing = state.balances.find((row) => 
      (row.branch_id == null ? null : Number(row.branch_id)) === searchBranchId && 
      row.location_id == null
    );
  }

  if (existing) {
    if (branchId != null && existing.branch_id == null) {
      await db
        .updateTable('product_location_stock')
        .set({ branch_id: branchId, updated_at: sql`NOW()` })
        .where('id', '=', existing.id)
        .where(sql<boolean>`tenant_id = ${state.scope.tenantId}`)
        .execute();
      existing.branch_id = branchId;
    }
    return existing;
  }
  const inserted = await insertBalanceRow(db, state.scope, state.product.id, branchId, locationId, 0);
  state.balances.push(inserted);
  return inserted;
}

async function updateBalanceQty(
  db: Kysely<Database>,
  scope: RequiredTenantStockScope,
  row: StockBalanceRow,
  nextQty: number,
  branchId?: number | null,
): Promise<void> {
  const payload: Record<string, unknown> = { qty: roundStockQty(nextQty), updated_at: sql`NOW()` };
  if (branchId !== undefined && branchId !== row.branch_id) {
    payload.branch_id = branchId;
    row.branch_id = branchId ?? null;
  }
  await db
    .updateTable('product_location_stock')
    .set(payload)
    .where('id', '=', row.id)
    .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
    .execute();
  row.qty = roundStockQty(nextQty);
}

async function updateGlobalQty(db: Kysely<Database>, scope: RequiredTenantStockScope, productId: number, nextQty: number): Promise<void> {
  await db
    .updateTable('products')
    .set({ stock_qty: roundStockQty(nextQty), updated_at: sql`NOW()` })
    .where('id', '=', productId)
    .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
    .execute();
}

export async function previewConsumableStockQty(db: Kysely<Database>, params: StockScopeParams): Promise<number> {
  const state = await loadLockedState(db, params);
  if (!params.locationId) return state.globalQty;
  const unassigned = await ensureUnassignedBalance(db, state);
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  return roundStockQty(Number(location.qty || 0) + Number(unassigned.qty || 0));
}

export async function previewAssignedLocationStockQty(db: Kysely<Database>, params: StockScopeParams): Promise<number> {
  const state = await loadLockedState(db, params);
  if (!params.locationId) return state.globalQty;
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  return roundStockQty(location.qty);
}

export async function applyStockDelta(db: Kysely<Database>, params: StockDeltaParams): Promise<StockDeltaResult> {
  const delta = roundStockQty(params.delta);
  const state = await loadLockedState(db, params);
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
    
    const trueGlobalQty = roundStockQty(state.balances.reduce((sum, row) => sum + Number(row.qty), 0));
    const correctedGlobalAfter = roundStockQty(trueGlobalQty + delta);
    
    await updateBalanceQty(db, state.scope, unassigned, scopeAfter, null);
    if (!params.skipGlobalUpdate) await updateGlobalQty(db, state.scope, params.productId, correctedGlobalAfter);
    return { globalBefore, globalAfter: params.skipGlobalUpdate ? globalBefore : correctedGlobalAfter, scopeBefore, scopeAfter };
  }

  const unassigned = await ensureUnassignedBalance(db, state);
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  let locationBefore = roundStockQty(location.qty);

  if (unassigned && roundStockQty(unassigned.qty) > 0.001) {
    const unassignedBefore = roundStockQty(unassigned.qty);
    const provisionedLocationQty = roundStockQty(locationBefore + unassignedBefore);
    await updateBalanceQty(db, state.scope, unassigned, 0, null);
    await updateBalanceQty(db, state.scope, location, provisionedLocationQty, params.branchId ?? null);
    locationBefore = provisionedLocationQty;
  }

  const scopeAfter = roundStockQty(locationBefore + delta);
  if (!params.allowNegative) ensureNonNegativeStock(scopeAfter, errorCode, errorMessage);
  
  const trueGlobalQty = roundStockQty(state.balances.reduce((sum, row) => sum + Number(row.qty), 0));
  const correctedGlobalAfter = roundStockQty(trueGlobalQty + delta);
  
  await updateBalanceQty(db, state.scope, location, scopeAfter, params.branchId ?? null);
  if (!params.skipGlobalUpdate) await updateGlobalQty(db, state.scope, params.productId, correctedGlobalAfter);
  return { globalBefore, globalAfter: params.skipGlobalUpdate ? globalBefore : correctedGlobalAfter, scopeBefore: locationBefore, scopeAfter };
}

export async function setScopedStockQty(db: Kysely<Database>, params: StockSetParams): Promise<StockDeltaResult> {
  const nextQty = roundStockQty(params.nextQty);
  const state = await loadLockedState(db, params);
  const errorCode = params.errorCode || 'INSUFFICIENT_STOCK';
  const errorMessage = params.errorMessage || `Invalid stock quantity for ${state.product.name || `#${params.productId}`}`;

  ensureNonNegativeStock(nextQty, errorCode, errorMessage);

  if (!params.locationId) {
    const unassigned = await ensureUnassignedBalance(db, state);
    const scopeBefore = roundStockQty(unassigned.qty);
    const delta = roundStockQty(nextQty - scopeBefore);
    
    const trueGlobalQty = roundStockQty(state.balances.reduce((sum, row) => sum + Number(row.qty), 0));
    const globalBefore = state.globalQty;
    const globalAfter = roundStockQty(trueGlobalQty + delta);

    if (delta === 0 && globalBefore === globalAfter) {
      return { globalBefore, globalAfter, scopeBefore, scopeAfter: nextQty };
    }
    
    ensureNonNegativeStock(globalAfter, errorCode, errorMessage);
    
    if (delta !== 0) {
      await updateBalanceQty(db, state.scope, unassigned, nextQty, null);
    }
    if (delta !== 0 || globalBefore !== globalAfter) {
      await updateGlobalQty(db, state.scope, params.productId, globalAfter);
    }
    return { globalBefore, globalAfter, scopeBefore, scopeAfter: nextQty };
  }

  const unassigned = await ensureUnassignedBalance(db, state);
  const location = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  let scopeBefore = roundStockQty(location.qty);

  if (unassigned && roundStockQty(unassigned.qty) > 0.001) {
    const unassignedBefore = roundStockQty(unassigned.qty);
    const provisionedLocationQty = roundStockQty(scopeBefore + unassignedBefore);
    await updateBalanceQty(db, state.scope, unassigned, 0, null);
    await updateBalanceQty(db, state.scope, location, provisionedLocationQty, params.branchId ?? null);
    scopeBefore = provisionedLocationQty;
  }

  const delta = roundStockQty(nextQty - scopeBefore);
  
  const trueGlobalQty = roundStockQty(state.balances.reduce((sum, row) => sum + Number(row.qty), 0));
  const globalBefore = state.globalQty;
  const globalAfter = roundStockQty(trueGlobalQty + delta);

  if (delta === 0 && globalBefore === globalAfter) {
    return { globalBefore, globalAfter, scopeBefore, scopeAfter: nextQty };
  }

  ensureNonNegativeStock(globalAfter, errorCode, errorMessage);
  
  if (delta !== 0) {
    await updateBalanceQty(db, state.scope, location, nextQty, params.branchId ?? null);
  }
  if (delta !== 0 || globalBefore !== globalAfter) {
    await updateGlobalQty(db, state.scope, params.productId, globalAfter);
  }
  return { globalBefore, globalAfter, scopeBefore, scopeAfter: nextQty };
}

async function moveUnassignedToLocation(
  db: Kysely<Database>,
  state: LockedState,
  qty: number,
  locationId: number | null,
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
  await updateBalanceQty(db, state.scope, unassigned, unassignedAfter, null);
  await updateBalanceQty(db, state.scope, location, locationAfter, branchId);
  return { unassignedBefore, unassignedAfter, locationBefore, locationAfter };
}

export async function beginLocationTransfer(db: Kysely<Database>, params: StockTransitParams): Promise<StockTransferResult> {
  const qty = roundStockQty(params.qty);
  const state = await loadLockedState(db, params);
  const errorCode = params.errorCode || 'INSUFFICIENT_LOCATION_STOCK';
  const errorMessage = params.errorMessage || `Insufficient stock at source location for ${state.product.name || `#${params.productId}`}`;
  const source = await ensureLocationBalance(db, state, params.locationId, params.branchId ?? null);
  const unassigned = await ensureUnassignedBalance(db, state);
  const sourceBefore = roundStockQty(source.qty);
  const sourceAfter = roundStockQty(sourceBefore - qty);
  ensureNonNegativeStock(sourceAfter, errorCode, errorMessage);
  const targetBefore = roundStockQty(unassigned.qty);
  const targetAfter = roundStockQty(targetBefore + qty);
  await updateBalanceQty(db, state.scope, source, sourceAfter, params.branchId ?? null);
  await updateBalanceQty(db, state.scope, unassigned, targetAfter, null);
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
  const state = await loadLockedState(db, params);
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
  const state = await loadLockedState(db, params);
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
    tenantId: params.tenantId,
    accountId: params.accountId,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
  });
  const received = await receiveLocationTransfer(db, {
    productId: params.productId,
    qty: params.qty,
    branchId: params.toBranchId ?? null,
    locationId: params.toLocationId,
    tenantId: params.tenantId,
    accountId: params.accountId,
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
