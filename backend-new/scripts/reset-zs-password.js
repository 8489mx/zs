require('dotenv').config();
const { Pool } = require('pg');
const { createHash, randomBytes } = require('node:crypto');

function hashPassword(password, salt) {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

async function main() {
  const username = 'ZS';
  const password = 'infoadmin';
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const permissions = JSON.stringify([
    'dashboard',
    'products',
    'sales',
    'purchases',
    'inventory',
    'suppliers',
    'customers',
    'accounts',
    'returns',
    'reports',
    'audit',
    'treasury',
    'services',
    'settings',
    'cashDrawer',
    'canPrint',
    'canDiscount',
    'canEditPrice',
    'canViewProfit',
    'canDelete',
    'canEditInvoices',
    'canAdjustInventory',
    'canManageSettings',
    'canManageUsers',
    'canEditUsers',
    'canManageBackups'
  ]);

  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: String(process.env.DATABASE_SSL || 'false') === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (existing.rows.length) {
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             password_salt = $2,
             role = 'super_admin',
             is_active = true,
             permissions_json = $3,
             branch_ids_json = '[]',
             default_branch_id = NULL,
             display_name = 'حساب الطوارئ الرئيسي',
             failed_login_count = 0,
             locked_until = NULL,
             must_change_password = false
         WHERE username = $4`,
        [passwordHash, salt, permissions, username]
      );
      console.log('[OK] reset existing ZS user');
    } else {
      await client.query(
        `INSERT INTO users
         (username, password_hash, password_salt, role, is_active, permissions_json, branch_ids_json, default_branch_id, display_name, failed_login_count, locked_until, last_login_at, must_change_password)
         VALUES
         ($1, $2, $3, 'super_admin', true, $4, '[]', NULL, 'حساب الطوارئ الرئيسي', 0, NULL, NULL, false)`,
        [username, passwordHash, salt, permissions]
      );
      console.log('[OK] created ZS user');
    }

    await client.query('COMMIT');
    console.log('[DONE] ZS / infoadmin is ready');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR]', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
