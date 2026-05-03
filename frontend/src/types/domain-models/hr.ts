export interface HrMasterDataRecord {
  id: string;
  name: string;
  code?: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleId?: string;
  jobTitleName?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  isActive?: boolean;
}

export interface HrEmployee {
  id: string;
  employeeNo?: string;
  firstName: string;
  lastName?: string;
  displayName: string;
  status: string;
  userId?: string;
  username?: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleId?: string;
  jobTitleName?: string;
  positionId?: string;
  positionName?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  hireDate?: string;
  notes?: string;
}

export interface HrContact {
  id: string;
  employeeId: string;
  contactType: string;
  value: string;
  label?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface HrDocument {
  id: string;
  employeeId: string;
  title: string;
  documentType?: string;
  fileUrl?: string;
  expiryDate?: string;
  notes?: string;
  uploadedByName?: string;
}

export interface HrContract {
  id: string;
  employeeId: string;
  contractNo?: string;
  contractType?: string;
  status: string;
  startDate: string;
  endDate?: string;
  baseSalary?: number;
  currency?: string;
  notes?: string;
}

export interface HrCompensationPackage {
  id: string;
  employeeId: string;
  contractId?: string;
  packageName?: string;
  allowanceAmount?: number;
  deductionAmount?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

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
  date: string;
  type: string;
  amount: number;
  repaymentMode: string;
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

export interface HrSummary {
  employeeCount: number;
  activeCount: number;
  openLoans: number;
  outstandingAmount: number;
}
