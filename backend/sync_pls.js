require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function run() {
  try {
    // We update product_location_stock to match default_location_id for the products we just updated
    // Wait, apply_updates.sql only updated default_location_id. We can use default_location_id to fix product_location_stock!
    const res = await pool.query(`
      UPDATE product_location_stock pls
      SET location_id = p.default_location_id
      FROM products p
      WHERE pls.product_id = p.id
        AND pls.location_id = 1
        AND p.default_location_id != 1
    `);
    console.log('Updated product_location_stock successfully. Rows affected:', res.rowCount);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
