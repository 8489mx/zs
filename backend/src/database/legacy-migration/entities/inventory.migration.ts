import { EntityCounters, MigrationContext } from '../types';
import { asBoolean, asNumber, asString, readAll } from '../utils';
import { syncIdSequence } from '../db';

interface OldBranch {
  id: number;
  name: string;
  code: string;
  is_active: number;
}

interface OldLocation {
  id: number;
  name: string;
  code: string;
  branch_id: number | null;
  is_active: number;
}

interface OldStockMovement {
  id: number;
  product_id: number | null;
  movement_type: string;
  qty: number;
  before_qty: number;
  after_qty: number;
  reason: string;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  created_by: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_at: string;
}

export async function migrateBranchesAndLocations(ctx: MigrationContext): Promise<EntityCounters> {
  const branchRows = readAll<OldBranch>(ctx.oldDb, 'SELECT * FROM branches ORDER BY id');
  const locationRows = readAll<OldLocation>(ctx.oldDb, 'SELECT * FROM stock_locations ORDER BY id');
  const counters: EntityCounters = {
    scanned: branchRows.length + locationRows.length,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of branchRows) {
    try {
      await ctx.newDb
        .insertInto('branches')
        .values({
          id: asNumber(row.id),
          name: asString(row.name),
          code: asString(row.code),
          is_active: asBoolean(row.is_active),
        })
        .onConflict((oc: any) => oc.column('id').doNothing())
        .execute();
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`branch ${row.id} failed: ${String(error)}`);
    }
  }

  for (const row of locationRows) {
    try {
      await ctx.newDb
        .insertInto('stock_locations')
        .values({
          id: asNumber(row.id),
          name: asString(row.name),
          code: asString(row.code),
          branch_id: row.branch_id ? asNumber(row.branch_id) : null,
          is_active: asBoolean(row.is_active),
        })
        .onConflict((oc: any) => oc.column('id').doNothing())
        .execute();
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`location ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'branches');
  await syncIdSequence(ctx.newDb, 'stock_locations');
  return counters;
}

export async function migrateStockMovements(ctx: MigrationContext): Promise<EntityCounters> {
  const rows = readAll<OldStockMovement>(ctx.oldDb, 'SELECT * FROM stock_movements ORDER BY id');
  const counters: EntityCounters = { scanned: rows.length, inserted: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      const mappedProductId = row.product_id ? ctx.idMap.products.get(asNumber(row.product_id)) : null;
      if (row.product_id && !mappedProductId) {
        counters.skipped += 1;
        ctx.logger.warn(`stock_movement ${row.id} skipped (missing product ${row.product_id})`);
        continue;
      }

      await ctx.newDb
        .insertInto('stock_movements')
        .values({
          id: asNumber(row.id),
          product_id: mappedProductId ?? null,
          movement_type: asString(row.movement_type),
          qty: asNumber(row.qty),
          before_qty: asNumber(row.before_qty),
          after_qty: asNumber(row.after_qty),
          reason: asString(row.reason),
          note: asString(row.note),
          reference_type: row.reference_type ? asString(row.reference_type) : null,
          reference_id: row.reference_id ? asNumber(row.reference_id) : null,
          created_by: row.created_by ? (ctx.idMap.users.get(asNumber(row.created_by)) ?? null) : null,
          branch_id: row.branch_id ? asNumber(row.branch_id) : null,
          location_id: row.location_id ? asNumber(row.location_id) : null,
          created_at: asString(row.created_at),
        })
        .onConflict((oc: any) => oc.column('id').doNothing())
        .execute();

      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`stock_movement ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'stock_movements');
  return counters;
}
