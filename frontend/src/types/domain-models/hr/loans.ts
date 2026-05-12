export interface HrLoan {
  id: string;
  employeeId: string;
  employeeName?: string;
  loanNo?: string;
  loanType: string;
  principalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentCount: number;
  installmentAmount: number;
  repaymentMode?: 'deduct_next_salary' | 'monthly_salary_installment' | 'manual_cash' | string;
  monthlyInstallmentAmount?: number | null;
  status: string;
  issueDate: string;
  firstDueDate?: string;
  salaryDueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  disbursedAt?: string;
  paidAt?: string;
  branchId?: string;
  locationId?: string;
  notes?: string;
}

export interface HrLedgerEntry {
  id: string;
  employeeId: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  repaymentMethod?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface HrWithdrawalRow {
  id: string;
  movementAt: string | null;
  date?: string | null;
  employeeId?: string;
  employeeName?: string;
  loanId?: string;
  referenceId?: string;
  type: string;
  amount: number;
  repaymentMode: string;
  repaymentMethod?: string;
  status: string;
  remainingAmount: number;
  note?: string;
}

export interface HrWithdrawalSummary {
  employeeId: string;
  employeeName: string;
  from: string;
  to: string;
  totalWithdrawals: number;
  totalManualCashRepayments: number;
  totalSalaryDeductionDue: number;
  totalRemaining: number;
  openLoanCount: number;
}
