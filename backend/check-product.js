const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5433, database: 'zs_dev', user: 'postgres', password: 'postgres' });
async function check() {
  const locs = await pool.query(`SELECT location_id, qty FROM product_location_stock WHERE product_id = 467`);
  console.log('Locations:', locs.rows);
  const movs = await pool.query(`SELECT movement_type, qty, location_id, created_at, note FROM stock_movements WHERE product_id = 467 ORDER BY created_at ASC`);
  console.log('Movements:');
  movs.rows.forEach(r => console.log(r));
  pool.end();
}
check();
