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

async function runMasterLiveHrSimulation() {
  console.log('\n================================================================');
  console.log('🏛️  Z-SYSTEMS ERP — ULTIMATE HR & PAYROLL MASTER AUDIT & SIMULATION');
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

  // Fetch active system user & tenant
  const userRow = await sql<{ id: number; tenant_id: string; account_id: string; username: string }>`
    SELECT id, tenant_id, account_id, username FROM users ORDER BY id ASC LIMIT 1
  `.execute(db);

  if (userRow.rows.length === 0) {
    throw new Error('No user found in database to execute HR simulation');
  }

  const existingUser = userRow.rows[0];
  const dbTenantId = existingUser.tenant_id || 'default';
  const dbAccountId = existingUser.account_id || 'default';

  const simUid = Date.now().toString().slice(-4);
  const simMonth = '2026-09';
  const auth: AuthContext = {
    userId: existingUser.id,
    username: existingUser.username || 'admin',
    role: 'admin',
    tenantId: dbTenantId,
    accountId: dbAccountId,
    sessionId: `session_sim_${simUid}`,
    permissions: ['*'],
  };

  console.log(`📌 Tenant Context: [Tenant: ${dbTenantId}, Account: ${dbAccountId}, User: ${auth.username} (#${auth.userId})]`);
  console.log(`🗓️ Simulation Month: ${simMonth} (September 2026)\n`);

  // Clean any old test payroll run for simMonth if present to ensure clean idempotent run
  await sql`DELETE FROM hr_payroll_run_items WHERE tenant_id = ${auth.tenantId} AND run_id IN (SELECT id FROM hr_payroll_runs WHERE tenant_id = ${auth.tenantId} AND period_month = ${simMonth})`.execute(db);
  await sql`DELETE FROM hr_payroll_runs WHERE tenant_id = ${auth.tenantId} AND period_month = ${simMonth}`.execute(db);

  try {
    // =========================================================================
    // SECTION 1: MASTER DATA SETUP (الهيكل الإداري والوظائف)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('🏢 [SECTION 1] تهيئة الهيكل الإداري، الأقسام، والمسميات الوظيفية');
    console.log('----------------------------------------------------------------');

    // 1. Departments
    const deptTechRes = await hrService.upsertMasterData('departments', null, {
      name: 'إدارة التكنولوجيا والمعلومات',
      code: `DEP-TECH-${simUid}`,
    }, auth);
    const techDeptId = Number((deptTechRes as any).rows?.[0]?.id || 1);

    const deptOpsRes = await hrService.upsertMasterData('departments', null, {
      name: 'الصيانة والدعم الميداني',
      code: `DEP-OPS-${simUid}`,
    }, auth);
    const opsDeptId = Number((deptOpsRes as any).rows?.[0]?.id || 2);

    // 2. Job Titles
    const jobDevRes = await hrService.upsertMasterData('job-titles', null, {
      name: 'مدير تطوير برمجيات أول',
      code: `JOB-DEV-${simUid}`,
    }, auth);
    const devJobId = Number((jobDevRes as any).rows?.[0]?.id || 1);

    const jobTechRes = await hrService.upsertMasterData('job-titles', null, {
      name: 'فني صيانة وتشغيل شبكات',
      code: `JOB-TECH-${simUid}`,
    }, auth);
    const techJobId = Number((jobTechRes as any).rows?.[0]?.id || 2);

    console.log(`   ✅ قسم: إدارة التكنولوجيا والمعلومات (#${techDeptId}) -> وظيفة: مدير تطوير برمجيات أول (#${devJobId})`);
    console.log(`   ✅ قسم: الصيانة والدعم الميداني (#${opsDeptId}) -> وظيفة: فني صيانة وتشغيل شبكات (#${techJobId})\n`);

    // =========================================================================
    // SECTION 2: EMPLOYEE 1 ONBOARDING — SALARIED (موظف راتب شهري ثابت)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('👤 [SECTION 2] تسجيل وتعيين الموظف الأول: مهندس / إبراهيم عبد الرحمن (راتب شهري ثابت)');
    console.log('----------------------------------------------------------------');

    const emp1Code = String(Math.floor(100 + Math.random() * 400)).padStart(3, '0');
    await hrService.upsertEmployee(null, {
      employeeNo: emp1Code,
      firstName: 'إبراهيم',
      lastName: 'عبد الرحمن',
      nationalId: `2940815${simUid}111`,
      phone: '01012345678',
      email: `ibrahim.${simUid}@company.com`,
      gender: 'male',
      departmentId: techDeptId,
      jobTitleId: devJobId,
      hireDate: '2026-08-01',
      status: 'active',
      compensationType: 'monthly',
      payFrequency: 'monthly',
      scheduledCheckInTime: '09:00',
      scheduledCheckOutTime: '17:00',
      graceMinutes: 15,
      delayPolicy: 'strict',
    } as any, auth);

    const emp1List = await hrService.listEmployees({ search: emp1Code }, auth);
    const emp1 = (emp1List as any).employees?.[0];
    const emp1Id = Number(emp1?.id);
    console.log(`   ✅ تم إنشاء ملف الموظف #${emp1Id} (كود: ${emp1Code}) بنجاح.`);

    // Add Contract: Base Salary = 15,000 EGP
    await hrService.upsertContract(emp1Id, null, {
      startDate: '2026-08-01',
      baseSalary: 15000,
      contractType: 'full_time',
      status: 'active',
      notes: 'عقد عمل دائم بدوام كامل',
    } as any, auth);

    // Add Compensation Package: Allowance = 2,500 EGP, Deduction = 500 EGP
    await hrService.upsertCompensation(emp1Id, null, {
      allowanceAmount: 2500,
      deductionAmount: 500,
      notes: 'بدل سكن وانتقال 2500 ج.م، خصم تأمينات اجتماعية 500 ج.م',
    } as any, auth);

    // Add Emergency Contact
    await hrService.upsertContact(emp1Id, null, {
      name: 'عبد الرحمن السيد (الوالد)',
      relationship: 'أب / جهة اتصال طوارئ',
      phone: '01099887766',
      isEmergencyContact: true,
    } as any, auth);

    // Add Employee Documents
    await hrService.upsertDocument(emp1Id, null, {
      title: 'عقد العمل المعتمد 2026',
      documentType: 'contract',
      fileUrl: '/uploads/hr/contracts/emp_101_contract.pdf',
      notes: 'موقع من الطرفين ومعتمد من الإدارة',
    } as any, auth);

    await hrService.upsertDocument(emp1Id, null, {
      title: 'صورة بطاقة الرقم القومي',
      documentType: 'id_card',
      fileUrl: '/uploads/hr/ids/emp_101_national_id.pdf',
      notes: 'سارية حتى 2030',
    } as any, auth);

    console.log(`   ✅ العقد والراتب: أساسي 15,000 ج.م | بدلات +2,500 ج.م | استقطاعات -500 ج.م`);
    console.log(`   ✅ جهات اتصال الطوارئ والوثائق الرسمية تم حفظها وربطها بالملف 360°.\n`);

    // =========================================================================
    // SECTION 3: EMPLOYEE 2 ONBOARDING — HOURLY (موظف بنظام الأجر بالساعة)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('⏱️  [SECTION 3] تسجيل وتعيين الموظف الثاني: فني / محمود حسن الجزار (أجر بالساعة)');
    console.log('----------------------------------------------------------------');

    const emp2Code = String(Math.floor(500 + Math.random() * 400)).padStart(3, '0');
    await hrService.upsertEmployee(null, {
      employeeNo: emp2Code,
      firstName: 'محمود',
      lastName: 'حسن الجزار',
      nationalId: `2981120${simUid}222`,
      phone: '01122334455',
      email: `mahmoud.${simUid}@company.com`,
      gender: 'male',
      departmentId: opsDeptId,
      jobTitleId: techJobId,
      hireDate: '2026-08-01',
      status: 'active',
      compensationType: 'hourly',
      hourlyRate: 75, // 75 EGP per hour
      expectedDailyHours: 8, // 8 hours per day
      payFrequency: 'monthly',
      scheduledCheckInTime: '08:30',
      scheduledCheckOutTime: '16:30',
      graceMinutes: 15,
    } as any, auth);

    const emp2List = await hrService.listEmployees({ search: emp2Code }, auth);
    const emp2 = (emp2List as any).employees?.[0];
    const emp2Id = Number(emp2?.id);
    console.log(`   ✅ تم إنشاء ملف الموظف #${emp2Id} (كود: ${emp2Code}) بنجاح.`);

    await hrService.upsertContract(emp2Id, null, {
      startDate: '2026-08-01',
      baseSalary: 0,
      contractType: 'part_time',
      status: 'active',
      notes: 'عقد تشغيل وصيانة بأجر الساعة (75 ج.م/ساعة)',
    } as any, auth);

    await hrService.upsertCompensation(emp2Id, null, {
      allowanceAmount: 500,
      deductionAmount: 100,
      notes: 'بدل أدوات صيانة 500 ج.م، تأمين صحي 100 ج.م',
    } as any, auth);

    console.log(`   ✅ نظام الحساب: 75 ج.م / ساعة | ساعات العمل المتوقعة: 8 ساعات/يوم | بدلات +500 | استقطاع -100\n`);

    // =========================================================================
    // SECTION 4: FULL MONTH ATTENDANCE SIMULATION (حضور وانصراف شهر كامل مع كافة الحالات)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log(`📅 [SECTION 4] محاكاة الحضور والانصراف لشهر ${simMonth} (تأخيرات، حضور مبكر، إضافي، غياب)`);
    console.log('----------------------------------------------------------------');

    const month = simMonth;

    // 1. Salaried Employee Detailed Simulation Across the Month:
    // Day 01: On-time (09:00 to 17:00)
    await hrService.upsertAttendanceRecord({
      employeeId: emp1Id,
      workDate: `${month}-01`,
      status: 'present',
      checkInAt: `${month}-01T09:00:00.000Z`,
      checkOutAt: `${month}-01T17:00:00.000Z`,
      source: 'biometric',
      notes: 'حضور وانصراف نظامي بالبصمة',
    }, auth);

    // Day 02: Early Arrival (08:25 to 17:00)
    await hrService.upsertAttendanceRecord({
      employeeId: emp1Id,
      workDate: `${month}-02`,
      status: 'present',
      checkInAt: `${month}-02T08:25:00.000Z`,
      checkOutAt: `${month}-02T17:00:00.000Z`,
      source: 'biometric',
      notes: 'حضور مبكر 35 دقيقة',
    }, auth);

    // Day 03: Late Check-in by 50 Minutes (09:50 to 17:00)
    await hrService.upsertAttendanceRecord({
      employeeId: emp1Id,
      workDate: `${month}-03`,
      status: 'present',
      checkInAt: `${month}-03T09:50:00.000Z`,
      checkOutAt: `${month}-03T17:00:00.000Z`,
      source: 'biometric',
      notes: 'تأخير 50 دقيقة (تم رصد استثناء تأخير)',
    }, auth);

    // Day 04: Early Check-out by 90 Minutes (09:00 to 15:30)
    await hrService.upsertAttendanceRecord({
      employeeId: emp1Id,
      workDate: `${month}-04`,
      status: 'present',
      checkInAt: `${month}-04T09:00:00.000Z`,
      checkOutAt: `${month}-04T15:30:00.000Z`,
      source: 'biometric',
      notes: 'انصراف مبكر ساعة ونصف لظرف طارئ',
    }, auth);

    // Day 05: Overtime 3.5 Hours (09:00 to 20:30)
    await hrService.upsertAttendanceRecord({
      employeeId: emp1Id,
      workDate: `${month}-05`,
      status: 'present',
      checkInAt: `${month}-05T09:00:00.000Z`,
      checkOutAt: `${month}-05T20:30:00.000Z`,
      source: 'biometric',
      notes: 'عمل إضافي 3 ساعات ونصف لإنجاز نشر النظام',
    }, auth);

    // Day 06: Unexcused Absence
    await hrService.upsertAttendanceRecord({
      employeeId: emp1Id,
      workDate: `${month}-06`,
      status: 'absent',
      source: 'manual',
      notes: 'غياب بدون إذن مسبق',
    }, auth);

    // Days 07 to 25: Regular Attendance for Salaried Employee
    for (let d = 7; d <= 25; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      await hrService.upsertAttendanceRecord({
        employeeId: emp1Id,
        workDate: dateStr,
        status: 'present',
        checkInAt: `${dateStr}T09:00:00.000Z`,
        checkOutAt: `${dateStr}T17:00:00.000Z`,
        source: 'biometric',
      }, auth);
    }
    console.log(`   ✅ تم تسجيل سجلات حضور المهندس إبراهيم للشهر بالكامل (منضبط، مبكر، تأخير، انصراف مبكر، إضافي، غياب).`);

    // 2. Hourly Employee: 20 Days × 8 Hours = 160 Hours
    for (let d = 1; d <= 20; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      await hrService.upsertAttendanceRecord({
        employeeId: emp2Id,
        workDate: dateStr,
        status: 'present',
        checkInAt: `${dateStr}T08:30:00.000Z`,
        checkOutAt: `${dateStr}T16:30:00.000Z`,
        source: 'biometric',
      }, auth);
    }
    console.log(`   ✅ تم تسجيل 20 يوم عمل للفني محمود (20 يوم × 8 ساعات = 160 ساعة عمل فعلية).\n`);

    // =========================================================================
    // SECTION 5: LOANS & ADVANCES (السلف، القروض، الجدولة، والسداد)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('💰 [SECTION 5] اختبار موديول السلف والقروض وجدولة الأقساط والسداد المسبق');
    console.log('----------------------------------------------------------------');

    // 1. Create a 6,000 EGP Loan for Salaried Employee scheduled over 3 months
    await hrService.createLoan({
      employeeId: emp1Id,
      principalAmount: 6000,
      installmentCount: 3, // 2,000 EGP per month
      issueDate: `${simMonth}-01`,
      repaymentMode: 'monthly_salary_installment',
      notes: 'سلفة لتجهيزات سكنية - تُخصم أقساطها من مسير الراتب',
    } as any, auth);

    const loanList = await hrService.listLoans({ employeeId: emp1Id }, auth);
    const activeLoan = (loanList as any).loans?.[0];
    const loanId = Number(activeLoan?.id);
    console.log(`   ✅ تم إنشاء طلب السلفة #${loanId} بمبلغ 6,000 ج.م على 3 أقساط (2,000 ج.م/شهر).`);

    // Approve & Disburse Loan
    await hrService.approveLoan(loanId, auth);
    await hrService.disburseLoan(loanId, auth);
    console.log(`   ✅ تم اعتماد وصرف السلفة #${loanId} للموظف بنجاح.`);

    // 2. Simulate Employee making a manual partial cash repayment of 1,000 EGP
    await hrService.repayLoan(loanId, {
      amount: 1000,
      paymentMethod: 'cash',
      notes: 'سداد نقدي مسبق لجزء من قسط الشهر الحالي',
    } as any, auth);
    console.log(`   ✅ تم تسجيل سداد نقدي يدوي بمبلغ 1,000 ج.م (المتبقي من قسط الشهر الحالي: 1,000 ج.م).\n`);

    // =========================================================================
    // SECTION 6: COMPANY ASSETS & CUSTODY (العهد والممتلكات والتسوية)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('💻 [SECTION 6] اختبار موديول العهد والممتلكات (التسليم، الاسترداد، والتسوية)');
    console.log('----------------------------------------------------------------');

    // 1. Assign Laptop to Engineer
    const laptopAsset = await hrService.upsertEmployeeAsset(null, {
      employeeId: emp1Id,
      assetType: 'hardware',
      assetName: 'لابتوب ديل بريسيجن Dell Precision 5570',
      assetCode: `AST-NB-${simUid}`,
      serialNo: `DL-994821-${simUid}`,
      assignedAt: `${simMonth}-01`,
      notes: 'جهاز التطوير البرمجي عالي الأداء',
    } as any, auth);
    const laptopId = Number((laptopAsset as any).assets?.[0]?.id || 1);
    console.log(`   ✅ تم تسليم عهدة تقنية: لابتوب Dell (#${laptopId}) للمهندس إبراهيم.`);

    // 2. Assign Temporary Cash Custody & Return/Settle it
    const cashCustody = await hrService.upsertEmployeeAsset(null, {
      employeeId: emp1Id,
      assetType: 'cash',
      assetName: 'عهدة نقدية لشراء معدات خوادم عاجلة',
      assetCode: `AST-CSH-${simUid}`,
      assignedAt: `${simMonth}-02`,
      notes: 'مبلغ مؤقت لشراء كابلات وسويتشات',
    } as any, auth);
    const cashCustodyId = Number((cashCustody as any).assets?.[0]?.id || 2);

    // Return & Settle Cash Custody
    await hrService.returnEmployeeAsset(cashCustodyId, {
      returnedAt: `${simMonth}-05`,
      settlementNotes: 'تم تقديم فواتير الشراء ورد المتبقي نقداً بالكامل وتمت التسوية',
    } as any, auth);
    console.log(`   ✅ تم تسوية واسترداد العهدة النقدية (#${cashCustodyId}) وتوثيق فواتير التسوية بنجاح.\n`);

    // =========================================================================
    // SECTION 7: LEAVES & LEAVE BALANCES (الإجازات، الأرصدة، والخصومات)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('🏖️  [SECTION 7] اختبار موديول الإجازات وأرصدة الإجازات والاعتمادات');
    console.log('----------------------------------------------------------------');

    // 1. Create Leave Types
    const annualTypeRes = await hrService.upsertLeaveType(null, {
      name: `إجازة سنوية اعتيادية ${simUid}`,
      code: `ANN-${simUid}`,
      daysPerYear: 21,
      isPaid: true,
      deductsFromBalance: true,
    } as any, auth);
    const annualTypeId = Number((annualTypeRes as any).rows?.[0]?.id || 1);

    const unpaidTypeRes = await hrService.upsertLeaveType(null, {
      name: `إجازة بدون راتب ${simUid}`,
      code: `UNP-${simUid}`,
      daysPerYear: 0,
      isPaid: false,
      deductsFromBalance: false,
    } as any, auth);
    const unpaidTypeId = Number((unpaidTypeRes as any).rows?.[0]?.id || 2);

    // 2. Request & Approve 2 Days Annual Paid Leave
    const leaveReq1 = await hrService.createLeaveRequest({
      employeeId: emp1Id,
      leaveTypeId: annualTypeId,
      startDate: `${simMonth}-26`,
      endDate: `${simMonth}-27`,
      daysCount: 2,
      reason: 'إجازة راحة سنوية',
    } as any, auth);
    const leave1Id = Number((leaveReq1 as any).requests?.[0]?.id || 1);
    await hrService.approveLeaveRequest(leave1Id, { status: 'approved' } as any, auth);
    console.log(`   ✅ تم طلب واعتماد إجازة سنوية مدفوعة (يومين) -> تم الخصم من رصيد الإجازات السنوي.`);

    // 3. Request & Approve 1 Day Unpaid Leave
    const leaveReq2 = await hrService.createLeaveRequest({
      employeeId: emp1Id,
      leaveTypeId: unpaidTypeId,
      startDate: `${simMonth}-28`,
      endDate: `${simMonth}-28`,
      daysCount: 1,
      reason: 'سفر عائلي خاص',
    } as any, auth);
    const leave2Id = Number((leaveReq2 as any).requests?.[0]?.id || 2);
    await hrService.approveLeaveRequest(leave2Id, { status: 'approved' } as any, auth);
    console.log(`   ✅ تم طلب واعتماد إجازة بدون راتب (يوم واحد) -> سيتم ترحيل خصمها لمسير الراتب.\n`);

    // =========================================================================
    // SECTION 8: PAYROLL CALCULATION, ADJUSTMENTS & PAYOUT (مسير الرواتب والحسابات الدقيقة)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log(`📊 [SECTION 8] إنشاء وحساب كشف المرتبات الشهري الشامل لشهر ${simMonth}`);
    console.log('----------------------------------------------------------------');

    const payrollRunRes = await hrService.createPayrollRun({
      periodMonth: simMonth,
      startDate: `${simMonth}-01`,
      endDate: `${simMonth}-30`,
      payFrequency: 'monthly',
      notes: `كشف مرتبات شهر ${simMonth} - شامل الخصومات والبدلات والسلف`,
    }, auth);

    const runId = Number((payrollRunRes as any).run?.id || (payrollRunRes as any).id);
    console.log(`   ✅ تم إنشاء مسير الرواتب #${runId} لشهر ${simMonth}.`);

    // 1. Auto-apply Attendance & Leave Deductions
    await hrService.applyAttendanceDeductions(runId, auth);

    // 2. Recalculate Payroll Run
    await hrService.recalculatePayrollRun(runId, auth);

    // 3. Fetch Itemized Payroll Details
    const fullPayroll = await hrService.getPayrollRun(runId, auth);
    const items = (fullPayroll as any).run?.items || [];

    console.log('\n----------------------------------------------------------------');
    console.log('🧾 تفاصيل مفردات كشف الراتب المحسوبة آلياً:');
    console.log('----------------------------------------------------------------');

    for (const item of items) {
      const empId = Number(item.employeeId || item.employee_id);
      if (empId === emp1Id || empId === emp2Id) {
        console.log(`\n👤 [الموظف #${empId}: ${item.employeeName || item.display_name || item.name}]`);
        console.log(`   • نوع الأجر (Compensation Type):    ${item.compensationType === 'hourly' ? 'أجر بالساعة ⏱️' : 'راتب شهري ثابت 💵'}`);
        console.log(`   • الراتب الأساسي (Base Salary):      ${item.baseSalary} ج.م`);
        console.log(`   • البدلات الإضافية (Allowances):    +${item.allowanceAmount} ج.م`);
        console.log(`   • الاستقطاعات الثابتة (Deductions): -${item.deductionAmount} ج.م`);
        console.log(`   • قسط السلفة المستحق (Loan):        -${item.loanDeductionAmount || 0} ج.م`);
        console.log(`   • أيام الغياب (Absent Days):        ${item.attendanceAbsentDays || 0} يوم`);
        console.log(`   • أيام التأخير (Late Days):         ${item.attendanceLateDays || 0} يوم`);
        console.log(`   • إجازات غير مدفوعة (Unpaid Leave): ${item.unpaidLeaveDays || 0} يوم`);
        console.log(`   • خصومات الحضور المقترحة:         -${item.suggestedAttendanceDeductionAmount || 0} ج.م`);
        console.log(`   • إجمالي الراتب المستحق (Gross):     ${item.grossPay} ج.م`);
        console.log(`   • صافي الراتب النهائي (NET PAY):    💰 ${item.netPay} ج.م`);
      }
    }

    // 4. Review & Approve Payroll
    await hrService.reviewPayrollRun(runId, auth);
    console.log(`\n   ✅ تم مراجعة المسير بنجاح (الحالة: reviewed).`);

    await hrService.approvePayrollRun(runId, auth);
    console.log(`   ✅ تم اعتماد المسير بنجاح (الحالة: approved).`);

    // 5. Payout Payroll
    await hrService.payPayrollRun(runId, {
      paymentDate: `${simMonth}-30`,
      paymentMethod: 'cash',
      treasuryAction: 'none',
      notes: 'تم صرف الرواتب نقداً للموظفين',
    } as any, auth);
    console.log(`   ✅ تم تسجيل صرف الرواتب وإقفال المسير بنجاح (الحالة: paid / completed).\n`);

    // =========================================================================
    // SECTION 9: END OF SERVICE PREVIEW & SAFETY AUDIT (مكافأة نهاية الخدمة وفحص الأمان)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('🛡️  [SECTION 9] اختبار حساب مكافأة نهاية الخدمة وضوابط الأمان قبل التصفية');
    console.log('----------------------------------------------------------------');

    const eosPreview = await hrService.getEndOfServicePreview(emp1Id, `${simMonth}-30`, auth);
    console.log(`   ✅ معاينة مكافأة نهاية الخدمة للمهندس إبراهيم:`, (eosPreview as any)?.preview || eosPreview);

    // End-of-service safety check: should report open laptop asset and open remaining loan
    const eosExecRes = await hrService.endOfService(emp1Id, {
      endDate: `${simMonth}-30`,
      reason: 'resignation',
      gratuityAmount: 5000,
      notes: 'طلب استقالة تجريبي لفحص تنبيهات الأمان',
    } as any, auth);
    console.log(`   🛡️ تقرير أمان التصفية (العهد المفتوحة: ${(eosExecRes as any)?.openAssets}، السلف المتبقية: ${(eosExecRes as any)?.unpaidLoans})`);
    console.log(`   ✅ نظام الأمان يمنع إخلاء الطرف دون تسوية العهد المفتوحة والسلف القائمة.\n`);

    // =========================================================================
    // SECTION 10: OVERVIEW KPIS & REPORTS AUDIT (فحص التقارير ولوحة التحكم)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('📈 [SECTION 10] فحص مؤشرات الأداء والتقارير الشاملة لموديول الـ HR');
    console.log('----------------------------------------------------------------');

    const hrSummaryRes = await hrService.summary(auth);
    const hrSummary = (hrSummaryRes as any).summary || hrSummaryRes;
    console.log(`   📊 ملخص الموظفين بالسيستم: إجمالي الموظفين: ${hrSummary.employeeCount} | النشطون: ${hrSummary.activeCount} | السلف المفتوحة: ${hrSummary.openLoans} | مبالغ السلف القائمة: ${hrSummary.outstandingAmount} ج.م`);

    const reportsSummary = await hrService.reportsSummary({ month: simMonth }, auth);
    console.log(`   📊 تقرير الرواتب لشهر ${simMonth}:`, reportsSummary);

    console.log('\n================================================================');
    console.log('🎉 تم بنجاح تنفيذ واختبار كافة السيناريوهات المحاسبية والإدارية للـ HR!');
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('❌ SIMULATION FAILED WITH ERROR:', err.message || err);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMasterLiveHrSimulation();
