const { sql } = require('kysely');
const { db } = require('./dist/database/kysely');
async function run() {
  try {
    const result = await sql`
      INSERT INTO product_location_stock (product_id, location_id, qty, tenant_id)
      SELECT product_id, location_id, SUM(qty_change), MAX(tenant_id)
      FROM stock_movements
      WHERE location_id IS NOT NULL
      GROUP BY product_id, location_id
      ON CONFLICT (product_id, location_id) WHERE location_id IS NOT NULL
      DO UPDATE SET qty = EXCLUDED.qty
    `.execute(db);
    console.log('Fixed stock successfully.', result);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}
run();
