import { strict as assert } from 'node:assert';
import { calculateEmployeeWithdrawalBalance, EmployeeWithdrawalContext } from './employee-withdrawal-balance.engine';

function testHourlyEmployeeDirectDisbursement(): void {
  const ctx: EmployeeWithdrawalContext = {
    employee: {
      id: 101,
      employeeNo: 'EMP-01',
      displayName: 'أحمد محمود',
      compensationType: 'hourly',
      payFrequency: 'monthly',
      hourlyRate: 50,
      expectedDailyHours: 8,
      status: 'active',
    },
    currentCycle: {
      cycleStart: '2026-10-01',
      cycleEnd: '2026-10-25',
      daysElapsed: 25,
    },
    punches: [
      {
        status: 'present',
        check_in_at: '2026-10-02T09:00:00Z',
        check_out_at: '2026-10-02T17:00:00Z', // 8 hrs
      },
      {
        status: 'present',
        check_in_at: '2026-10-03T09:00:00Z',
        check_out_at: '2026-10-03T15:00:00Z', // 6 hrs
      },
    ], // total 14 hrs * 50 = 700 EGP
    priorLoans: [
      {
        id: 1,
        loanType: 'advance',
        principalAmount: 200,
        remainingAmount: 200,
        issueDate: '2026-10-05',
        status: 'paid',
      },
    ],
    unpaidApprovedPayrollItems: [],
    todayDate: '2026-10-25',
  };

  const result = calculateEmployeeWithdrawalBalance(ctx);

  assert.equal(result.accrual.workedHours, 14);
  assert.equal(result.accrual.accruedEarnings, 700);
  assert.equal(result.deductions.currentCycleWithdrawals, 200);
  assert.equal(result.netAvailableBalance, 500); // 700 - 200 = 500 EGP
  assert.equal(result.balanceStatus, 'credit');
  assert.equal(result.canDisburseDirectly, true);
  assert.equal(result.maxDirectDisbursement, 500);
}

function testDebitExceedingAccruals(): void {
  const ctx: EmployeeWithdrawalContext = {
    employee: {
      id: 102,
      displayName: 'محمد علي',
      compensationType: 'hourly',
      payFrequency: 'monthly',
      hourlyRate: 40,
      expectedDailyHours: 8,
      status: 'active',
    },
    currentCycle: {
      cycleStart: '2026-10-01',
      cycleEnd: '2026-10-25',
      daysElapsed: 25,
    },
    punches: [
      {
        status: 'present',
        check_in_at: '2026-10-02T09:00:00Z',
        check_out_at: '2026-10-02T14:00:00Z', // 5 hrs * 40 = 200 EGP
      },
    ],
    priorLoans: [
      {
        id: 2,
        loanType: 'advance',
        principalAmount: 500,
        remainingAmount: 500,
        issueDate: '2026-10-04',
        status: 'paid',
      },
    ],
    unpaidApprovedPayrollItems: [],
    todayDate: '2026-10-25',
  };

  const result = calculateEmployeeWithdrawalBalance(ctx);

  assert.equal(result.accrual.workedHours, 5);
  assert.equal(result.accrual.accruedEarnings, 200);
  assert.equal(result.deductions.totalDebt, 500);
  assert.equal(result.netAvailableBalance, -300); // 200 - 500 = -300
  assert.equal(result.balanceStatus, 'debit');
  assert.equal(result.canDisburseDirectly, false);
  assert.equal(result.maxDirectDisbursement, 0);
}

function testMonthlyContractProration(): void {
  const ctx: EmployeeWithdrawalContext = {
    employee: {
      id: 103,
      displayName: 'خالد إبراهيم',
      compensationType: 'monthly',
      payFrequency: 'monthly',
      hourlyRate: 0,
      expectedDailyHours: 8,
      status: 'active',
    },
    contract: {
      baseSalary: 6200, // in October (31 days) = 200 EGP / day
    },
    currentCycle: {
      cycleStart: '2026-10-01',
      cycleEnd: '2026-10-10',
      daysElapsed: 10,
    },
    punches: [],
    priorLoans: [],
    unpaidApprovedPayrollItems: [
      {
        id: 99,
        netPay: 1500,
        grossPay: 1800,
      },
    ],
    todayDate: '2026-10-10',
  };

  const result = calculateEmployeeWithdrawalBalance(ctx);

  // 10 days in Oct (31 days) = (10/31) * 6200 = 2000
  assert.equal(result.accrual.accruedEarnings, 2000);
  assert.equal(result.unpaidApprovedPayroll, 1500);
  assert.equal(result.netAvailableBalance, 3500); // 2000 + 1500 = 3500
  assert.equal(result.balanceStatus, 'credit');
  assert.equal(result.canDisburseDirectly, true);
  assert.equal(result.maxDirectDisbursement, 3500);
}

function testActivePayrollItem(): void {
  const ctx: EmployeeWithdrawalContext = {
    employee: {
      id: 104,
      displayName: 'سعيد عاشور رضوان',
      compensationType: 'hourly',
      payFrequency: 'daily',
      hourlyRate: 10,
      expectedDailyHours: 8,
      status: 'active',
    },
    activePayrollItem: {
      id: 501,
      runId: 26,
      periodMonth: '2026-10',
      runStatus: 'draft',
      baseSalary: 640,
      allowanceAmount: 0,
      grossPay: 640,
      deductionAmount: 0,
      loanDeductionAmount: 0,
      netPay: 640,
    },
    currentCycle: {
      cycleStart: '2026-10-01',
      cycleEnd: '2026-10-25',
      daysElapsed: 25,
    },
    punches: [],
    priorLoans: [],
    unpaidApprovedPayrollItems: [],
    todayDate: '2026-10-25',
  };

  const result = calculateEmployeeWithdrawalBalance(ctx);

  assert.equal(result.accrual.accruedEarnings, 640);
  assert.equal(result.deductions.totalDebt, 0);
  assert.equal(result.netAvailableBalance, 640);
  assert.equal(result.balanceStatus, 'credit');
  assert.equal(result.canDisburseDirectly, true);
  assert.equal(result.maxDirectDisbursement, 640);
}

testHourlyEmployeeDirectDisbursement();
testDebitExceedingAccruals();
testMonthlyContractProration();
testActivePayrollItem();
console.log('employee-withdrawal-balance.engine.spec: ok');
