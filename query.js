const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/zn' });
pool.query(`SELECT m.id, m.product_id, m.movement_type, m.qty, m.before_qty, m.after_qty, m.reason, m.created_at, p.name FROM stock_movements m JOIN products p ON p.id = m.product_id WHERE p.name LIKE '%جمبري%' ORDER BY m.created_at DESC LIMIT 20`)
  .then(res => { console.table(res.rows); pool.end(); })
  .catch(console.error);
