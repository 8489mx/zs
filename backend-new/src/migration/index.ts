import 'dotenv/config';
import { openLegacyDb, openNewDb } from './db';
import { migrateCategories, migrateProducts } from './entities/catalog.migration';
import { migrateStockMovements, migrateBranchesAndLocations } from './entities/inventory.migration';
import { migrateCustomers, migrateSuppliers, migrateUsers } from './entities/parties.migration';
import {
  migrateLedgers,
  migratePayments,
  migratePurchases,
  migrateSales,
  migrateTreasury,
} from './entities/transactions.migration';
import { EntityCounters, MigrationContext } from './types';
import { createLogger, initIdMap } from './utils';

function printCounters(name: string, counters: EntityCounters): void {
  process.stdout.write(
    `[migration] ${name}: scanned=${counters.scanned} inserted=${counters.inserted} skipped=${counters.skipped} errors=${counters.errors}\n`,
  );
}

async function run(): Promise<void> {
  const logger = createLogger();
  const oldDb = openLegacyDb();
  const newDb = openNewDb();

  const ctx: MigrationContext = {
    oldDb,
    newDb,
    idMap: initIdMap(),
    logger,
  };

  logger.info('phase 5 migration started');

  const steps: Array<[string, (context: MigrationContext) => Promise<EntityCounters>]> = [
    ['users', migrateUsers],
    ['categories', migrateCategories],
    ['customers', migrateCustomers],
    ['suppliers', migrateSuppliers],
    ['products', migrateProducts],
    ['inventory:branches-locations', migrateBranchesAndLocations],
    ['inventory:stock-movements', migrateStockMovements],
    ['sales', migrateSales],
    ['purchases', migratePurchases],
    ['payments', migratePayments],
    ['ledger', migrateLedgers],
    ['treasury', migrateTreasury],
  ];

  try {
    for (const [name, step] of steps) {
      logger.info(`migrating ${name}...`);
      const counters = await step(ctx);
      printCounters(name, counters);
      if (counters.errors > 0) {
        logger.warn(`${name} finished with ${counters.errors} errors`);
      }
    }

    logger.info('phase 5 migration completed');
  } finally {
    oldDb.close();
    await newDb.destroy();
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`[migration][fatal] ${String(error)}\n`);
  process.exit(1);
});
