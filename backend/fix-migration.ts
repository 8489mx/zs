import { sql } from 'kysely';
import { db } from './src/database/database';
async function run() {
  await sql`UPDATE kysely_migration SET name = '2030000000001_delivery_representatives' WHERE name = '2030000000000_delivery_representatives'`.execute(db);
  console.log('done');
  process.exit(0);
}
run();
