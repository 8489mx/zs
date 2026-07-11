const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.pwbvvsqcnrimcvwavehu',
  password: 'Zz@0101184157',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const p = await pool.query("SELECT id, name FROM products WHERE name LIKE '%شامبو سيف هير حبه البركه%' LIMIT 1");
  if (p.rows.length === 0) return console.log('not found');
  console.log('Product:', p.rows[0]);
  const stock = await pool.query("SELECT location_id, SUM(qty) as total_qty FROM inventory_ledgers WHERE product_id = $1 GROUP BY location_id", [p.rows[0].id]);
  console.log('Stock:', stock.rows);
  process.exit(0);
}
check();
