import * as dotenv from 'dotenv';
dotenv.config();
import { db } from './src/database/database';
import { sql } from 'kysely';

async function run() {
  const tz = process.env.BUSINESS_TIMEZONE || 'Africa/Cairo';
  const res = await sql`SELECT to_char(NOW() AT TIME ZONE ${tz}, 'YYYY-MM-DD"T"HH24:MI:SS') as t`.execute(db);
  console.log(res.rows);
  process.exit(0);
}
run();
