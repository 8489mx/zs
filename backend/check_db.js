const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'zs_dev',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

pool.query("SELECT id, employee_no, tenant_id FROM hr_employees")
  .then(res => {
    console.log(res.rows);
  })
  .catch(console.error)
  .finally(() => pool.end());
