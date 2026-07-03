require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      TRUNCATE product_location_stock;
      INSERT INTO product_location_stock (product_id, location_id, qty, tenant_id)
      SELECT product_id, location_id, COALESCE(SUM(qty), 0), MAX(tenant_id)
      FROM stock_movements
      WHERE location_id IS NOT NULL
      GROUP BY product_id, location_id;
    `);
    console.log('Fixed stock');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
