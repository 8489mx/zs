const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:5433/zs_dev' });
pool.query(`SELECT id, name, stock_qty FROM products WHERE name LIKE '%جمبري%'`)
  .then(res => { console.table(res.rows); pool.end(); })
  .catch(console.error);
