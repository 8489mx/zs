export interface HrPayrollAdjustment {
  id: string;
  payrollItemId: string;
  adjustmentType: 'allowance' | 'deduction' | string;
  label: string;
  amount: number;
  notes?: string;
  createdAt?: string;
}

export interface HrPayrollRunItem {
  id: string;
  runId: string;
  employeeId: string;
  employeeName?: string;
  employeeNo?: string;
  contractId?: string;
  baseSalary: number;
  allowanceAmount: number;
  deductionAmount: number;
  loanDeductionAmount: number;
  grossPay: number;
  netPay: number;
  status: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  adjustments?: HrPayrollAdjustment[];
}

export interface HrPayrollRun {
  id: string;
  periodMonth: string;
  status: string;
  notes?: string;
  createdBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  createdAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  updatedAt?: string;
  itemCount?: number;
  totalBaseSalary: number;
  totalAllowanceAmount: number;
  totalDeductionAmount: number;
  totalLoanDeductionAmount: number;
  totalGrossPay: number;
  totalNetPay: number;
  items?: HrPayrollRunItem[];
}
