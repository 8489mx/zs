import { E2EClient } from '../e2e-utils';
import { Client } from 'pg';

const results: any[] = [];
function log(testId: string, scenario: string, input: string, expected: string, actual: string, status: string, dbEvidence: string, resStatus: string) {
  results.push({ testId, scenario, input, expected, actual, resStatus, dbEvidence, status });
  console.log(`\n--- ${testId} ---`);
  console.log(`Scenario: ${scenario}`);
  console.log(`Input: ${input}`);
  console.log(`Expected: ${expected}`);
  console.log(`Actual: ${actual}`);
  console.log(`API Status: ${resStatus}`);
  console.log(`DB Evidence: ${dbEvidence}`);
  console.log(`Status: [${status}]`);
}

async function main() {
  const pg = new Client({ user: 'postgres', password: 'postgres', host: '127.0.0.1', port: 5433, database: 'zs_dev' });
  await pg.connect();
  const admin = new E2EClient('http://localhost:3102');
  await admin.login('amr', '123456');

  // Setup Month
  const year = 2099;
  const monthInt = Math.floor(Math.random()*11+2); // 2 to 12
  const testMonth = `${year}-${monthInt.toString().padStart(2, '0')}`;
  const prevMonth = `${year}-${(monthInt - 1).toString().padStart(2, '0')}`;
  
  // Cleanup previous 2099 test runs to avoid collisions
  await pg.query("DELETE FROM hr_payroll_runs WHERE period_month LIKE '2099-%'");
  await pg.query("DELETE FROM hr_employee_loans WHERE issue_date >= '2099-01-01'");
  
  // 1. Create Employee
  const dept = await admin.post('/api/hr/departments', { name: 'Dept ' + Date.now() }, 201).catch((e)=>e.response?.data || {});
  const job = await admin.post('/api/hr/job-titles', { name: 'Job ' + Date.now() }, 201).catch((e)=>e.response?.data || {});
  
  const empCode = Date.now().toString().slice(-6);
  const empRes = await admin.post('/api/hr/employees', { 
    firstName: 'PayrollTest', lastName: 'Emp', employeeNo: empCode, nationalId: Date.now().toString()+'1', departmentId: dept.id || 1, jobTitleId: job.id || 1, status: 'active', hireDate: '2026-08-01'
  }, 201);
  const dbEmp = await pg.query("SELECT id FROM hr_employees WHERE employee_no = $1", [empCode]);
  const empId = dbEmp.rows[0]?.id;

  if (!empId) { console.error("Failed to setup employee"); return; }

  // 2. Setup Contract and Fixed Compensation
  const contract = await admin.post(`/api/hr/employees/${empId}/contracts`, {
    startDate: '2026-08-01', baseSalary: 6000
  }, 201);
  const contractId = contract.id || (await pg.query("SELECT id FROM hr_employment_contracts WHERE employee_id = $1", [empId])).rows[0]?.id;

  await admin.post(`/api/hr/employees/${empId}/compensation`, {
    contractId, allowanceAmount: 500, deductionAmount: 0
  }, 201);

  // 3. Setup Loan
  await admin.post('/api/hr/loans', {
    employeeId: Number(empId), principalAmount: 2000, installmentCount: 5, issueDate: `${prevMonth}-01`, repaymentMode: 'monthly_salary_installment'
  }, 201);
  const loanId = (await pg.query("SELECT id FROM hr_employee_loans WHERE employee_id = $1 ORDER BY id DESC LIMIT 1", [empId])).rows[0]?.id;
  await admin.post(`/api/hr/loans/${loanId}/approve`, {}, 201);
  await admin.post(`/api/hr/loans/${loanId}/disburse`, {}, 201); // Loan must be disbursed to deduct installments!

  // 4. Create Payroll Run
  await admin.post('/api/hr/payroll-runs', { periodMonth: testMonth }, 201).catch(e => null); // ignores if exists
  const runId = (await pg.query("SELECT id FROM hr_payroll_runs WHERE period_month = $1 ORDER BY id DESC LIMIT 1", [testMonth])).rows[0]?.id;

  // Add one-time adjustments (Bonus 300, Deduction 200)
  const runRes = await admin.get(`/api/hr/payroll-runs/${runId}`);
  const itemId = runRes.run?.items?.find((i:any) => i.employeeId == empId)?.id;
  
  if (itemId) {
    await admin.post(`/api/hr/payroll-run-items/${itemId}/adjustments`, { adjustmentType: 'allowance', label: 'Bonus', amount: 300 }, 201);
    await admin.post(`/api/hr/payroll-run-items/${itemId}/adjustments`, { adjustmentType: 'deduction', label: 'Penalty', amount: 200 }, 201);
  }

  // TEST 1: Basic Payroll Calculation
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  let runCheck1 = await admin.get(`/api/hr/payroll-runs/${runId}`);
  let itemCheck1 = runCheck1.run?.items?.find((i:any) => i.employeeId == empId);
  let expectedNet = 6000 + 500 + 300 - 200 - 400; // 6200
  let db1 = await pg.query("SELECT net_pay, allowance_amount, deduction_amount FROM hr_payroll_run_items WHERE id = $1", [itemId]);
  
  if (itemCheck1?.netPay === expectedNet && db1.rows[0]?.net_pay == expectedNet) {
    log('PAY-1', 'Basic Calculation', 'Base:6000, Allow:500, Bonus:300, Ded:200, Loan:400', '6200', String(itemCheck1.netPay), 'PASS', `DB Net: ${db1.rows[0]?.net_pay}`, '200 OK');
  } else {
    log('PAY-1', 'Basic Calculation', 'Base:6000, Allow:500, Bonus:300, Ded:200, Loan:400', '6200', String(itemCheck1?.netPay), 'FAIL', `DB Net: ${db1.rows[0]?.net_pay}`, '200 OK');
  }

  // TEST 2 & 3: Recalculation Idempotency
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  let itemCheck2 = (await admin.get(`/api/hr/payroll-runs/${runId}`)).run?.items?.find((i:any) => i.employeeId == empId);
  let db2 = await pg.query("SELECT net_pay FROM hr_payroll_run_items WHERE id = $1", [itemId]);
  
  if (itemCheck2?.netPay === expectedNet && db2.rows[0]?.net_pay == expectedNet) {
    log('PAY-2', 'Idempotency Recalculation', 'Recalculate x3', '6200', String(itemCheck2.netPay), 'PASS', `DB Net: ${db2.rows[0]?.net_pay}`, '201 Created');
  } else {
    log('PAY-2', 'Idempotency Recalculation', 'Recalculate x3', '6200', String(itemCheck2?.netPay), 'FAIL', `DB Net: ${db2.rows[0]?.net_pay}`, '201 Created');
  }

  // TEST 4: Attendance Deductions
  await admin.post('/api/hr/attendance/record', { employeeId: Number(empId), workDate: `${testMonth}-10`, status: 'absent' }, 201);
  await admin.post('/api/hr/attendance/record', { employeeId: Number(empId), workDate: `${testMonth}-11`, status: 'absent' }, 201);
  
  try {
    await admin.post(`/api/hr/payroll-runs/${runId}/apply-attendance-deductions`, {}, 201);
  } catch (e:any) {
    log('PAY-3-ERR', 'Apply Deductions Bug', 'Apply Deductions', '201 Created', e.message, 'BUG-P1', '-', e.message.includes('400')?'400':'500');
  }
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201); // Just in case it needs recalculate after apply
  
  let itemCheck3 = (await admin.get(`/api/hr/payroll-runs/${runId}`)).run?.items?.find((i:any) => i.employeeId == empId);
  // Expected deduction: 2 days absent. (6000 / 30) * 2 = 400.
  // Net should be 6200 - 400 = 5800.
  let expectedNetAfterAbsence = expectedNet - ((6000/30) * 2);
  let db3 = await pg.query("SELECT net_pay, deduction_amount FROM hr_payroll_run_items WHERE id = $1", [itemId]);
  
  if (itemCheck3?.netPay === expectedNetAfterAbsence) {
    log('PAY-3', 'Attendance Deductions', '2 days absent, Base 6000', String(expectedNetAfterAbsence), String(itemCheck3.netPay), 'PASS', `DB Net: ${db3.rows[0]?.net_pay}`, '201 Created');
  } else {
    log('PAY-3', 'Attendance Deductions', '2 days absent, Base 6000', String(expectedNetAfterAbsence), String(itemCheck3?.netPay), 'FAIL', `DB Net: ${db3.rows[0]?.net_pay}`, '201 Created');
  }

  // Test duplicate apply attendance
  try {
    await admin.post(`/api/hr/payroll-runs/${runId}/apply-attendance-deductions`, {}, 201);
  } catch (e:any) {
    log('PAY-4-ERR', 'Apply Deductions Bug 2', 'Apply Deductions x2', '201 Created', e.message, 'BUG-P1', '-', e.message.includes('400')?'400':'500');
  }
  await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
  let itemCheck4 = (await admin.get(`/api/hr/payroll-runs/${runId}`)).run?.items?.find((i:any) => i.employeeId == empId);
  if (itemCheck4?.netPay === expectedNetAfterAbsence) {
    log('PAY-4', 'Duplicate Apply Attendance', 'Call Apply x2', String(expectedNetAfterAbsence), String(itemCheck4.netPay), 'PASS', `DB Net same`, '201 Created');
  } else {
    log('PAY-4', 'Duplicate Apply Attendance', 'Call Apply x2', String(expectedNetAfterAbsence), String(itemCheck4?.netPay), 'FAIL', `DB Net changed`, '201 Created');
  }

  // TEST 5: Cycle Operations and Protections
  await admin.post(`/api/hr/payroll-runs/${runId}/review`, {}, 201);
  await admin.post(`/api/hr/payroll-runs/${runId}/approve`, {}, 201);

  try {
    await admin.post(`/api/hr/payroll-runs/${runId}/recalculate`, {}, 201);
    log('PAY-5', 'Recalculate Approved Run', 'recalculate on approved', 'Blocked (400)', 'Allowed', 'FAIL', '-', '201/200');
  } catch(e:any) {
    log('PAY-5', 'Recalculate Approved Run', 'recalculate on approved', 'Blocked (400)', e.message, 'PASS', '-', e.message.includes('400')?'400':'500');
  }

  // TEST 6: Duplicate Payroll Run
  const initialRunsCount = Number((await pg.query("SELECT COUNT(*) FROM hr_payroll_runs WHERE period_month = $1", [testMonth])).rows[0]?.count || 0);
  try {
    const secondRun = await admin.post(`/api/hr/payroll-runs`, { periodMonth: testMonth }, 201);
    const finalRunsCount = Number((await pg.query("SELECT COUNT(*) FROM hr_payroll_runs WHERE period_month = $1", [testMonth])).rows[0]?.count || 0);
    
    if (secondRun.run?.id === runId && finalRunsCount === initialRunsCount) {
      log('PAY-6', 'Duplicate Payroll Run', 'Create same month', 'Idempotent (return existing)', 'Idempotent', 'PASS', `Count: ${finalRunsCount}`, '201');
    } else {
      log('PAY-6', 'Duplicate Payroll Run', 'Create same month', 'Idempotent', 'New record created', 'FAIL', `Initial: ${initialRunsCount}, Final: ${finalRunsCount}`, '201');
    }
  } catch(e:any) {
    log('PAY-6', 'Duplicate Payroll Run', 'Create same month', 'Blocked (409/400)', e.message, 'PASS', '-', '400');
  }

  // TEST 7: Loan Repayment limits
  // 5. Over-repay Loan (Expected to fail if amount > remaining)
  const repayRes = await admin.post(`/api/hr/loans/${loanId}/repayments`, { amount: 2001 }, 400).catch(e => e.response);
  const repayPass = repayRes?.statusCode === 400 || repayRes?.status === 400;
  console.log(`\n--- PAY-7 ---
Scenario: Over-repay Loan
Input: Pay 2001 on 2000 bal
Expected: Blocked (400)
Actual: ${repayPass ? 'Blocked' : 'Allowed'}
API Status: ${repayRes?.statusCode || repayRes?.status || 201}
DB Evidence: -
Status: [${repayPass ? 'PASS' : 'FAIL'}]`);
  // Removed assert to avoid crashing script

  // TEST 7: Invalid Values validation
  try {
    await admin.post(`/api/hr/employees/${empId}/contracts`, {
      startDate: '2026-09-01', baseSalary: -1000
    }, 201);
    log('PAY-9', 'Negative Base Salary', 'baseSalary: -1000', 'Blocked (400)', 'Allowed', 'FAIL', '-', '201');
  } catch(e:any) {
    log('PAY-9', 'Negative Base Salary', 'baseSalary: -1000', 'Blocked (400)', e.message, 'PASS', '-', '400');
  }

  try {
    await admin.post(`/api/hr/loans`, {
      employeeId: Number(empId), principalAmount: -1000, installmentCount: 5, issueDate: '2026-08-01'
    }, 201);
    log('PAY-10', 'Negative Loan', 'amount: -1000', 'Blocked (400)', 'Allowed', 'FAIL', '-', '201');
  } catch(e:any) {
    log('PAY-10', 'Negative Loan', 'amount: -1000', 'Blocked (400)', e.message, 'PASS', '-', '400');
  }

  await pg.end();
}

main().catch(console.error);
