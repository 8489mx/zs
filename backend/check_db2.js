const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'zs_dev',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

pool.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'hr_employees'::regclass")
  .then(res => {
    console.log(res.rows);
  })
  .catch(console.error)
  .finally(() => pool.end());
