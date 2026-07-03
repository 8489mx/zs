require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function run() {
  try {
    const res = await pool.query(`
      WITH RankedLocations AS (
        SELECT 
          pls.product_id,
          pls.location_id,
          ROW_NUMBER() OVER(PARTITION BY pls.product_id ORDER BY pls.qty DESC) as rn
        FROM product_location_stock pls
        JOIN stock_locations sl ON sl.id = pls.location_id
        WHERE pls.qty > 0 AND sl.is_active = true
      )
      UPDATE products p
      SET default_location_id = rl.location_id
      FROM RankedLocations rl
      WHERE p.id = rl.product_id 
        AND p.default_location_id IS NULL
        AND rl.rn = 1
      RETURNING p.id, p.name, rl.location_id;
    `);
    
    console.log(`Updated ${res.rowCount} products with their correct warehouse.`);
    if (res.rowCount > 0) {
      console.log('Sample of updated products:');
      console.table(res.rows.slice(0, 10));
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
