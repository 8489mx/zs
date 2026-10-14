import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE delivery_representatives
    ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS van_rep_financial_settlements (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR NOT NULL,
      account_id VARCHAR NOT NULL,
      rep_id INTEGER NOT NULL REFERENCES delivery_representatives(id) ON DELETE CASCADE,
      trip_id INTEGER REFERENCES van_sales_trips(id) ON DELETE SET NULL,
      entry_type VARCHAR NOT NULL,
      amount NUMERIC(14, 2) NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'pending',
      settled_at TIMESTAMPTZ,
      settled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      settlement_method VARCHAR,
      notes TEXT,
      receipt_voucher_no VARCHAR,
      payroll_run_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_van_rep_fin_settlements_rep_status 
      ON van_rep_financial_settlements (tenant_id, rep_id, status);

    CREATE INDEX IF NOT EXISTS idx_van_rep_fin_settlements_trip 
      ON van_rep_financial_settlements (tenant_id, trip_id);

    -- Backfill existing settled trips with cash shortages
    INSERT INTO van_rep_financial_settlements (
      tenant_id, account_id, rep_id, trip_id, entry_type, amount, status, notes, created_at, updated_at
    )
    SELECT 
      tenant_id,
      account_id,
      rep_id,
      id AS trip_id,
      'cash_shortage',
      ABS(variance) AS amount,
      'pending',
      'عجز كاش تصفية رحلة #' || id,
      COALESCE(closed_at, created_at),
      NOW()
    FROM van_sales_trips
    WHERE status = 'settled' AND variance < -0.01
    AND NOT EXISTS (
      SELECT 1 FROM van_rep_financial_settlements vfs 
      WHERE vfs.trip_id = van_sales_trips.id AND vfs.entry_type = 'cash_shortage'
    );

    -- Backfill existing settled trips with stock shortages
    INSERT INTO van_rep_financial_settlements (
      tenant_id, account_id, rep_id, trip_id, entry_type, amount, status, notes, created_at, updated_at
    )
    SELECT 
      tenant_id,
      account_id,
      rep_id,
      id AS trip_id,
      'stock_shortage',
      stock_variance_amount AS amount,
      'pending',
      'عجز جرد بضاعة رحلة #' || id,
      COALESCE(closed_at, created_at),
      NOW()
    FROM van_sales_trips
    WHERE status = 'settled' AND stock_variance_amount > 0.01
    AND NOT EXISTS (
      SELECT 1 FROM van_rep_financial_settlements vfs 
      WHERE vfs.trip_id = van_sales_trips.id AND vfs.entry_type = 'stock_shortage'
    );
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS van_rep_financial_settlements;
    ALTER TABLE delivery_representatives DROP COLUMN IF EXISTS employee_id;
  `.execute(db);
}
