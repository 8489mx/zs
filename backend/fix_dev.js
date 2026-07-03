require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    const result1 = await pool.query(`
      TRUNCATE product_location_stock;
      INSERT INTO product_location_stock (product_id, location_id, qty, tenant_id)
      SELECT product_id, location_id, COALESCE(SUM(qty), 0), MAX(tenant_id)
      FROM stock_movements
      WHERE location_id IS NOT NULL
      GROUP BY product_id, location_id;
    `);
    console.log('Fixed stock from movements');

    const result2 = await pool.query(`
      INSERT INTO product_location_stock (product_id, location_id, qty, tenant_id)
      SELECT p.id, COALESCE((SELECT id FROM stock_locations ORDER BY id ASC LIMIT 1), 1), 0, p.tenant_id
      FROM products p
      WHERE NOT EXISTS (
        SELECT 1 FROM product_location_stock pls WHERE pls.product_id = p.id
      )
    `);
    console.log('Inserted missing products into stock:', result2.rowCount);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
