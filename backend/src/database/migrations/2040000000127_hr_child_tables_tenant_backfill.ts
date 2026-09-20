import { sql, type Kysely } from 'kysely';

// O2 / F18. `hr_attendance_exceptions` received `tenant_id`/`account_id` in the
// bulk scoping migration 20260527000400 as `TEXT NOT NULL DEFAULT ''`, but the
// only writer of the table — hr.service.ts:refreshAttendanceExceptionForEmployeeDate
// — never listed those columns in its INSERT. Every auto-generated attendance
// exception was therefore stored with tenant_id = '', which silently broke the
// one reader that filters on the column directly:
//
//     decideAttendanceException:
//       SELECT * FROM hr_attendance_exceptions WHERE id = ? AND tenant_id = ?
//
// That lookup could never match, so approving a `pending` exception always
// returned HR_ATTENDANCE_EXCEPTION_NOT_FOUND. `late_check_out` is one of those
// pending types, and payroll only counts overtime minutes whose exception row
// reached status = 'approved' (hr.service.ts ~line 1800) — so approved overtime
// could never reach a payroll run.
//
// The service now writes both columns. This migration repairs the rows already
// on disk by deriving the scope from the owning employee, so historical
// exceptions become visible to the decision path instead of staying orphaned.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    const exists = await sql<{ exists: boolean }>`
      select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'hr_attendance_exceptions'
      ) as exists
    `.execute(db);

    if (!exists.rows[0]?.exists) return;

    // hr_employees.id is a global identity, so the employee row is the
    // authoritative scope for each exception; nothing here crosses a tenant.
    await sql`
      UPDATE hr_attendance_exceptions ex
      SET tenant_id = e.tenant_id
      FROM hr_employees e
      WHERE e.id = ex.employee_id
        AND ex.tenant_id = ''
        AND e.tenant_id <> ''
    `.execute(db);

    await sql`
      UPDATE hr_attendance_exceptions ex
      SET account_id = e.account_id
      FROM hr_employees e
      WHERE e.id = ex.employee_id
        AND ex.account_id = ''
        AND e.account_id <> ''
    `.execute(db);

    // Keeps the repaired scope queryable for the per-employee/date rebuild path.
    await sql`
      CREATE INDEX IF NOT EXISTS idx_hr_attendance_exceptions_tenant_employee_date
      ON hr_attendance_exceptions (tenant_id, employee_id, work_date)
    `.execute(db);

    // Same F18 omission in two more HR child tables found during the same sweep:
    //
    //  - hr_employee_loan_installments: createLoan/updateLoan inserted the schedule
    //    without a scope (a third writer, the EOS settlement path, always did).
    //  - hr_payroll_item_adjustments: createPayrollAdjustment inserted without one.
    //
    // Nothing read these through tenant_id until the item 1 portal hardening added
    // `.where('tenant_id', '=', tenantId)` to the employee-portal payslip query —
    // at which point manual payroll adjustments stopped appearing on payslips.
    // Both are repaired from their parent row, which is authoritative.
    await sql`
      UPDATE hr_employee_loan_installments i
      SET tenant_id = l.tenant_id, account_id = l.account_id
      FROM hr_employee_loans l
      WHERE l.id = i.loan_id
        AND i.tenant_id = ''
        AND l.tenant_id <> ''
    `.execute(db);

    await sql`
      UPDATE hr_payroll_item_adjustments a
      SET tenant_id = it.tenant_id, account_id = it.account_id
      FROM hr_payroll_run_items it
      WHERE it.id = a.payroll_item_id
        AND a.tenant_id = ''
        AND it.tenant_id <> ''
    `.execute(db);

    // Two more writers in hr.service.ts omitted the scope, each disabling a gate
    // that filters on tenant_id:
    //
    //  - hr_leave_requests (createLeaveRequest, the HR-admin path — the portal
    //    writer was fixed in the item 1 sweep): approve/reject/cancel all resolve
    //    `WHERE id = ? AND tenant_id = ?`, so an admin-created request could never
    //    leave 'pending', and approved leave days feed the payroll run.
    //
    //  - hr_employee_assets (upsertEmployeeAsset): the end-of-service custody
    //    clearance gate counts unreturned assets `WHERE employee_id = ? AND
    //    tenant_id = ?`, so it always saw zero and never blocked — a final
    //    settlement could be posted in full to an employee still holding custody.
    //
    // Both are repaired from the owning employee row.
    await sql`
      UPDATE hr_leave_requests r
      SET tenant_id = e.tenant_id, account_id = e.account_id
      FROM hr_employees e
      WHERE e.id = r.employee_id
        AND r.tenant_id = ''
        AND e.tenant_id <> ''
    `.execute(db);

    await sql`
      UPDATE hr_employee_assets a
      SET tenant_id = e.tenant_id, account_id = e.account_id
      FROM hr_employees e
      WHERE e.id = a.employee_id
        AND a.tenant_id = ''
        AND e.tenant_id <> ''
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_hr_attendance_exceptions_tenant_employee_date`.execute(db);
    // The backfilled scope is not reverted: restoring tenant_id = '' would
    // re-break the decision path for rows that are now correct.
  },
};
