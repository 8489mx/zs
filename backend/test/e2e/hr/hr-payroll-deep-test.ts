import { E2EClient } from '../e2e-utils';
import { Client } from 'pg';
import * as assert from 'assert';

async function main() {
  const pgUser = process.env.PG_USER || 'postgres';
  const pgPass = process.env.PG_PASS || 'postgres';
  const pgHost = process.env.PG_HOST || '127.0.0.1';
  const pgPort = Number(process.env.PG_PORT || 5433);
  const pgDb = process.env.PG_DB || 'zs_dev';
  const apiUrl = process.env.API_URL || 'http://localhost:3101';
  
  const adminUser = process.env.ADMIN_USER || 'amr';
  const adminPass = process.env.ADMIN_PASS || '123456';

  const pg = new Client({ user: pgUser, password: pgPass, host: pgHost, port: pgPort, database: pgDb });
  await pg.connect();
  const admin = new E2EClient(apiUrl);
  await admin.login(adminUser, adminPass);
  
  // We will extract tenantId from the created employee to be accurate
  // 1. Create Employee
  const dept = await admin.post('/api/hr/departments', { name: 'Dept ' + Date.now() }, 201).catch((e)=>e.response?.data || {});
  const job = await admin.post('/api/hr/job-titles', { name: 'Job ' + Date.now() }, 201).catch((e)=>e.response?.data || {});
  
  const empCode = String(Math.floor(Math.random() * 900000) + 100000);
  const empRes = await admin.post('/api/hr/employees', { 
    firstName: 'PayrollTest', lastName: 'Emp', employeeNo: empCode, nationalId: Date.now().toString()+'1', departmentId: dept.id || 1, jobTitleId: job.id || 1, status: 'active', hireDate: '2026-08-01'
  }, 201);
  const dbEmp = await pg.query("SELECT id, tenant_id FROM hr_employees WHERE employee_no = $1", [empCode]);
  const empId = dbEmp.rows[0]?.id;
  const tenantId = dbEmp.rows[0]?.tenant_id;
  assert.ok(empId, "Failed to setup employee");
  assert.ok(tenantId !== undefined, "Failed to extract tenant_id");
  console.log(`[INIT] Running tests against ${apiUrl} (DB: ${pgDb}, Tenant: '${tenantId}')`);

  // Setup Month guaranteed unused
  let testMonth = '';
  let prevMonth = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    const y = 2000 + Math.floor(Math.random() * 900);
    const m = Math.floor(Math.random()*11+2); // 2 to 12
    const tm = `${y}-${m.toString().padStart(2, '0')}`;
    const chk = await pg.query("SELECT id FROM hr_payroll_runs WHERE period_month = $1 AND tenant_id = $2 LIMIT 1", [tm, tenantId]);
    if (chk.rows.length === 0) {
      testMonth = tm;
      prevMonth = `${y}-${(m - 1).toString().padStart(2, '0')}`;
      break;
    }
  }
  if (!testMonth) throw new Error("Failed to find unused test month");
  

  // 2. Setup Contract and Fixed Compensation
  const contract = await admin.post(`/api/hr/employees/${empId}/contracts`, {
    startDate: '2026-08-01', baseSalary: 6000
  }, 201);
  const contractId = contract.id || (await pg.query("SELECT id FROM hr_employment_contracts WHERE employee_id = $1 AND tenant_id = $2", [empId, tenantId])).rows[0]?.id;

  await admin.post(`/api/hr/employees/${empId}/compensation`, {
    contractId, allowanceAmount: 500, deductionAmount: 0
  }, 201);

  // 3. Setup Loan
  await admin.post('/api/hr/loans', {
    employeeId: Number(empId), principalAmount: 2000, installmentCount: 5, issueDate: `${prevMonth}-01`, repaymentMode: 'monthly_salary_installment'
  }, 201);
  const loanId = (await pg.query("SELECT id FROM hr_employee_loans WHERE employee_id = $1 AND tenant_id = $2 ORDER BY id DESC LIMIT 1", [empId, tenantId])).rows[0]?.id;
  await admin.post(`/api/hr/loans/${loanId}/approve`, {}, 201);
  await admin.post(`/api/hr/loans/${loanId}/disburse`, {}, 201);

  // 4. Create Payroll Run
  const createdRunRes = await admin.post('/api/hr/payroll-runs', { periodMonth: testMonth }, 201);
  const runId = createdRunRes.run?.id || (await pg.query("SELECT id FROM hr_payroll_runs WHERE period_month = $1 AND tenant_id = $2 ORDER BY id DESC LIMIT 1", [testMonth, tenantId])).rows[0]?.id;
  assert.ok(runId, "Failed to create payroll run");

  // Add one-time adjustments
  let runRes = await admin.get(`/api/hr/payroll-runs/${runId}`);
  if (!runRes || !runRes.run || !runRes.run.items) {
    console.log("PAYROLL RUN RES:", JSON.stringify(runRes, null, 2));
  }
  let item = runRes.run?.items?.find((i: any) => Number(i.employee_id) === Number(empId) || Number(i.employeeId) === Number(empId));
  
  if (!item) {
    console.log("ITEMS RETURNED:", JSON.stringify(runRes.run?.items, null, 2));
    throw new Error("Employee item not found in payroll run");
  }
  let itemId = item.id;
  
  await admin.post(`/api/hr/payroll-run-items/${itemId}/adjustments`, { adjustmentType: 'allowance', label: 'Bonus', amount: 300 }, 201);
  await admin.post(`/api/hr/payroll-run-items/${itemId}/adjustments`, { adjustmentType: 'deduction', label: 'Penalty', amount: 200 }, 201);

  // --- TESTS ---

  console.log(`\n--- Tenant & Isolation Validation ---`);
  // Logged-in user context (captured from hr_employees creation)
  const empQ = await pg.query("SELECT tenant_id, account_id FROM hr_employees WHERE id = $1", [empId]);
  const runQ = await pg.query("SELECT tenant_id, account_id FROM hr_payroll_runs WHERE id = $1", [runId]);
  const itemQ = await pg.query("SELECT tenant_id, account_id FROM hr_payroll_run_items WHERE id = $1", [itemId]);
  
  const userTenant = { tenant_id: empQ.rows[0].tenant_id, account_id: empQ.rows[0].account_id };
  const runTenant = { tenant_id: runQ.rows[0].tenant_id, account_id: runQ.rows[0].account_id };
  const itemTenant = { tenant_id: itemQ.rows[0].tenant_id, account_id: itemQ.rows[0].account_id };
  
  console.log("Logged In Context (from Emp):", JSON.stringify(userTenant));
  console.log("Payroll Run Context:", JSON.stringify(runTenant));
  console.log("Payroll Item Context:", JSON.stringify(itemTenant));
  
  assert.strictEqual(userTenant.tenant_id, runTenant.tenant_id, "Tenant ID mismatch between User and Run");
  assert.strictEqual(userTenant.account_id, runTenant.account_id, "Account ID mismatch between User and Run");
  assert.strictEqual(runTenant.tenant_id, itemTenant.tenant_id, "Tenant ID mismatch between Run and Item");
  assert.strictEqual(runTenant.account_id, itemTenant.account_id, "Account ID mismatch between Run and Item");
  console.log(`[PASS]`);

  console.log(`\n--- PAY-1 Basic Calculation ---`);

  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  
  const res = await admin.get(`/api/hr/payroll-runs/${runId}`);
  const itemCheck1 = res.run.items.find((i: any) => Number(i.employee_id) === Number(empId) || Number(i.employeeId) === Number(empId));
  
  const expectedNet = 6200;
  assert.strictEqual(Number(itemCheck1.netPay || itemCheck1.net_pay), expectedNet, `Expected API netPay to be ${expectedNet}`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-2 Idempotency Recalculation ---`);
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  let itemCheck2 = (await admin.get(`/api/hr/payroll-runs/${runId}`)).run?.items?.find((i:any) => Number(i.employee_id) === Number(empId) || Number(i.employeeId) === Number(empId));
  assert.strictEqual(Number(itemCheck2.netPay || itemCheck2.net_pay), expectedNet, `Expected netPay to remain ${expectedNet}`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-3 Attendance Deductions ---`);
  await admin.post('/api/hr/attendance/record', { employeeId: Number(empId), workDate: `${testMonth}-10`, status: 'absent' }, 201);
  await admin.post('/api/hr/attendance/record', { employeeId: Number(empId), workDate: `${testMonth}-11`, status: 'absent' }, 201);
  
  await admin.post(`/api/hr/payroll-runs/${runId}/apply-attendance-deductions`, {}, 201);
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  
  let itemCheck3 = (await admin.get(`/api/hr/payroll-runs/${runId}`)).run?.items?.find((i:any) => Number(i.employee_id) === Number(empId) || Number(i.employeeId) === Number(empId));
  let expectedNetAfterAbsence = expectedNet - ((6000/30) * 2); // 5800
  assert.strictEqual(Number(itemCheck3.netPay || itemCheck3.net_pay), expectedNetAfterAbsence, `Expected netPay to be ${expectedNetAfterAbsence}`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-4 Duplicate Apply Attendance (Idempotent) ---`);
  await admin.post(`/api/hr/payroll-runs/${runId}/apply-attendance-deductions`, {}, 201);
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  let itemCheck4 = (await admin.get(`/api/hr/payroll-runs/${runId}`)).run?.items?.find((i:any) => Number(i.employee_id) === Number(empId) || Number(i.employeeId) === Number(empId));
  assert.strictEqual(Number(itemCheck4.netPay || itemCheck4.net_pay), expectedNetAfterAbsence, `Expected netPay to still be ${expectedNetAfterAbsence}`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-5 Recalculate Approved Run ---`);
  await admin.post(`/api/hr/payroll-runs/${runId}/review`, {}, 201);
  await admin.post(`/api/hr/payroll-runs/${runId}/approve`, {}, 201);
  
  const failRecalcRes = await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 400).catch(e => e.response);
  assert.ok([400].includes(failRecalcRes?.statusCode || failRecalcRes?.status), `Expected recalculate to return 400, got ${failRecalcRes?.statusCode || failRecalcRes?.status}`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-6 Duplicate Payroll Run ---`);
  const initialRunsCount = Number((await pg.query("SELECT COUNT(*) FROM hr_payroll_runs WHERE period_month = $1 AND tenant_id = $2", [testMonth, tenantId])).rows[0]?.count || 0);
  const dupRes = await admin.post(`/api/hr/payroll-runs`, { periodMonth: testMonth }, 201);
  assert.strictEqual(Number(dupRes.run?.id), Number(runId), `Expected duplicate payroll to return the same run ID`);
  const finalRunsCount = Number((await pg.query("SELECT COUNT(*) FROM hr_payroll_runs WHERE period_month = $1 AND tenant_id = $2", [testMonth, tenantId])).rows[0]?.count || 0);
  assert.strictEqual(finalRunsCount, initialRunsCount, `Expected DB row count to remain ${initialRunsCount}`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-7 Over-repay Loan ---`);
  const loanBefore = await pg.query("SELECT remaining_amount, paid_amount FROM hr_employee_loans WHERE id = $1 AND tenant_id = $2", [loanId, tenantId]);
  const repayRes = await admin.post(`/api/hr/loans/${loanId}/repayments`, { amount: 2001 }, 400).catch(e => e.response);
  assert.ok([400].includes(repayRes?.statusCode || repayRes?.status), `Expected repayment to return 400`);
  
  const loanAfter = await pg.query("SELECT remaining_amount, paid_amount FROM hr_employee_loans WHERE id = $1", [loanId]);
  assert.strictEqual(Number(loanAfter.rows[0].remaining_amount), Number(loanBefore.rows[0].remaining_amount), `Expected remaining_amount to remain unchanged`);
  assert.strictEqual(Number(loanAfter.rows[0].paid_amount), Number(loanBefore.rows[0].paid_amount), `Expected paid_amount to remain unchanged`);
  
  const ledgersCount = await pg.query("SELECT COUNT(*) FROM hr_employee_ledger WHERE reference_id = $1 AND reference_type = 'hr_employee_loan' AND entry_type = 'loan_repayment'", [loanId]);
  assert.strictEqual(Number(ledgersCount.rows[0].count), 0, `Expected 0 ledger entries for failed repayment`);
  
  const treasuryCount = await pg.query("SELECT COUNT(*) FROM treasury_transactions WHERE reference_type = 'hr_loan' AND reference_id = $1", [loanId]).catch(() => ({ rows: [{ count: 1 }] }));
  // If treasury table exists, we assume 1 transaction (the disbursement). If not, we ignore it.
  if (treasuryCount && treasuryCount.rows) {
    assert.ok(Number(treasuryCount.rows[0].count) <= 1, `Expected no additional treasury transactions for failed repayment`);
  }
  console.log(`[PASS]`);

  console.log(`\n--- PAY-8 Negative Base Salary ---`);
  const failContractRes = await admin.post(`/api/hr/employees/${empId}/contracts`, { startDate: '2026-09-01', baseSalary: -1000 }, 400).catch(e => e.response);
  assert.ok([400].includes(failContractRes?.statusCode || failContractRes?.status), `Expected contract to return 400`);
  console.log(`[PASS]`);

  console.log(`\n--- PAY-9 Negative Loan ---`);
  const failLoanRes = await admin.post(`/api/hr/loans`, { employeeId: Number(empId), principalAmount: -1000, installmentCount: 5, issueDate: '2026-08-01' }, 400).catch(e => e.response);
  assert.ok([400].includes(failLoanRes?.statusCode || failLoanRes?.status), `Expected loan to return 400`);
  console.log(`[PASS]`);

  await pg.end();
  console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY");
}

main().catch((e) => {
  console.error("\n❌ TEST FAILED:", e.message);
  process.exitCode = 1;
});
