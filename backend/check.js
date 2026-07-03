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
  const res = await pool.query("SELECT COUNT(*) FROM products WHERE default_location_id IS NULL");
  console.log('Products without default_location_id:', res.rows[0].count);
  
  const res2 = await pool.query("SELECT COUNT(*) FROM products WHERE default_location_id NOT IN (SELECT id FROM stock_locations)");
  console.log('Products with invalid default_location_id:', res2.rows[0].count);

  pool.end();
}
run();
