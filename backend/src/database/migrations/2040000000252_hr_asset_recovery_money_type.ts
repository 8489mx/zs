import { Kysely, sql } from 'kysely';

/**
 * Correct only legacy HR lost/damaged-custody monetary deductions entered as
 * amount_type='amount'. The payroll engine recognizes 'money', 'days', 'hours'.
 *
 * Never rewrite linked adjustments in APPROVED/PAID payroll snapshots.
 * Their records need an explicit accountant-led audit and corrective journal.
 * No amount, status, source id or GL record is changed by this migration.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    UPDATE hr_employee_adjustments a
    SET amount_type = 'money'
    WHERE a.source_type = 'hr_employee_asset'
      AND a.accounting_category = 'asset_recovery'
      AND a.amount_type = 'amount'
      AND (
        a.applied_in_run_id IS NULL
        OR EXISTS (
          SELECT 1 FROM hr_payroll_runs r
          WHERE r.id = a.applied_in_run_id AND r.tenant_id = a.tenant_id
            AND r.status IN ('draft', 'reviewed', 'cancelled')
        )
      )
  `.execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Non-reversible normalization of invalid legacy monetary metadata. Never
  // recreate the invalid 'amount' code, even on rollback.
}

export const migration = { up, down };
export default migration;
