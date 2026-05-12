import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';
import type {
  HrCompensationPackage,
  HrAttendanceRecord,
  HrContact,
  HrContract,
  HrDocument,
  HrEmployee,
  HrEmployeeAsset,
  HrLedgerEntry,
  HrLeaveRequest,
  HrLeaveType,
  HrLoan,
  HrMasterDataRecord,
  HrPayrollRun,
  HrSummary,
  HrWithdrawalRow,
  HrWithdrawalSummary,
} from '@/types/domain';

type MasterKind = 'departments' | 'job-titles' | 'positions';

export interface HrListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  employeeId?: string | number;
  period?: string;
  month?: string;
  from?: string;
  to?: string;
  status?: string;
}

interface MasterResponse {
  rows?: HrMasterDataRecord[];
  summary?: { totalItems?: number };
}

interface EmployeesResponse {
  employees?: HrEmployee[];
  summary?: { totalItems?: number; activeCount?: number };
}

interface LoansResponse {
  loans?: HrLoan[];
  summary?: { totalItems?: number; outstandingAmount?: number };
}

interface WithdrawalsResponse {
  rows?: HrWithdrawalRow[];
  summary?: HrWithdrawalSummary;
}

interface PayrollRunsResponse {
  runs?: HrPayrollRun[];
  summary?: { totalItems?: number };
}

interface PayrollRunResponse {
  run?: HrPayrollRun;
}

interface AttendanceResponse {
  rows?: HrAttendanceRecord[];
  summary?: {
    totalItems?: number;
    presentCount?: number;
    absentCount?: number;
    lateCount?: number;
    leaveCount?: number;
    unmarkedCount?: number;
  };
}

interface LeaveTypesResponse {
  rows?: HrLeaveType[];
  summary?: { totalItems?: number; activeCount?: number };
}

interface LeaveRequestsResponse {
  requests?: HrLeaveRequest[];
  summary?: {
    totalItems?: number;
    pendingCount?: number;
    approvedCount?: number;
    rejectedCount?: number;
    cancelledCount?: number;
  };
}

interface EmployeeAssetsResponse {
  assets?: HrEmployeeAsset[];
  summary?: {
    totalItems?: number;
    assignedCount?: number;
    returnedCount?: number;
    lostCount?: number;
    damagedCount?: number;
  };
}

interface RowsResponse<T> {
  rows?: T[];
}

interface ProfileResponse {
  employee?: HrEmployee;
  contacts?: HrContact[];
  documents?: HrDocument[];
  contracts?: HrContract[];
  compensation?: HrCompensationPackage[];
  loans?: HrLoan[];
  ledger?: HrLedgerEntry[];
}

type HrApiDateRecord = Record<string, unknown>;

function apiText(value: unknown): string {
  return String(value || '').trim();
}

function apiPick(row: HrApiDateRecord, keys: string[]): string {
  for (const key of keys) {
    const value = apiText(row[key]);
    if (value) return value;
  }
  return '';
}

