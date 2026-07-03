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
  const res = await pool.query(`
    SELECT SUM(qty) as total_qty, COUNT(*) as row_count
    FROM product_location_stock pls
    WHERE pls.location_id = 1 AND pls.product_id IN (
      SELECT id FROM products WHERE default_location_id = 1
    )
  `);
  console.log('Stock in location 1:', res.rows[0]);
  pool.end();
}
run();
