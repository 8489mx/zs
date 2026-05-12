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
