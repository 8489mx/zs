const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres.pwbvvsqcnrimcvwavehu:Zz@0101184157@aws-0-eu-central-1.pooler.supabase.com:6543/postgres' // Note: typical supabase is aws-0 or aws-1, let's just make it a local script to run via kysely.
});
