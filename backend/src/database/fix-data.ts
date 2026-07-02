import { Kysely, sql } from 'kysely';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: 'postgres://postgres.pwbvvsqcnrimcvwavehu:Zz@0101184157@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await pool.query(`UPDATE hr_employees SET tenant_id = 'karimzakaria-demo', account_id = 'karimzakaria-demo' WHERE tenant_id = ''`);
  await pool.query(`UPDATE hr_departments SET tenant_id = 'karimzakaria-demo', account_id = 'karimzakaria-demo' WHERE tenant_id = ''`);
  await pool.query(`UPDATE hr_job_titles SET tenant_id = 'karimzakaria-demo', account_id = 'karimzakaria-demo' WHERE tenant_id = ''`);
  await pool.query(`UPDATE hr_positions SET tenant_id = 'karimzakaria-demo', account_id = 'karimzakaria-demo' WHERE tenant_id = ''`);
  console.log('Fixed orphaned data.');
  pool.end();
}

run().catch(console.error);
