import { describe, it, expect } from 'vitest';
import { calculateEmployeeWithdrawalBalance, EmployeeWithdrawalContext } from './employee-withdrawal-balance.engine';

describe('EmployeeWithdrawalBalanceEngine', () => {
  it('calculates hourly employee with accrued earnings and direct cashier disbursement', () => {
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

    expect(result.accrual.workedHours).toBe(14);
    expect(result.accrual.accruedEarnings).toBe(700);
    expect(result.deductions.currentCycleWithdrawals).toBe(200);
    expect(result.netAvailableBalance).toBe(500); // 700 - 200 = 500 EGP
    expect(result.balanceStatus).toBe('credit');
    expect(result.canDisburseDirectly).toBe(true);
    expect(result.maxDirectDisbursement).toBe(500);
  });

  it('marks employee as debit / not eligible for direct disbursement when loans exceed accruals', () => {
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

    expect(result.accrual.workedHours).toBe(5);
    expect(result.accrual.accruedEarnings).toBe(200);
    expect(result.deductions.totalDebt).toBe(500);
    expect(result.netAvailableBalance).toBe(-300); // 200 - 500 = -300
    expect(result.balanceStatus).toBe('debit');
    expect(result.canDisburseDirectly).toBe(false);
    expect(result.maxDirectDisbursement).toBe(0);
  });

  it('prorates monthly contract employee and accounts for unpaid previous payroll', () => {
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
    expect(result.accrual.accruedEarnings).toBe(2000);
    expect(result.unpaidApprovedPayroll).toBe(1500);
    expect(result.netAvailableBalance).toBe(3500); // 2000 + 1500 = 3500
    expect(result.balanceStatus).toBe('credit');
    expect(result.canDisburseDirectly).toBe(true);
    expect(result.maxDirectDisbursement).toBe(3500);
  });

  it('recognizes earned salary in active draft/reviewed payroll run as credit before loan disbursement', () => {
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

    expect(result.accrual.accruedEarnings).toBe(640);
    expect(result.deductions.totalDebt).toBe(0);
    expect(result.netAvailableBalance).toBe(640);
    expect(result.balanceStatus).toBe('credit');
    expect(result.canDisburseDirectly).toBe(true);
    expect(result.maxDirectDisbursement).toBe(640);
  });
});
