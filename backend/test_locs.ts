import { db } from './src/core/database/database.provider';
async function run() {
  const locs = await db.selectFrom('stock_locations').selectAll().execute();
  console.log(locs);
  process.exit(0);
}
run();
