import { summarizeHourlyAttendance, prorateMonthlyWage, WorkPunch } from './hourly-attendance-pay.engine';

export interface EmployeeWithdrawalContext {
  employee: {
    id: number;
    employeeNo?: string;
    displayName: string;
    compensationType: 'hourly' | 'monthly';
    payFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    hourlyRate: number;
    expectedDailyHours: number;
    hireDate?: string;
    status: string;
  };
  contract?: {
    baseSalary: number;
    currency?: string;
  };
  activePayrollItem?: {
    id: number;
    runId: number;
    periodMonth?: string;
    runStatus: string; // 'draft' | 'reviewed' | 'approved'
    baseSalary: number;
    allowanceAmount: number;
    grossPay: number;
    deductionAmount: number;
    loanDeductionAmount: number;
    netPay: number;
  };
  currentCycle: {
    cycleStart: string; // YYYY-MM-DD
    cycleEnd: string;   // YYYY-MM-DD
    daysElapsed: number;
  };
  punches: WorkPunch[];
  priorLoans: Array<{
    id: number;
    loanType: string;
    principalAmount: number;
    remainingAmount: number;
    issueDate: string;
    status: string;
  }>;
  unpaidApprovedPayrollItems: Array<{
    id: number;
    netPay: number;
    grossPay: number;
  }>;
  todayDate: string;
}

export interface EmployeeWithdrawalBalanceResult {
  employee: {
    id: number;
    employeeNo?: string;
    displayName: string;
    compensationType: 'hourly' | 'monthly';
    payFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    hourlyRate: number;
    baseSalary: number;
  };
  cycle: {
    cycleStart: string;
    cycleEnd: string;
    daysElapsed: number;
  };
  accrual: {
    workedHours: number;
    completedDays: number;
    hourlyRate: number;
    baseSalary: number;
    accruedEarnings: number;
    calculationText: string;
    source: 'payroll_item' | 'attendance_records' | 'contract_prorated';
  };
  deductions: {
    currentCycleWithdrawals: number;
    priorOutstandingDebt: number;
    totalDebt: number;
    activeLoanCount: number;
  };
  unpaidApprovedPayroll: number;
  netAvailableBalance: number;
  balanceStatus: 'credit' | 'debit' | 'settled';
  canDisburseDirectly: boolean;
  maxDirectDisbursement: number;
}

function round2(val: number): number {
  return Number((Math.round(Number(val + 'e+2')) + 'e-2'));
}

