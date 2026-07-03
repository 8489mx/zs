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
  const res = await pool.query('SELECT count(*) FROM products WHERE default_location_id != 1');
  console.log("Products with default_location_id != 1:", res.rows[0].count);
  pool.end();
}
run();
