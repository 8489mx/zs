require('dotenv').config({ path: '.env' });
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
    const stock = await pool.query(`
      SELECT pls.product_id, p.name as product_name, p.default_location_id, pls.location_id, sl.name as loc_name, pls.qty
      FROM product_location_stock pls
      JOIN products p ON p.id = pls.product_id
      JOIN stock_locations sl ON sl.id = pls.location_id
      WHERE p.default_location_id IS NULL OR p.default_location_id = 1
      ORDER BY pls.product_id
      LIMIT 20
    `);
    console.table(stock.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