export function calculateEmployeeWithdrawalBalance(ctx: EmployeeWithdrawalContext): EmployeeWithdrawalBalanceResult {
  const isHourly = ctx.employee.compensationType === 'hourly';
  const payFreq = ctx.employee.payFrequency || 'monthly';
  const baseSalary = Number(ctx.contract?.baseSalary || 0);
  const hourlyRate = Number(ctx.employee.hourlyRate || 0);

  let workedHours = 0;
  let completedDays = 0;
  let accruedEarnings = 0;
  let calculationText = '';
  let accrualSource: 'payroll_item' | 'attendance_records' | 'contract_prorated' = 'contract_prorated';

  // 1. If employee is in an active un-finalized payroll run that hasn't been paid yet:
  if (ctx.activePayrollItem) {
    accrualSource = 'payroll_item';
    const item = ctx.activePayrollItem;
    // Gross pay minus attendance deductions (before loan deduction)
    const rawEarned = round2(Number(item.grossPay || item.baseSalary || 0) - Number(item.deductionAmount || 0));
    accruedEarnings = rawEarned > 0 ? rawEarned : round2(Number(item.netPay || 0) + Number(item.loanDeductionAmount || 0));
    if (accruedEarnings <= 0) accruedEarnings = round2(Number(item.baseSalary || 0));

    if (isHourly) {
      const work = summarizeHourlyAttendance(ctx.punches, hourlyRate);
      workedHours = round2(work.workedMinutes / 60);
      completedDays = work.completedDays;
      calculationText = workedHours > 0
        ? `${workedHours} س عمل مسجلة (${moneyText(accruedEarnings)})`
        : `استحقاق كشف الرواتب النشط (${item.periodMonth || 'الشهر الحالي'})`;
    } else {
      completedDays = Math.max(1, ctx.currentCycle.daysElapsed);
      calculationText = `استحقاق كشف الرواتب النشط (${item.periodMonth || 'الشهر الحالي'})`;
    }
  } else if (isHourly) {
    accrualSource = 'attendance_records';
    const work = summarizeHourlyAttendance(ctx.punches, hourlyRate);
    workedHours = round2(work.workedMinutes / 60);
    completedDays = work.completedDays;
    accruedEarnings = round2(work.baseWage);
    calculationText = `${workedHours} س عمل × ${hourlyRate} ج.م/س`;
  } else if (payFreq === 'daily') {
    accrualSource = 'attendance_records';
    const presentRecords = ctx.punches.filter(p => String(p.status || '').toLowerCase() === 'present');
    completedDays = presentRecords.length > 0 ? presentRecords.length : Math.max(1, ctx.currentCycle.daysElapsed);
    const dailyWage = baseSalary > 0 ? round2(baseSalary / 30) : 0;
    accruedEarnings = round2(completedDays * dailyWage);
    calculationText = `${completedDays} يوم استحقاق × ${dailyWage} ج.م/يوم`;
  } else {
    accrualSource = 'contract_prorated';
    accruedEarnings = round2(prorateMonthlyWage(baseSalary, ctx.currentCycle.cycleStart, ctx.todayDate));
    completedDays = Math.max(1, ctx.currentCycle.daysElapsed);
    calculationText = `استحقاق نسبي عن ${completedDays} يوم (من راتب ${baseSalary} ج.م)`;
  }

  // 2. Calculate prior loans & advances
  let currentCycleWithdrawals = 0;
  let priorOutstandingDebt = 0;
  let activeLoanCount = 0;

  for (const loan of ctx.priorLoans) {
    const st = String(loan.status || '');
    if (!['paid', 'partially_repaid', 'disbursed'].includes(st)) continue;
    const remaining = round2(Number(loan.remainingAmount || 0));
    if (remaining <= 0) continue;

    activeLoanCount++;
    const issue = String(loan.issueDate || '').slice(0, 10);
    const isAdvance = loan.loanType === 'advance';

    if (isAdvance && issue >= ctx.currentCycle.cycleStart) {
      currentCycleWithdrawals = round2(currentCycleWithdrawals + remaining);
    } else {
      priorOutstandingDebt = round2(priorOutstandingDebt + remaining);
    }
  }

  const totalDebt = round2(currentCycleWithdrawals + priorOutstandingDebt);

  // 3. Unpaid past approved payroll items (if any prior run approved and not paid)
  let unpaidApprovedPayroll = 0;
  for (const item of ctx.unpaidApprovedPayrollItems) {
    // If activePayrollItem is already counted, do not duplicate
    if (ctx.activePayrollItem && Number(item.id) === Number(ctx.activePayrollItem.id)) continue;
    unpaidApprovedPayroll = round2(unpaidApprovedPayroll + Number(item.netPay || 0));
  }

  // 4. Net Available Balance: (Accrued + Unpaid Payroll) - Total Debt
  const netAvailableBalance = round2((unpaidApprovedPayroll + accruedEarnings) - totalDebt);

  let balanceStatus: 'credit' | 'debit' | 'settled' = 'settled';
  if (netAvailableBalance > 0.009) {
    balanceStatus = 'credit';
  } else if (netAvailableBalance < -0.009) {
    balanceStatus = 'debit';
  }

  return {
    employee: {
      id: ctx.employee.id,
      employeeNo: ctx.employee.employeeNo,
      displayName: ctx.employee.displayName,
      compensationType: ctx.employee.compensationType,
      payFrequency: ctx.employee.payFrequency,
      hourlyRate,
      baseSalary,
    },
    cycle: {
      cycleStart: ctx.currentCycle.cycleStart,
      cycleEnd: ctx.currentCycle.cycleEnd,
      daysElapsed: ctx.currentCycle.daysElapsed,
    },
    accrual: {
      workedHours,
      completedDays,
      hourlyRate,
      baseSalary,
      accruedEarnings,
      calculationText,
      source: accrualSource,
    },
    deductions: {
      currentCycleWithdrawals,
      priorOutstandingDebt,
      totalDebt,
      activeLoanCount,
    },
    unpaidApprovedPayroll,
    netAvailableBalance,
    balanceStatus,
    canDisburseDirectly: netAvailableBalance > 0.009,
    maxDirectDisbursement: Math.max(0, netAvailableBalance),
  };
}

function moneyText(val: number): string {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
}
