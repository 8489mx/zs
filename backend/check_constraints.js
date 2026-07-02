const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/zn' });
pool.query("SELECT conname FROM pg_constraint WHERE conrelid = 'hr_employees'::regclass")
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
