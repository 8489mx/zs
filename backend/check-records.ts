import { db } from './src/database/db-client';
async function run() {
  const products = await db.selectFrom('products').select(['name', 'default_location_id', 'item_kind', 'is_active']).execute();
  const locs = await db.selectFrom('stock_locations').select(['id', 'name', 'location_type']).execute();
  console.log(JSON.stringify({products: products.filter(p => p.name.includes('شامبو')), locs}, null, 2));
  process.exit(0);
}
run();
