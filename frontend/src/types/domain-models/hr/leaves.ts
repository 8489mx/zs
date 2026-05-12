export interface HrLeaveType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isPaid?: boolean;
  isActive?: boolean;
}

export interface HrLeaveRequest {
  id: string;
  employeeId: string;
  employeeNo?: string;
  employeeName?: string;
  departmentName?: string;
  jobTitleName?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: string;
  reason?: string;
  notes?: string;
  decisionNotes?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt?: string;
}
