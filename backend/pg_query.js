const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`SELECT e.employee_no, e.scheduled_check_in_time, e.scheduled_check_out_time, a.work_date, a.check_in_at, a.check_out_at, x.exception_type, x.duration_minutes FROM hr_attendance_records a JOIN hr_employees e ON e.id = a.employee_id LEFT JOIN hr_attendance_exceptions x ON x.attendance_record_id = a.id ORDER BY a.id DESC LIMIT 10`);
  console.log(res.rows);
  await client.end();
}
run();
