const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres.pwbvvsqcnrimcvwavehu:Zz%400101184157@aws-1-eu-central-1.pooler.supabase.com:5432/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
  try {
    const res = await pool.query(`
      SELECT 
          t.relname as table_name, 
          i.relname as index_name, 
          a.attname as column_name
      FROM 
          pg_class t, 
          pg_class i, 
          pg_index ix, 
          pg_attribute a
      WHERE 
          t.oid = ix.indrelid 
          AND i.oid = ix.indexrelid 
          AND a.attrelid = t.oid 
          AND a.attnum = ANY(ix.indkey) 
          AND t.relkind = 'r' 
          AND ix.indisunique = true
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY 
          t.relname, i.relname;
    `);
    
    const indexes = {};
    for (const row of res.rows) {
      if (!indexes[row.index_name]) {
        indexes[row.index_name] = { table: row.table_name, columns: [] };
      }
      indexes[row.index_name].columns.push(row.column_name);
    }
    
    for (const [idxName, info] of Object.entries(indexes)) {
      if (!info.columns.includes('tenant_id') && info.table !== 'migrations' && info.table !== 'offline_releases' && info.columns[0] !== 'id' && info.columns.length < 3) {
        console.log(`Global Unique Index found: ${idxName} on ${info.table}(${info.columns.join(', ')})`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
