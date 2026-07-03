require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // We will find the difference between products.stock_qty and SUM(product_location_stock.qty)
    // and add the difference to the default location for that product.
    const productsRes = await pool.query(`
      SELECT p.id, p.stock_qty, p.default_location_id, p.tenant_id,
             COALESCE((SELECT SUM(qty) FROM product_location_stock pls WHERE pls.product_id = p.id), 0) as current_sum
      FROM products p
    `);

    let updatedCount = 0;
    for (const row of productsRes.rows) {
      const stockQty = parseFloat(row.stock_qty || 0);
      const currentSum = parseFloat(row.current_sum || 0);
      const diff = stockQty - currentSum;

      if (Math.abs(diff) > 0.001) {
        // Find a location to add the diff to
        const targetLocationId = row.default_location_id || 1; // fallback to 1

        // check if row exists for this target location
        const existRes = await pool.query(
          'SELECT id, qty FROM product_location_stock WHERE product_id = $1 AND location_id = $2',
          [row.id, targetLocationId]
        );

        if (existRes.rows.length > 0) {
          await pool.query(
            'UPDATE product_location_stock SET qty = qty + $1 WHERE id = $2',
            [diff, existRes.rows[0].id]
          );
        } else {
          await pool.query(
            'INSERT INTO product_location_stock (product_id, location_id, qty, tenant_id) VALUES ($1, $2, $3, $4)',
            [row.id, targetLocationId, diff, row.tenant_id]
          );
        }
        updatedCount++;
      }
    }
    console.log('Fixed stock differences for products:', updatedCount);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
