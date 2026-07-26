import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/zsystems' });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

async function seed() {
  try {
    const tenantRes = await db.selectFrom('saas_tenants').select('id').executeTakeFirst();
    const tenantId = tenantRes?.id || 1;

    let emp = await db.selectFrom('hr_employees').where('employee_no', '=', 'H-1').select('id').executeTakeFirst();
    if (!emp) {
      const res = await db.insertInto('hr_employees').values({
        tenant_id: tenantId,
        name: 'موظف تجريبي (أجر بالساعة)',
        employee_no: 'H-1',
        status: 'active',
        hired_at: '2026-06-01',
        work_days: 5,
        daily_hours: 8
      }).returning('id').executeTakeFirst();
      emp = res;
    }

    await db.deleteFrom('hr_compensation_packages').where('employee_id', '=', emp!.id).execute();
    await db.insertInto('hr_compensation_packages').values({
      tenant_id: tenantId,
      employee_id: emp!.id,
      type: 'hourly',
      hourly_rate: 30,
      base_salary: 0,
      housing_allowance: 0,
      transportation_allowance: 0,
      effective_date: '2026-06-01'
    }).execute();

    console.log('Employee H-1 created successfully.');
  } catch (e) {
    console.error('Error seeding employee:', e);
  } finally {
    await pool.end();
  }
}
seed();
