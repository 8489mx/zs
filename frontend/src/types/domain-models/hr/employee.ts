export interface HrEmployee {
  id: string;
  employeeNo?: string;
  nationalId?: string;
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
  compensationType?: 'monthly' | 'hourly' | string;
  hourlyRate?: number | null;
  expectedDailyHours?: number | null;
  scheduledCheckInTime?: string;
  scheduledCheckOutTime?: string;
  graceMinutes?: number;
  overtimePolicy?: 'review_only' | 'disabled' | 'auto_approved' | string;
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

export interface HrEmployeeAdjustment {
  id: string;
  employeeId: string;
  adjustmentType: 'allowance' | 'deduction' | string;
  amountType: 'money' | 'days' | 'hours' | string;
  amount: number;
  date: string;
  reason?: string;
  status: 'pending' | 'applied' | string;
  appliedInRunId?: string | null;
}
