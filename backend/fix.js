const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
pool.query(`
  INSERT INTO product_location_stock (product_id, location_id, qty, tenant_id)
  SELECT product_id, location_id, SUM(qty_change), MAX(tenant_id)
  FROM stock_movements
  WHERE location_id IS NOT NULL
  GROUP BY product_id, location_id
  ON CONFLICT (product_id, location_id) WHERE location_id IS NOT NULL
  DO UPDATE SET qty = EXCLUDED.qty;
`).then(res => {
  console.log('Fixed stock:', res.rowCount);
  pool.end();
}).catch(e => {
  console.error(e.message);
  pool.end();
});
