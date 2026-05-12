import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';
import type {
  HrCompensationPackage,
  HrContact,
  HrContract,
  HrDocument,
  HrLedgerEntry,
  HrSummary,
} from '@/types/domain';
import {
  normalizeHrAttendanceRow,
  normalizeHrEmployeeAssetRow,
  normalizeHrEmployeeRow,
  normalizeHrLeaveRequestRow,
  normalizeHrLeaveTypeRow,
  normalizeHrLoanRow,
  normalizeHrWithdrawalRow,
} from './hr-api.normalizers';
import type {
  AttendanceResponse,
  EmployeeAssetsResponse,
  EmployeesResponse,
  HrReportsSummaryResponse,
  LeaveRequestsResponse,
  LeaveTypesResponse,
  LoansResponse,
  MasterResponse,
  PayrollRunResponse,
  PayrollRunsResponse,
  ProfileResponse,
  RowsResponse,
  WithdrawalsResponse,
} from './hr-api.types';

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
  reportsSummary: (params: HrListParams = {}) => http<HrReportsSummaryResponse>(`/api/hr/reports/summary${buildQueryString({ from: params.from, to: params.to, month: params.month })}`),
};
