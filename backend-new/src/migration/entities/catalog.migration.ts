import { EntityCounters, MigrationContext } from '../types';
import { asBoolean, asNumber, asString, readAll } from '../utils';
import { syncIdSequence } from '../db';

interface OldCategory {
  id: number;
  name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface OldProduct {
  id: number;
  name: string;
  barcode: string | null;
  category_id: number | null;
  supplier_id: number | null;
  price: number;
  cost: number;
  stock: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  min_stock_qty: number;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export async function migrateCategories(ctx: MigrationContext): Promise<EntityCounters> {
  const rows = readAll<OldCategory>(ctx.oldDb, 'SELECT * FROM product_categories ORDER BY id');
  const counters: EntityCounters = { scanned: rows.length, inserted: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      await ctx.newDb
        .insertInto('product_categories')
        .values({
          id: asNumber(row.id),
          name: asString(row.name),
          is_active: asBoolean(row.is_active),
          created_at: asString(row.created_at),
          updated_at: asString(row.updated_at),
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      ctx.idMap.categories.set(asNumber(row.id), asNumber(row.id));
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`category ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'product_categories');
  return counters;
}

export async function migrateProducts(ctx: MigrationContext): Promise<EntityCounters> {
  const rows = readAll<OldProduct>(ctx.oldDb, 'SELECT * FROM products ORDER BY id');
  const counters: EntityCounters = { scanned: rows.length, inserted: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    const mappedCategoryId = row.category_id ? (ctx.idMap.categories.get(asNumber(row.category_id)) ?? null) : null;
    const mappedSupplierId = row.supplier_id ? (ctx.idMap.suppliers.get(asNumber(row.supplier_id)) ?? null) : null;

    try {
      await ctx.newDb
        .insertInto('products')
        .values({
          id: asNumber(row.id),
          name: asString(row.name),
          barcode: row.barcode ? asString(row.barcode) : null,
          category_id: mappedCategoryId,
          supplier_id: mappedSupplierId,
          price: asNumber(row.price),
          cost: asNumber(row.cost),
          stock: asNumber(row.stock),
          cost_price: asNumber(row.cost_price),
          retail_price: asNumber(row.retail_price),
          wholesale_price: asNumber(row.wholesale_price),
          stock_qty: asNumber(row.stock_qty),
          min_stock_qty: asNumber(row.min_stock_qty),
          notes: asString(row.notes),
          is_active: asBoolean(row.is_active),
          created_at: asString(row.created_at),
          updated_at: asString(row.updated_at),
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      ctx.idMap.products.set(asNumber(row.id), asNumber(row.id));
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`product ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'products');
  return counters;
}
