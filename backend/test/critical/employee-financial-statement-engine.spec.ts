import { describe, it, expect } from 'vitest';
import {
  buildEmployeeFinancialStatement,
  EmployeeFinancialProfile,
  FinancialPayrollItem,
  FinancialLoanRecord,
  FinancialAdjustmentRecord,
  FinancialLedgerRecord,
} from '../../src/modules/hr/engines/employee-financial-statement.engine';

describe('Employee Financial Statement & Running Ledger Engine', () => {
  const sampleEmployee: EmployeeFinancialProfile = {
    id: 101,
    employeeNo: 'EMP-001',
    displayName: 'أحمد محمود',
    hireDate: '2026-01-01',
    status: 'active',
    baseSalary: 6000,
    departmentName: 'المبيعات',
    jobTitleName: 'كاشير ومبيعات',
  };

  it('correctly calculates position when employee takes cashier cash advance and receives salary', () => {
    // 1. Employee takes 1,000 advance from cashier shift on 2026-10-05
    const loans: FinancialLoanRecord[] = [
      {
        id: 1,
        loanNo: 'LOAN-261005-0001',
        loanType: 'advance',
        principalAmount: 1000,
        paidAmount: 1000,
        remainingAmount: 0,
        status: 'repaid',
        notes: 'سلفة سريعة [وردية كاشير #12]',
        disbursedAt: '2026-10-05 14:30:00',
        createdByName: 'كاشير أحمد',
      },
    ];

    // 2. Monthly payroll is processed on 2026-10-28: Gross 6000, Advance deducted 1000, Net paid 5000
    const payrollItems: FinancialPayrollItem[] = [
      {
        id: 50,
        runId: 10,
        periodMonth: '2026-10',
        runStatus: 'paid',
        baseSalary: 6000,
        allowanceAmount: 0,
        grossPay: 6000,
        deductionAmount: 0,
        penaltyDeduction: 0,
        loanDeductionAmount: 1000,
        netPay: 5000,
        paidAt: '2026-10-28 17:00:00',
        paymentChannel: 'cash',
        paidByName: 'المدير المالي',
      },
    ];

    const result = buildEmployeeFinancialStatement({
      employee: sampleEmployee,
      payrollItems,
      loans,
      adjustments: [],
      ledger: [],
    });

    // Summary checks
    expect(result.summary.totalWithdrawals).toBe(1000);
    expect(result.summary.totalGrossEarnings).toBe(6000);
    expect(result.summary.totalPaidSalaries).toBe(5000);
    expect(result.summary.totalRepayments).toBe(1000);
    expect(result.summary.remainingLoanDebt).toBe(0);
    expect(result.summary.netFinancialBalance).toBe(0);
    expect(result.summary.balanceStatus).toBe('settled');

    // Transactions check: 3 transactions sorted chronologically (advance, gross entitlement, net payout)
    expect(result.transactions.length).toBe(3);
    // Newest first for display
    expect(result.transactions[0].category).toBe('salary_payout');
    expect(result.transactions[0].debit).toBe(5000);
    expect(result.transactions[0].runningBalance).toBe(0);

    expect(result.transactions[1].category).toBe('salary_entitlement');
    expect(result.transactions[1].credit).toBe(6000);
    expect(result.transactions[1].runningBalance).toBe(5000);

    expect(result.transactions[2].category).toBe('withdrawal');
    expect(result.transactions[2].debit).toBe(1000);
    expect(result.transactions[2].runningBalance).toBe(-1000);
  });

  it('correctly reports debit position when employee has outstanding cashier advances', () => {
    // Employee took 200 and 300 from cashier drawer
    const loans: FinancialLoanRecord[] = [
      {
        id: 2,
        loanNo: 'LOAN-261010-0002',
        loanType: 'advance',
        principalAmount: 200,
        paidAmount: 0,
        remainingAmount: 200,
        status: 'paid',
        notes: 'سلفة سريعة [وردية كاشير #15]',
        disbursedAt: '2026-10-10 11:00:00',
        createdByName: 'كاشير عمر',
      },
      {
        id: 3,
        loanNo: 'LOAN-261012-0003',
        loanType: 'advance',
        principalAmount: 300,
        paidAmount: 0,
        remainingAmount: 300,
        status: 'paid',
        notes: 'سلفة مواصلات [وردية كاشير #17]',
        disbursedAt: '2026-10-12 16:00:00',
        createdByName: 'كاشير عمر',
      },
    ];

    const result = buildEmployeeFinancialStatement({
      employee: sampleEmployee,
      payrollItems: [],
      loans,
      adjustments: [],
      ledger: [],
    });

    expect(result.summary.totalWithdrawals).toBe(500);
    expect(result.summary.remainingLoanDebt).toBe(500);
    expect(result.summary.netFinancialBalance).toBe(-500);
    expect(result.summary.balanceStatus).toBe('debit');
    expect(result.transactions.length).toBe(2);
  });

  it('factors in administrative penalties and deductions', () => {
    const adjustments: FinancialAdjustmentRecord[] = [
      {
        id: 99,
        adjustmentType: 'deduction',
        amount: 150,
        date: '2026-10-15',
        reason: 'جزاء تأخير متكرر',
        status: 'pending',
        createdByName: 'مسؤول الـ HR',
      },
    ];

    const result = buildEmployeeFinancialStatement({
      employee: sampleEmployee,
      payrollItems: [],
      loans: [],
      adjustments,
      ledger: [],
    });

    expect(result.summary.totalPenalties).toBe(150);
    expect(result.summary.netFinancialBalance).toBe(-150);
    expect(result.summary.balanceStatus).toBe('debit');
    expect(result.transactions[0].category).toBe('penalty');
    expect(result.transactions[0].debit).toBe(150);
  });
});
