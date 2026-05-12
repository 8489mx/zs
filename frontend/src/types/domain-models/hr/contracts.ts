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
