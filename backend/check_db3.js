const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'zs_dev',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'hr_employees'")
  .then(res => {
    console.log(res.rows);
  })
  .catch(console.error)
  .finally(() => pool.end());
