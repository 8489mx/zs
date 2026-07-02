import { Kysely, sql } from 'kysely';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: 'postgres://postgres.pwbvvsqcnrimcvwavehu:Zz@0101184157@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
});

const db = new Kysely<any>({
  dialect: {
    createAdapter: () => ({}),
    createDriver: () => ({}),
    createIntrospector: () => ({}),
    createQueryCompiler: () => ({}) as any
  } as any // Mock just to use sql template
});

async function run() {
  const res = await pool.query(`
    SELECT id, tenant_id, employee_no 
    FROM hr_employees 
    ORDER BY id DESC 
    LIMIT 20
  `);
  console.log('Employees:', res.rows);
  pool.end();
}

run().catch(console.error);
