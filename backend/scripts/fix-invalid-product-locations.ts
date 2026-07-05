import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'zs_dev',
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const query = `
      UPDATE products
      SET default_location_id = (
        SELECT id FROM stock_locations 
        WHERE tenant_id = products.tenant_id AND is_active = true 
        ORDER BY id ASC LIMIT 1
      )
      WHERE default_location_id IS NOT NULL 
        AND default_location_id NOT IN (
          SELECT id FROM stock_locations WHERE tenant_id = products.tenant_id AND is_active = true
        );
    `;

    const result = await client.query(query);
    console.log(`Successfully updated ${result.rowCount} products with invalid or inactive default_location_id.`);
  } catch (err) {
    console.error('Error executing update:', err);
  } finally {
    await client.end();
  }
}

run();
