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
  const res1 = await pool.query('SELECT count(*) FROM products p JOIN product_location_stock pls ON p.id = pls.product_id WHERE p.default_location_id != 1 AND pls.location_id = 1');
  console.log("Remaining mismatch in pls:", res1.rows[0].count);

  const res2 = await pool.query('SELECT count(*) FROM products p LEFT JOIN product_location_stock pls ON p.id = pls.product_id WHERE pls.id IS NULL AND p.default_location_id != 1');
  console.log("Products with default_location != 1 but no stock record:", res2.rows[0].count);
  pool.end();
}
run();
