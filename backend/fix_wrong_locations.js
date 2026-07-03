require('dotenv').config({ path: '.env.development' });
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
      WITH MovementStock AS (
        SELECT product_id, location_id, SUM(qty) as total_qty
        FROM stock_movements
        GROUP BY product_id, location_id
        HAVING SUM(qty) > 0
      ),
      RankedLocations AS (
        SELECT product_id, location_id, total_qty,
               ROW_NUMBER() OVER(PARTITION BY product_id ORDER BY total_qty DESC) as rn
        FROM MovementStock
      )
      SELECT p.id as product_id, p.name, p.default_location_id, rl.location_id as true_location_id
      FROM products p
      JOIN RankedLocations rl ON p.id = rl.product_id AND rl.rn = 1
      WHERE p.default_location_id = 1 AND rl.location_id != 1
    `);
    
    console.log(`Found ${res.rowCount} products where default_location_id is 1 but movements say they are in another warehouse.`);
    if (res.rowCount > 0) {
      console.table(res.rows.slice(0, 10));
      
      // Update them!
      const updateRes = await pool.query(`
        WITH MovementStock AS (
          SELECT product_id, location_id, SUM(qty) as total_qty
          FROM stock_movements
          GROUP BY product_id, location_id
          HAVING SUM(qty) > 0
        ),
        RankedLocations AS (
          SELECT product_id, location_id, total_qty,
                 ROW_NUMBER() OVER(PARTITION BY product_id ORDER BY total_qty DESC) as rn
          FROM MovementStock
        )
        UPDATE products p
        SET default_location_id = rl.location_id
        FROM RankedLocations rl
        WHERE p.id = rl.product_id 
          AND p.default_location_id = 1 
          AND rl.location_id != 1
          AND rl.rn = 1
      `);
      console.log(`Updated ${updateRes.rowCount} products in the products table!`);
      
      // ALSO update product_location_stock to move the stock from 1 to the true location!
      const updateStockRes = await pool.query(`
        WITH MovementStock AS (
          SELECT product_id, location_id, SUM(qty) as total_qty
          FROM stock_movements
          GROUP BY product_id, location_id
          HAVING SUM(qty) > 0
        ),
        RankedLocations AS (
          SELECT product_id, location_id, total_qty,
                 ROW_NUMBER() OVER(PARTITION BY product_id ORDER BY total_qty DESC) as rn
          FROM MovementStock
        )
        UPDATE product_location_stock pls
        SET location_id = rl.location_id
        FROM RankedLocations rl
        WHERE pls.product_id = rl.product_id
          AND pls.location_id = 1
          AND rl.location_id != 1
          AND rl.rn = 1
      `);
      console.log(`Updated ${updateStockRes.rowCount} records in product_location_stock!`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