function normalizeApiDateOnly(value: unknown): string {
  const text = apiText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function normalizeApiDateTime(value: unknown): string {
  const text = apiText(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) return `${match[1]} ${match[2]}:${match[3]}`;
  const dateOnly = normalizeApiDateOnly(text);
  return dateOnly ? `${dateOnly} 00:00` : '';
}

function normalizeHrLoanRow(row: HrLoan | HrApiDateRecord): HrLoan {
  const source = row as HrApiDateRecord;
  return {
    ...(row as HrLoan),
    issueDate: normalizeApiDateOnly(apiPick(source, ['issueDate', 'issue_date', 'issue_date_text'])) || (row as HrLoan).issueDate || '',
    firstDueDate: normalizeApiDateOnly(apiPick(source, ['firstDueDate', 'first_due_date', 'first_due_date_text'])) || (row as HrLoan).firstDueDate || '',
    salaryDueDate: normalizeApiDateOnly(apiPick(source, ['salaryDueDate', 'salary_due_date', 'salary_due_date_text'])) || (row as HrLoan).salaryDueDate || '',
    createdAt: normalizeApiDateTime(apiPick(source, ['createdAt', 'created_at', 'created_at_text'])) || (row as HrLoan).createdAt || '',
    updatedAt: normalizeApiDateTime(apiPick(source, ['updatedAt', 'updated_at', 'updated_at_text'])) || (row as HrLoan).updatedAt || '',
    approvedAt: normalizeApiDateTime(apiPick(source, ['approvedAt', 'approved_at', 'approved_at_text'])) || (row as HrLoan).approvedAt || '',
    disbursedAt: normalizeApiDateTime(apiPick(source, ['disbursedAt', 'disbursed_at', 'disbursed_at_text'])) || (row as HrLoan).disbursedAt || '',
    paidAt: normalizeApiDateTime(apiPick(source, ['paidAt', 'paid_at', 'paid_at_text'])) || (row as HrLoan).paidAt || '',
  };
}

function normalizeHrWithdrawalRow(row: HrWithdrawalRow | HrApiDateRecord): HrWithdrawalRow {
  const source = row as HrApiDateRecord;
  const movementAt = normalizeApiDateTime(apiPick(source, [
    'movementAt',
    'movement_at',
    'movement_at_text',
    'date',
    'paidAt',
    'paid_at',
    'paid_at_text',
    'disbursedAt',
    'disbursed_at',
    'disbursed_at_text',
    'createdAt',
    'created_at',
    'created_at_text',
    'issueDate',
    'issue_date',
    'issue_date_text',
  ]));
  return {
    ...(row as HrWithdrawalRow),
    movementAt: movementAt || null,
    date: movementAt || null,
    loanId: apiPick(source, ['loanId', 'loan_id', 'referenceId', 'reference_id']) || (row as HrWithdrawalRow).loanId || '',
    referenceId: apiPick(source, ['referenceId', 'reference_id', 'loanId', 'loan_id']) || (row as HrWithdrawalRow).referenceId || '',
    repaymentMethod: apiPick(source, ['repaymentMethod', 'repayment_method']) || (row as HrWithdrawalRow).repaymentMethod || '',
  };
}

function normalizeHrEmployeeRow(row: HrEmployee | HrApiDateRecord): HrEmployee {
  const source = row as HrApiDateRecord;
  return {
    ...(row as HrEmployee),
    nationalId: apiPick(source, ['nationalId', 'national_id']) || (row as HrEmployee).nationalId || '',
  };
}

function normalizeHrAttendanceRow(row: HrAttendanceRecord | HrApiDateRecord): HrAttendanceRecord {
  const source = row as HrApiDateRecord;
  return {
    ...(row as HrAttendanceRecord),
    id: apiPick(source, ['id']) || (row as HrAttendanceRecord).id || '',
    employeeId: apiPick(source, ['employeeId', 'employee_id']) || (row as HrAttendanceRecord).employeeId || '',
    employeeNo: apiPick(source, ['employeeNo', 'employee_no']) || (row as HrAttendanceRecord).employeeNo || '',
    employeeName: apiPick(source, ['employeeName', 'employee_name']) || (row as HrAttendanceRecord).employeeName || '',
    departmentName: apiPick(source, ['departmentName', 'department_name']) || (row as HrAttendanceRecord).departmentName || '',
    jobTitleName: apiPick(source, ['jobTitleName', 'job_title_name']) || (row as HrAttendanceRecord).jobTitleName || '',
    workDate: normalizeApiDateOnly(apiPick(source, ['workDate', 'work_date', 'work_date_text'])) || (row as HrAttendanceRecord).workDate || '',
    status: apiPick(source, ['status']) || (row as HrAttendanceRecord).status || '',
    checkInAt: normalizeApiDateTime(apiPick(source, ['checkInAt', 'check_in_at', 'check_in_at_text'])) || (row as HrAttendanceRecord).checkInAt || '',
    checkOutAt: normalizeApiDateTime(apiPick(source, ['checkOutAt', 'check_out_at', 'check_out_at_text'])) || (row as HrAttendanceRecord).checkOutAt || '',
    source: apiPick(source, ['source']) || (row as HrAttendanceRecord).source || '',
    notes: apiPick(source, ['notes']) || (row as HrAttendanceRecord).notes || '',
  };
}

function normalizeHrLeaveTypeRow(row: HrLeaveType | HrApiDateRecord): HrLeaveType {
  const source = row as HrApiDateRecord;
  const isPaidValue = source.is_paid ?? source.isPaid ?? (row as HrLeaveType).isPaid;
  const isActiveValue = source.is_active ?? source.isActive ?? (row as HrLeaveType).isActive;
  return {
    ...(row as HrLeaveType),
    id: apiPick(source, ['id']) || (row as HrLeaveType).id || '',
    name: apiPick(source, ['name']) || (row as HrLeaveType).name || '',
    code: apiPick(source, ['code']) || (row as HrLeaveType).code || '',
    description: apiPick(source, ['description']) || (row as HrLeaveType).description || '',
    isPaid: isPaidValue === undefined ? true : Boolean(isPaidValue),
    isActive: isActiveValue === undefined ? true : Boolean(isActiveValue),
  };
}

function normalizeHrLeaveRequestRow(row: HrLeaveRequest | HrApiDateRecord): HrLeaveRequest {
  const source = row as HrApiDateRecord;
  return {
    ...(row as HrLeaveRequest),
    id: apiPick(source, ['id']) || (row as HrLeaveRequest).id || '',
    employeeId: apiPick(source, ['employeeId', 'employee_id']) || (row as HrLeaveRequest).employeeId || '',
    employeeNo: apiPick(source, ['employeeNo', 'employee_no']) || (row as HrLeaveRequest).employeeNo || '',
    employeeName: apiPick(source, ['employeeName', 'employee_name']) || (row as HrLeaveRequest).employeeName || '',
    departmentName: apiPick(source, ['departmentName', 'department_name']) || (row as HrLeaveRequest).departmentName || '',
    jobTitleName: apiPick(source, ['jobTitleName', 'job_title_name']) || (row as HrLeaveRequest).jobTitleName || '',
    leaveTypeId: apiPick(source, ['leaveTypeId', 'leave_type_id']) || (row as HrLeaveRequest).leaveTypeId || '',
    leaveTypeName: apiPick(source, ['leaveTypeName', 'leave_type_name']) || (row as HrLeaveRequest).leaveTypeName || '',
    leaveType: apiPick(source, ['leaveType', 'leave_type']) || (row as HrLeaveRequest).leaveType || '',
    startDate: normalizeApiDateOnly(apiPick(source, ['startDate', 'start_date', 'start_date_text'])) || (row as HrLeaveRequest).startDate || '',
    endDate: normalizeApiDateOnly(apiPick(source, ['endDate', 'end_date', 'end_date_text'])) || (row as HrLeaveRequest).endDate || '',
    daysCount: Number(source.days_count ?? source.daysCount ?? (row as HrLeaveRequest).daysCount ?? 0),
    status: apiPick(source, ['status']) || (row as HrLeaveRequest).status || '',
    reason: apiPick(source, ['reason']) || (row as HrLeaveRequest).reason || '',
    notes: apiPick(source, ['notes']) || (row as HrLeaveRequest).notes || '',
    decisionNotes: apiPick(source, ['decisionNotes', 'decision_notes']) || (row as HrLeaveRequest).decisionNotes || '',
    decidedBy: apiPick(source, ['decidedBy', 'decided_by']) || (row as HrLeaveRequest).decidedBy || '',
    decidedAt: normalizeApiDateTime(apiPick(source, ['decidedAt', 'decided_at', 'decided_at_text'])) || (row as HrLeaveRequest).decidedAt || '',
    createdAt: normalizeApiDateTime(apiPick(source, ['createdAt', 'created_at', 'created_at_text'])) || (row as HrLeaveRequest).createdAt || '',
  };
}

function normalizeHrEmployeeAssetRow(row: HrEmployeeAsset | HrApiDateRecord): HrEmployeeAsset {
  const source = row as HrApiDateRecord;
  return {
    ...(row as HrEmployeeAsset),
    id: apiPick(source, ['id']) || (row as HrEmployeeAsset).id || '',
    employeeId: apiPick(source, ['employeeId', 'employee_id']) || (row as HrEmployeeAsset).employeeId || '',
    employeeNo: apiPick(source, ['employeeNo', 'employee_no']) || (row as HrEmployeeAsset).employeeNo || '',
    employeeName: apiPick(source, ['employeeName', 'employee_name']) || (row as HrEmployeeAsset).employeeName || '',
    departmentName: apiPick(source, ['departmentName', 'department_name']) || (row as HrEmployeeAsset).departmentName || '',
    jobTitleName: apiPick(source, ['jobTitleName', 'job_title_name']) || (row as HrEmployeeAsset).jobTitleName || '',
    assetType: apiPick(source, ['assetType', 'asset_type']) || (row as HrEmployeeAsset).assetType || '',
    assetName: apiPick(source, ['assetName', 'asset_name']) || (row as HrEmployeeAsset).assetName || '',
    assetCode: apiPick(source, ['assetCode', 'asset_code']) || (row as HrEmployeeAsset).assetCode || '',
    serialNo: apiPick(source, ['serialNo', 'serial_no']) || (row as HrEmployeeAsset).serialNo || '',
    assignedAt: normalizeApiDateOnly(apiPick(source, ['assignedAt', 'assigned_at', 'assigned_at_text'])) || (row as HrEmployeeAsset).assignedAt || '',
    returnedAt: normalizeApiDateOnly(apiPick(source, ['returnedAt', 'returned_at', 'returned_at_text'])) || (row as HrEmployeeAsset).returnedAt || '',
    status: apiPick(source, ['status']) || (row as HrEmployeeAsset).status || '',
    notes: apiPick(source, ['notes']) || (row as HrEmployeeAsset).notes || '',
    returnNotes: apiPick(source, ['returnNotes', 'return_notes']) || (row as HrEmployeeAsset).returnNotes || '',
    createdAt: normalizeApiDateTime(apiPick(source, ['createdAt', 'created_at', 'created_at_text'])) || (row as HrEmployeeAsset).createdAt || '',
  };
}

export const hrApi = {
  summary: async () => (await http<{ summary?: HrSummary }>('/api/hr/summary')).summary || { employeeCount: 0, activeCount: 0, openLoans: 0, outstandingAmount: 0 },
  withdrawals: async (params: HrListParams = {}) => {
    const response = await http<WithdrawalsResponse>(`/api/hr/withdrawals${buildQueryString(params)}`);
    return { ...response, rows: (response.rows || []).map(normalizeHrWithdrawalRow) };
  },
  masterData: async (kind: MasterKind, params: HrListParams = {}) => http<MasterResponse>(`/api/hr/${kind}${buildQueryString(params)}`),
  saveMasterData: (kind: MasterKind, payload: unknown, id?: string) => http(`/api/hr/${kind}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  deactivateMasterData: (kind: MasterKind, id: string) => http(`/api/hr/${kind}/${id}`, { method: 'DELETE' }),
  employees: async (params: HrListParams = {}) => {
    const response = await http<EmployeesResponse>(`/api/hr/employees${buildQueryString(params)}`);
    return { ...response, employees: (response.employees || []).map(normalizeHrEmployeeRow) };
  },
  attendance: async (params: HrListParams & { date?: string; workDate?: string } = {}) => {
    const response = await http<AttendanceResponse>(`/api/hr/attendance${buildQueryString(params)}`);
    return { ...response, rows: (response.rows || []).map(normalizeHrAttendanceRow) };
  },
  saveAttendanceDay: (payload: unknown) => http<AttendanceResponse>('/api/hr/attendance', { method: 'POST', body: JSON.stringify(payload) }),
  saveAttendanceRecord: (payload: unknown) => http<AttendanceResponse>('/api/hr/attendance/record', { method: 'POST', body: JSON.stringify(payload) }),
  leaveTypes: async (params: HrListParams = {}) => {
    const response = await http<LeaveTypesResponse>(`/api/hr/leave-types${buildQueryString(params)}`);
    return { ...response, rows: (response.rows || []).map(normalizeHrLeaveTypeRow) };
  },
  saveLeaveType: (payload: unknown, id?: string) => http<LeaveTypesResponse>(`/api/hr/leave-types${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  leaveRequests: async (params: HrListParams = {}) => {
    const response = await http<LeaveRequestsResponse>(`/api/hr/leave-requests${buildQueryString(params)}`);
    return { ...response, requests: (response.requests || []).map(normalizeHrLeaveRequestRow) };
  },
  createLeaveRequest: (payload: unknown) => http<LeaveRequestsResponse>('/api/hr/leave-requests', { method: 'POST', body: JSON.stringify(payload) }),
  approveLeaveRequest: (id: string, payload: unknown = {}) => http<LeaveRequestsResponse>(`/api/hr/leave-requests/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) }),
  rejectLeaveRequest: (id: string, payload: unknown = {}) => http<LeaveRequestsResponse>(`/api/hr/leave-requests/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelLeaveRequest: (id: string, payload: unknown = {}) => http<LeaveRequestsResponse>(`/api/hr/leave-requests/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) }),
  employeeAssets: async (params: HrListParams = {}) => {
    const response = await http<EmployeeAssetsResponse>(`/api/hr/assets${buildQueryString(params)}`);
    return { ...response, assets: (response.assets || []).map(normalizeHrEmployeeAssetRow) };
  },
  saveEmployeeAsset: (payload: unknown, id?: string) => http<EmployeeAssetsResponse>(`/api/hr/assets${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  returnEmployeeAsset: (id: string, payload: unknown = {}) => http<EmployeeAssetsResponse>(`/api/hr/assets/${id}/return`, { method: 'POST', body: JSON.stringify(payload) }),
  markEmployeeAssetLost: (id: string, payload: unknown = {}) => http<EmployeeAssetsResponse>(`/api/hr/assets/${id}/lost`, { method: 'POST', body: JSON.stringify(payload) }),
  markEmployeeAssetDamaged: (id: string, payload: unknown = {}) => http<EmployeeAssetsResponse>(`/api/hr/assets/${id}/damaged`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelEmployeeAsset: (id: string, payload: unknown = {}) => http<EmployeeAssetsResponse>(`/api/hr/assets/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) }),
  saveEmployee: (payload: unknown, id?: string) => http(`/api/hr/employees${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  deactivateEmployee: (id: string) => http(`/api/hr/employees/${id}`, { method: 'DELETE' }),
  profile: async (id: string) => {
    const response = await http<ProfileResponse>(`/api/hr/employees/${id}`);
    return { ...response, employee: response.employee ? normalizeHrEmployeeRow(response.employee) : response.employee };
  },
  contacts: (employeeId: string) => http<RowsResponse<HrContact>>(`/api/hr/employees/${employeeId}/contacts`),
  saveContact: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/contacts${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  documents: (employeeId: string) => http<RowsResponse<HrDocument>>(`/api/hr/employees/${employeeId}/documents`),
  saveDocument: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/documents${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  contracts: (employeeId: string) => http<RowsResponse<HrContract>>(`/api/hr/employees/${employeeId}/contracts`),
  saveContract: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/contracts${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  compensation: (employeeId: string) => http<RowsResponse<HrCompensationPackage>>(`/api/hr/employees/${employeeId}/compensation`),
  saveCompensation: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/compensation${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  loans: async (params: HrListParams = {}) => {
    const response = await http<LoansResponse>(`/api/hr/loans${buildQueryString(params)}`);
    return { ...response, loans: (response.loans || []).map(normalizeHrLoanRow) };
  },
  saveLoan: (payload: unknown, id?: string) => http(`/api/hr/loans${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  approveLoan: (id: string) => http(`/api/hr/loans/${id}/approve`, { method: 'POST' }),
  disburseLoan: (id: string) => http(`/api/hr/loans/${id}/disburse`, { method: 'POST' }),
  repayLoan: (id: string, payload: unknown) => http(`/api/hr/loans/${id}/repayments`, { method: 'POST', body: JSON.stringify(payload) }),
  ledger: (employeeId: string) => http<RowsResponse<HrLedgerEntry>>(`/api/hr/employees/${employeeId}/ledger`),
  payrollRuns: (params: HrListParams = {}) => http<PayrollRunsResponse>(`/api/hr/payroll-runs${buildQueryString({ month: params.month, page: params.page, pageSize: params.pageSize })}`),
  createPayrollRun: (payload: unknown) => http<PayrollRunResponse>('/api/hr/payroll-runs', { method: 'POST', body: JSON.stringify(payload) }),
  payrollRun: (id: string) => http<PayrollRunResponse>(`/api/hr/payroll-runs/${id}`),
  recalculatePayrollRun: (id: string) => http<PayrollRunResponse>(`/api/hr/payroll-runs/${id}/recalculate`, { method: 'POST' }),
  reviewPayrollRun: (id: string) => http<PayrollRunResponse>(`/api/hr/payroll-runs/${id}/review`, { method: 'POST' }),
  approvePayrollRun: (id: string) => http<PayrollRunResponse>(`/api/hr/payroll-runs/${id}/approve`, { method: 'POST' }),
  cancelPayrollRun: (id: string) => http<PayrollRunResponse>(`/api/hr/payroll-runs/${id}/cancel`, { method: 'POST' }),
  updatePayrollRunItem: (id: string, payload: unknown) => http<PayrollRunResponse>(`/api/hr/payroll-run-items/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  createPayrollAdjustment: (id: string, payload: unknown) => http<PayrollRunResponse>(`/api/hr/payroll-run-items/${id}/adjustments`, { method: 'POST', body: JSON.stringify(payload) }),
  deletePayrollAdjustment: (id: string) => http<PayrollRunResponse>(`/api/hr/payroll-item-adjustments/${id}`, { method: 'DELETE' }),
};
