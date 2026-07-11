import { db } from './src/database/database.client';
async function check() {
  const p = await db.selectFrom('products').select(['id', 'name']).where('name', 'like', '%شامبو سيف هير حبه البركه%').executeTakeFirst();
  if (!p) return console.log('not found');
  console.log('Product:', p);
  const stock = await db.selectFrom('inventory_ledgers').select(['location_id', db.fn.sum('qty').as('total_qty')]).where('product_id', '=', p.id).groupBy('location_id').execute();
  console.log('Stock:', stock);
  process.exit(0);
}
check();
