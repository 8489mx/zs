const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5433, database: 'zs_dev', user: 'postgres', password: 'postgres' });
pool.query("SELECT table_type FROM information_schema.tables WHERE table_name = 'hr_attendance_exceptions'").then(res => { console.log(res.rows); pool.end(); });
