import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { InventoryTransferService } from './src/modules/inventory/services/inventory-transfer.service';
import { Kysely } from 'kysely';
import { KYSELY_DB } from './src/database/database.constants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get<Kysely<any>>(KYSELY_DB);
  const transferService = app.get(InventoryTransferService);

  const pendingTransfers = [91, 89, 88, 87];

  console.log(`Found ${pendingTransfers.length} pending location transfers.`);

  // We need an auth context. Since it's a script, we mock an admin auth context.
  const authContext = {
    userId: 1,
    tenantId: 'karimzakaria-demo',
    accountId: 'karimzakaria-demo', 
    role: 'super_admin',
    permissions: ['admin', 'inventory', 'canAdjustInventory']
  };

  for (const t of pendingTransfers) {
    try {
      console.log(`Receiving transfer TR-${t}...`);
      await transferService.receiveStockTransfer(t, authContext as any);
      console.log(`Received TR-${t}`);
    } catch (e: any) {
      console.error(`Error receiving TR-${t}:`, e.message);
    }
  }

  await app.close();
}

bootstrap();
