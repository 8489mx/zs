export interface HrAttendanceRecord {
  id?: string;
  employeeId: string;
  employeeNo?: string;
  employeeName?: string;
  departmentName?: string;
  jobTitleName?: string;
  workDate: string;
  status?: string;
  checkInAt?: string;
  checkOutAt?: string;
  source?: 'manual' | 'import' | string;
  notes?: string;
}

export interface HrAttendanceException {
  id: string;
  employeeId: string;
  employeeNo?: string;
  employeeName?: string;
  workDate: string;
  exceptionType:
    | 'early_check_in'
    | 'late_check_in'
    | 'early_check_out'
    | 'late_check_out'
    | 'missing_check_in'
    | 'missing_check_out'
    | string;
  scheduledTime?: string;
  actualTime?: string;
  durationMinutes: number;
  approvedDurationMinutes?: number | null;
  status: 'pending' | 'approved' | 'skipped' | 'auto_calculated' | 'needs_review' | string;
  note?: string;
}
