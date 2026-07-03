require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function run() {
  try {
    const sql = fs.readFileSync('c:\\zn\\backend\\apply_updates.sql', 'utf8');
    const res = await pool.query(sql);
    console.log('Updates applied successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
