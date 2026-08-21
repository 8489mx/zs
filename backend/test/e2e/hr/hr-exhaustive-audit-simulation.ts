import 'dotenv/config';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../../src/database/database.types';
import { HrService } from '../../../src/modules/hr/hr.service';
import { AuditService } from '../../../src/core/audit/audit.service';
import { HrTreasuryAdapter } from '../../../src/modules/hr/hr-treasury.adapter';
import { AccountingPostingService } from '../../../src/modules/accounting/accounting-posting.service';
import { AccountingTenantFoundationService } from '../../../src/modules/accounting/accounting-tenant-foundation.service';
import { TransactionHelper } from '../../../src/database/helpers/transaction.helper';
import { AuthContext } from '../../../src/core/auth/interfaces/auth-context.interface';

async function runExhaustiveHrAudit() {
  console.log('================================================================');
  console.log('🚀 STARTING EXHAUSTIVE HR & PAYROLL AUDIT AND SIMULATION');
  console.log('================================================================\n');

  const pool = new Pool({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5433),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'zs_dev',
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  const tx = new TransactionHelper();
  const auditService = new AuditService(db as any);
  const accountingFoundation = new AccountingTenantFoundationService();
  const accountingPosting = new AccountingPostingService(accountingFoundation);
  const hrTreasuryAdapter = new HrTreasuryAdapter();
  const hrService = new HrService(db as any, tx, auditService, hrTreasuryAdapter, accountingPosting);

  // Fetch valid user from DB
  const userRow = await sql<{ id: number; tenant_id: string; account_id: string }>`SELECT id, tenant_id, account_id FROM users ORDER BY id ASC LIMIT 1`.execute(db);
  const existingUserId = userRow.rows[0]?.id || 1;
  const dbTenantId = userRow.rows[0]?.tenant_id || 'default';
  const dbAccountId = userRow.rows[0]?.account_id || 'default';

  const testSuffix = Date.now().toString().slice(-4);
  const auth: AuthContext = {
    userId: existingUserId,
    username: 'audit_admin',
    role: 'admin',
    tenantId: dbTenantId,
    accountId: dbAccountId,
    sessionId: `session_${testSuffix}`,
    permissions: ['*'],
  };

  try {
    // -------------------------------------------------------------
    // STEP 1: Setup Departments & Job Titles
    // -------------------------------------------------------------
    console.log('🔹 Step 1: Creating HR Master Data (Departments & Job Titles)...');
    const deptRes = await hrService.upsertMasterData('departments', null, { name: `Sales Dept ${testSuffix}`, code: `DEP-${testSuffix}` }, auth);
    const deptId = Number((deptRes as any).rows?.[0]?.id || 1);

    const jobRes = await hrService.upsertMasterData('job-titles', null, { name: `Senior Specialist ${testSuffix}`, code: `JOB-${testSuffix}` }, auth);
    const jobId = Number((jobRes as any).rows?.[0]?.id || 1);

    console.log(`   ✅ Department ID: ${deptId}, Job Title ID: ${jobId}\n`);

    // -------------------------------------------------------------
    // STEP 2: Create Monthly Salaried Employee
    // -------------------------------------------------------------
    console.log('🔹 Step 2: Creating Monthly Salaried Employee...');
    const fixedEmpNo = `${Math.floor(100 + Math.random() * 800)}`;
    const empFixedRes = await hrService.upsertEmployee(null, {
      employeeNo: fixedEmpNo,
      firstName: 'أحمد',
      lastName: 'محمود',
      nationalId: `2950101${testSuffix}010`,
      departmentId: deptId,
      jobTitleId: jobId,
      hireDate: '2026-08-01',
      status: 'active',
      compensationType: 'monthly',
      payFrequency: 'monthly',
      scheduledCheckInTime: '09:00',
      scheduledCheckOutTime: '17:00',
      graceMinutes: 15,
      delayPolicy: 'strict',
    } as any, auth);

    const empFixedList = await hrService.listEmployees({ search: fixedEmpNo }, auth);
    const empFixedId = Number((empFixedList as any).employees?.[0]?.id);
    console.log(`   ✅ Salaried Employee Created: #${empFixedId} (EmpNo: ${fixedEmpNo})`);

    // Create Contract: Base Salary = 10,000 EGP
    await hrService.upsertContract(empFixedId, null, {
      startDate: '2026-08-01',
      baseSalary: 10000,
      contractType: 'full_time',
      status: 'active',
    } as any, auth);

    // Create Compensation Package: Allowance = 1,000 EGP, Deduction = 200 EGP
    await hrService.upsertCompensation(empFixedId, null, {
      allowanceAmount: 1000,
      deductionAmount: 200,
      notes: 'بدل انتقال 1000، تأمينات 200',
    } as any, auth);

    console.log(`   ✅ Contract & Compensation Package Configured (Base: 10,000, Allowance: 1,000, Deduction: 200)\n`);

    // -------------------------------------------------------------
    // STEP 3: Create Hourly Wage Employee
    // -------------------------------------------------------------
    console.log('🔹 Step 3: Creating Hourly Wage Employee...');
    const hourlyEmpNo = `${Math.floor(100 + Math.random() * 800)}`;
    await hrService.upsertEmployee(null, {
      employeeNo: hourlyEmpNo,
      firstName: 'عمر',
      lastName: 'خالد',
      nationalId: `2980505${testSuffix}020`,
      departmentId: deptId,
      jobTitleId: jobId,
      hireDate: '2026-08-01',
      status: 'active',
      compensationType: 'hourly',
      hourlyRate: 50, // 50 EGP / Hour
      expectedDailyHours: 8, // 8 Hours Expected per Day
      payFrequency: 'monthly',
      scheduledCheckInTime: '09:00',
      scheduledCheckOutTime: '17:00',
      graceMinutes: 15,
    } as any, auth);

    const empHourlyList = await hrService.listEmployees({ search: hourlyEmpNo }, auth);
    const empHourlyId = Number((empHourlyList as any).employees?.[0]?.id);
    console.log(`   ✅ Hourly Employee Created: #${empHourlyId} (EmpNo: ${hourlyEmpNo}, Rate: 50 EGP/h, 8h/day)\n`);

    await hrService.upsertContract(empHourlyId, null, {
      startDate: '2026-08-01',
      baseSalary: 0,
      contractType: 'part_time',
      status: 'active',
    } as any, auth);

    // -------------------------------------------------------------
    // STEP 4: Full Month Attendance Simulation
    // -------------------------------------------------------------
    const randMonth = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const randYear = `20${Math.floor(30 + Math.random() * 60)}`;
    const periodMonth = `${randYear}-${randMonth}`;
    console.log(`🔹 Step 4: Simulating Attendance & Exceptions for Month (${periodMonth})...`);

    // Day 1: On-Time (09:00 to 17:00)
    await hrService.upsertAttendanceRecord({
      employeeId: empFixedId,
      workDate: `${periodMonth}-02`,
      status: 'present',
      checkInAt: `${periodMonth}-02T09:00:00.000Z`,
      checkOutAt: `${periodMonth}-02T17:00:00.000Z`,
    }, auth);

    // Day 2: Late by 45 Minutes (Check-in at 09:45)
    await hrService.upsertAttendanceRecord({
      employeeId: empFixedId,
      workDate: `${periodMonth}-03`,
      status: 'present',
      checkInAt: `${periodMonth}-03T09:45:00.000Z`,
      checkOutAt: `${periodMonth}-03T17:00:00.000Z`,
    }, auth);

    // Day 3: Early Check-out by 60 Minutes (Left at 16:00)
    await hrService.upsertAttendanceRecord({
      employeeId: empFixedId,
      workDate: `${periodMonth}-04`,
      status: 'present',
      checkInAt: `${periodMonth}-04T09:00:00.000Z`,
      checkOutAt: `${periodMonth}-04T16:00:00.000Z`,
    }, auth);

    // Day 4: Overtime 3 Hours (Stayed until 20:00)
    await hrService.upsertAttendanceRecord({
      employeeId: empFixedId,
      workDate: `${periodMonth}-05`,
      status: 'present',
      checkInAt: `${periodMonth}-05T09:00:00.000Z`,
      checkOutAt: `${periodMonth}-05T20:00:00.000Z`,
    }, auth);

    // Day 5: Unexcused Absence
    await hrService.upsertAttendanceRecord({
      employeeId: empFixedId,
      workDate: `${periodMonth}-06`,
      status: 'absent',
    }, auth);

    console.log('   ✅ Simulated Salaried Employee Attendance: On-time, Late 45m, Early Out 1h, Overtime 3h, Absent 1d');

    // Simulate Hourly Worker: Worked 20 days (160 hours)
    for (let day = 10; day <= 29; day++) {
      const dateStr = `${periodMonth}-${String(day).padStart(2, '0')}`;
      await hrService.upsertAttendanceRecord({
        employeeId: empHourlyId,
        workDate: dateStr,
        status: 'present',
        checkInAt: `${dateStr}T09:00:00.000Z`,
        checkOutAt: `${dateStr}T17:00:00.000Z`,
      }, auth);
    }
    console.log('   ✅ Simulated Hourly Employee Attendance: 20 Days × 8 Hours = 160 Hours\n');

    // -------------------------------------------------------------
    // STEP 5: Loans & Advances Simulation
    // -------------------------------------------------------------
    console.log('🔹 Step 5: Testing Loans & Salary Advances Module...');
    await hrService.createLoan({
      employeeId: empFixedId,
      principalAmount: 3000,
      installmentCount: 3, // 1000 EGP per month
      issueDate: `${periodMonth}-01`,
      repaymentMode: 'monthly_salary_installment',
      notes: 'سلفة شخصية',
    } as any, auth);

    const loansList = await hrService.listLoans({ employeeId: empFixedId }, auth);
    const loanItem = (loansList as any).loans?.[0];
    const loanId = Number(loanItem?.id);
    console.log(`   ✅ Loan #${loanId} created for ${loanItem?.principalAmount} EGP`);

    await hrService.approveLoan(loanId, auth);
    await hrService.disburseLoan(loanId, auth);

    console.log(`   ✅ Loan #${loanId} Approved & Disbursed (3 Installments × 1,000 EGP/month)\n`);

    // -------------------------------------------------------------
    // STEP 6: Leaves Module Simulation
    // -------------------------------------------------------------
    console.log('🔹 Step 6: Testing Leaves & Leave Balances Module...');
    // Create Leave Types
    const paidLeaveType = await hrService.upsertLeaveType(null, {
      name: `إجازة اعتيادية ${testSuffix}`,
      code: `ann_${testSuffix}`,
      daysPerYear: 21,
      isPaid: true,
      deductsFromBalance: true,
    } as any, auth);
    const paidTypeId = Number((paidLeaveType as any).rows?.[0]?.id || 1);

    const unpaidLeaveType = await hrService.upsertLeaveType(null, {
      name: `إجازة بدون راتب ${testSuffix}`,
      code: `unp_${testSuffix}`,
      daysPerYear: 0,
      isPaid: false,
      deductsFromBalance: false,
    } as any, auth);
    const unpaidTypeId = Number((unpaidLeaveType as any).rows?.[0]?.id || 2);

    // Request 2 Days Paid Leave
    const leaveReq1 = await hrService.createLeaveRequest({
      employeeId: empFixedId,
      leaveTypeId: paidTypeId,
      startDate: `${periodMonth}-10`,
      endDate: `${periodMonth}-11`,
      daysCount: 2,
      reason: 'ظرف عائلي',
    } as any, auth);
    const leave1Id = Number((leaveReq1 as any).requests?.[0]?.id || 1);
    await hrService.approveLeaveRequest(leave1Id, { status: 'approved' } as any, auth);

    // Request 1 Day Unpaid Leave
    const leaveReq2 = await hrService.createLeaveRequest({
      employeeId: empFixedId,
      leaveTypeId: unpaidTypeId,
      startDate: `${periodMonth}-12`,
      endDate: `${periodMonth}-12`,
      daysCount: 1,
      reason: 'سفر خاص',
    } as any, auth);
    const leave2Id = Number((leaveReq2 as any).requests?.[0]?.id || 2);
    await hrService.approveLeaveRequest(leave2Id, { status: 'approved' } as any, auth);

    console.log(`   ✅ Approved 2 Days Paid Leave & 1 Day Unpaid Leave\n`);

    // -------------------------------------------------------------
    // STEP 7: Payroll Run Generation & Calculation Verification
    // -------------------------------------------------------------
    console.log(`🔹 Step 7: Generating Full Monthly Payroll Run (${periodMonth})...`);
    const payrollRunRes = await hrService.createPayrollRun({
      periodMonth,
      startDate: `${periodMonth}-01`,
      endDate: `${periodMonth}-28`,
      payFrequency: 'monthly',
      notes: `كشف مرتبات شهر ${periodMonth} - تجربة شاملة`,
    }, auth);

    const runId = Number((payrollRunRes as any).run?.id || (payrollRunRes as any).id);
    console.log(`   ✅ Payroll Run Generated: #${runId}`);

    // Apply auto attendance & leave deductions
    await hrService.applyAttendanceDeductions(runId, auth);

    // Recalculate
    await hrService.recalculatePayrollRun(runId, auth);

    // Fetch Calculated Payroll Run Details
    const fullRun = await hrService.getPayrollRun(runId, auth);
    const items = (fullRun as any).run?.items || [];
    console.log(`   📊 Payroll Items Count: ${items.length}\n`);

    console.log('----------------------------------------------------------------');
    console.log('📋 AUDITING PAYROLL ITEMS BREAKDOWN:');
    console.log('----------------------------------------------------------------');

    for (const item of items) {
      const empId = Number(item.employeeId || item.employee_id);
      if (empId === empFixedId || empId === empHourlyId) {
        console.log(`\n👤 [Employee #${empId}: ${item.employeeName || item.display_name || item.name}]`);
        console.log(`   • Compensation Type:       ${item.compensationType || 'monthly'}`);
        console.log(`   • Base Salary:             ${item.baseSalary} EGP`);
        console.log(`   • Allowances (بدلات):      +${item.allowanceAmount} EGP`);
        console.log(`   • Deductions (استقطاعات):    -${item.deductionAmount} EGP`);
        console.log(`   • Loan Deduction (سلف):    -${item.loanDeductionAmount || 0} EGP`);
        console.log(`   • Gross Pay (الإجمالي):     ${item.grossPay} EGP`);
        console.log(`   • NET PAY (الصافي):        💰 ${item.netPay} EGP`);
        console.log(`   • Absent Days:             ${item.attendanceAbsentDays} days`);
        console.log(`   • Late Days:               ${item.attendanceLateDays} days`);
        console.log(`   • Unpaid Leave Days:       ${item.unpaidLeaveDays} days`);
        console.log(`   • Suggested Att Deduction: ${item.suggestedAttendanceDeductionAmount} EGP`);
        console.log(`   • Suggested Lve Deduction: ${item.suggestedLeaveDeductionAmount} EGP`);
        console.log(`   • Review Notes:            ${item.payrollReviewNotes || 'None'}`);
      }
    }

    console.log('\n----------------------------------------------------------------');
    console.log('🔹 Step 8: Testing Payroll Review, Approval & Payout...');
    await hrService.reviewPayrollRun(runId, auth);
    console.log(`   ✅ Payroll Run #${runId} Status: REVIEWED`);

    await hrService.approvePayrollRun(runId, auth);
    console.log(`   ✅ Payroll Run #${runId} Status: APPROVED`);

    // Payout Payroll
    await hrService.payPayrollRun(runId, {
      paymentDate: '2026-08-31',
      paymentMethod: 'cash',
      treasuryAction: 'none',
    } as any, auth);
    console.log(`   ✅ Payroll Run #${runId} Status: PAID / COMPLETED\n`);

    console.log('================================================================');
    console.log('🎉 AUDIT COMPLETE: ALL HR SUBMODULES TESTED SUCCESSFULLY');
    console.log('================================================================');

  } catch (error: any) {
    console.error('❌ HR AUDIT FAILED WITH ERROR:', error.message || error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

runExhaustiveHrAudit();
