import assert from 'node:assert/strict';
import { EmployeePortalService } from '../../src/modules/hr/employee-portal.service';
import { advanceDueDate, buildAdvanceSchedule } from '../../src/modules/hr/engines/loan-due-date.engine';

async function main(): Promise<void> {
  assert.equal(advanceDueDate('2026-01-31', 1), '2026-02-28');
  assert.equal(advanceDueDate('2026-01-31', 2), '2026-03-31');
  assert.deepEqual(buildAdvanceSchedule(100, 3, '2026-01-31').map((row) =>
    [row.dueDate, row.amount]), [
    ['2026-02-28', 33.33], ['2026-03-31', 33.33], ['2026-04-30', 33.34],
  ]);
  const installments: any[] = [];
  const updates: any[] = [];
  let transactionCount = 0;
  const db: any = {
    transaction: () => ({ execute: async (work: (trx: any) => Promise<unknown>) => {
      transactionCount += 1;
      return work(db);
    } }),
    insertInto: (table: string) => ({ values: (row: any) => ({
      returningAll: () => ({ executeTakeFirstOrThrow: async () => ({ ...row, id: 42 }) }),
      execute: async () => { if (table === 'hr_employee_loan_installments') installments.push(row); },
    }) }),
    updateTable: () => ({ set: (values: any) => ({ where: () => ({ where: () => ({
      execute: async () => { updates.push(values); },
    }) }) }) }),
  };
  const service = new EmployeePortalService(db);
  for (const body of [
    { amount: Infinity, reason: 'test', repaymentMonths: 1 },
    { amount: 100, reason: 'test', repaymentMonths: 1.5 },
    { amount: 0.01, reason: 'test', repaymentMonths: 120 },
  ]) {
    await assert.rejects(() => service.requestAdvance(7, 'tenant-a', 'tenant-a', body));
  }
  assert.equal(transactionCount, 0, 'invalid advances must fail before any database write');

  const result = await service.requestAdvance(7, 'tenant-a', 'tenant-a',
    { amount: 100, reason: 'advance', repaymentMonths: 3 });
  assert.equal(transactionCount, 1);
  assert.equal(installments.length, 3);
  assert.deepEqual(installments.map((row) => row.amount), [33.33, 33.33, 33.34]);
  assert.equal(installments.reduce((sum, row) => sum + Math.round(row.amount * 100), 0), 10000);
  assert.ok(installments.every((row) => row.tenant_id === 'tenant-a' && row.loan_id === 42 && row.due_date));
  assert.match(updates[0].loan_no, /^LOAN-/);
  assert.equal((result.advance as any).loan_no, updates[0].loan_no);
  console.log('HR portal advance schedule and amount safeguards passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
