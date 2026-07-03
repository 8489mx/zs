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
    const locs = await pool.query(`SELECT id, name, is_active FROM stock_locations ORDER BY id`);
    console.log('--- ALL LOCATIONS ---');
    console.table(locs.rows);

    const prods = await pool.query(`
      SELECT p.id, p.name, p.default_location_id, sl.name as loc_name, sl.is_active as loc_is_active
      FROM products p
      LEFT JOIN stock_locations sl ON sl.id = p.default_location_id
      WHERE sl.id IS NULL OR sl.is_active = false
      LIMIT 10
    `);
    console.log('--- PRODUCTS WITH MISSING/INACTIVE LOCATIONS ---');
    console.table(prods.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
