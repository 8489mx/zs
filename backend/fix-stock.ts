import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KYSELY_DB } from './src/database/database.constants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(KYSELY_DB);

  // Find products that have stock_qty = 11 or roughly 11.
  const products = await db.selectFrom('products').select(['id', 'name', 'stock_qty', 'tenant_id']).execute();
  
  for (const p of products) {
    if (Math.abs(Number(p.stock_qty) - 11) < 0.1 || p.name.includes('سندوتش')) {
      console.log(`Product: ${p.name} (ID: ${p.id}), Stock: ${p.stock_qty}`);
    }
  }

  console.log('Done.');
  await app.close();
}

bootstrap().catch(console.error);
