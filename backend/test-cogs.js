const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.pwbvvsqcnrimcvwavehu',
  password: 'Zz@0101184157',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const tenant_id = '3cd15281-a926-4810-9882-ab6c02cfa038';
  
  const salesQuery = `
    SELECT si.qty, si.cost_price 
    FROM sale_items si 
    INNER JOIN sales s ON s.id = si.sale_id 
    WHERE s.status = 'posted' 
    AND s.tenant_id = $1
  `;
  const salesRes = await pool.query(salesQuery, [tenant_id]);
  const rawCogs = salesRes.rows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0);

  const returnsQuery = `
    SELECT 
      ri.qty,
      COALESCE(si.cost_price, p.cost_price) as cost_price
    FROM return_items ri
    INNER JOIN return_documents rd ON rd.id = ri.return_document_id
    LEFT JOIN sale_items si ON si.sale_id = rd.invoice_id AND si.product_id = ri.product_id
    LEFT JOIN products p ON p.id = ri.product_id
    WHERE rd.return_type = 'sale'
    AND rd.tenant_id = $1
  `;
  const returnsRes = await pool.query(returnsQuery, [tenant_id]);
  const returnedCogs = returnsRes.rows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0);

  console.log({
    salesRows: salesRes.rows.length,
    returnsRows: returnsRes.rows.length,
    rawCogs,
    returnedCogs,
    cogs: Math.max(0, rawCogs - returnedCogs)
  });
  
  process.exit(0);
}

run().catch(console.error);
