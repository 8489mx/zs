import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { hrApi, type HrListParams } from '@/features/hr/api/hr.api';

function paramsKey(params: HrListParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 25,
    search: params.search || '',
    employeeId: params.employeeId || '',
    period: params.period || '',
    month: params.month || '',
    from: params.from || '',
    to: params.to || '',
    status: params.status || '',
  });
}

export function useHrWorkspace(params: HrListParams) {
  const key = paramsKey(params);
  return {
    summary: useQuery({ queryKey: queryKeys.hrSummary, queryFn: hrApi.summary }),
    employees: useQuery({ queryKey: queryKeys.hrEmployees(key), queryFn: () => hrApi.employees(params), placeholderData: (previous) => previous }),
    departments: useQuery({ queryKey: queryKeys.hrMasterData('departments'), queryFn: () => hrApi.masterData('departments') }),
    jobTitles: useQuery({ queryKey: queryKeys.hrMasterData('job-titles'), queryFn: () => hrApi.masterData('job-titles') }),
    positions: useQuery({ queryKey: queryKeys.hrMasterData('positions'), queryFn: () => hrApi.masterData('positions') }),
    loans: useQuery({ queryKey: queryKeys.hrLoans(key), queryFn: () => hrApi.loans(params), placeholderData: (previous) => previous }),
    withdrawals: useQuery({ queryKey: queryKeys.hrWithdrawals(key), queryFn: () => hrApi.withdrawals(params), enabled: Boolean(params.employeeId), placeholderData: (previous) => previous }),
    payrollRuns: useQuery({ queryKey: queryKeys.hrPayrollRuns(key), queryFn: () => hrApi.payrollRuns(params), placeholderData: (previous) => previous }),
  };
}

export function useHrProfile(employeeId?: string) {
  return useQuery({
    queryKey: queryKeys.hrProfile(employeeId || ''),
    queryFn: () => hrApi.profile(employeeId || ''),
    enabled: Boolean(employeeId),
  });
}

export function useHrPayrollRun(runId?: string) {
  return useQuery({
    queryKey: queryKeys.hrPayrollRun(runId || ''),
    queryFn: () => hrApi.payrollRun(runId || ''),
    enabled: Boolean(runId),
  });
}

export function useHrAttendance(params: HrListParams & { date?: string; workDate?: string }) {
  const key = paramsKey(params);
  const dateKey = String(params.date || params.workDate || '');
  return useQuery({
    queryKey: ['hr', 'attendance', dateKey, key],
    queryFn: () => hrApi.attendance(params),
    placeholderData: (previous) => previous,
  });
}

export function useHrAttendanceExceptions(params: HrListParams & { date?: string; workDate?: string } = {}) {
  const key = paramsKey(params);
  const dateKey = String(params.date || params.workDate || '');
  return useQuery({
    queryKey: ['hr', 'attendance-exceptions', dateKey, key],
    queryFn: () => hrApi.attendanceExceptions(params),
    placeholderData: (previous) => previous,
  });
}

export function useHrLeaveTypes(params: HrListParams = {}) {
  const key = paramsKey(params);
  return useQuery({
    queryKey: ['hr', 'leave-types', key],
    queryFn: () => hrApi.leaveTypes(params),
    placeholderData: (previous) => previous,
  });
}

export function useHrLeaveRequests(params: HrListParams = {}) {
  const key = paramsKey(params);
  return useQuery({
    queryKey: ['hr', 'leave-requests', key],
    queryFn: () => hrApi.leaveRequests(params),
    placeholderData: (previous) => previous,
  });
}

export function useHrEmployeeAssets(params: HrListParams = {}) {
  const key = paramsKey(params);
  return useQuery({
    queryKey: ['hr', 'employee-assets', key],
    queryFn: () => hrApi.employeeAssets(params),
    placeholderData: (previous) => previous,
  });
}

export function useHrReportsSummary(params: HrListParams = {}) {
  const key = paramsKey(params);
  return useQuery({
    queryKey: ['hr', 'reports-summary', key],
    queryFn: () => hrApi.reportsSummary(params),
    placeholderData: (previous) => previous,
  });
}

export function useHrPayrollPolicies() { return useQuery({ queryKey: ['hr', 'payroll-policies'], queryFn: hrApi.getPayrollPolicies }); }

export function useHrMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll-policies'] });
    await queryClient.invalidateQueries({ queryKey: ['hr'] });
  };

  return {
    updatePayrollPolicies: useMutation({ mutationFn: hrApi.updatePayrollPolicies, onSuccess: invalidate }),
    saveEmployee: useMutation({ mutationFn: ({ id, payload }: { id?: string; payload: unknown }) => hrApi.saveEmployee(payload, id), onSuccess: invalidate }),
    saveContact: useMutation({ mutationFn: ({ employeeId, id, payload }: { employeeId: string; id?: string; payload: unknown }) => hrApi.saveContact(employeeId, payload, id), onSuccess: invalidate }),
    deactivateEmployee: useMutation({ mutationFn: (id: string) => hrApi.deactivateEmployee(id), onSuccess: invalidate }),
    saveMasterData: useMutation({ mutationFn: ({ kind, id, payload }: { kind: 'departments' | 'job-titles' | 'positions'; id?: string; payload: unknown }) => hrApi.saveMasterData(kind, payload, id), onSuccess: invalidate }),
    saveDocument: useMutation({ mutationFn: ({ employeeId, id, payload }: { employeeId: string; id?: string; payload: unknown }) => hrApi.saveDocument(employeeId, payload, id), onSuccess: invalidate }),
    saveContract: useMutation({ mutationFn: ({ employeeId, id, payload }: { employeeId: string; id?: string; payload: unknown }) => hrApi.saveContract(employeeId, payload, id), onSuccess: invalidate }),
    saveCompensation: useMutation({ mutationFn: ({ employeeId, id, payload }: { employeeId: string; id?: string; payload: unknown }) => hrApi.saveCompensation(employeeId, payload, id), onSuccess: invalidate }),
    saveAttendanceDay: useMutation({ mutationFn: (payload: unknown) => hrApi.saveAttendanceDay(payload), onSuccess: invalidate }),
    saveAttendanceRecord: useMutation({ mutationFn: (payload: unknown) => hrApi.saveAttendanceRecord(payload), onSuccess: invalidate }),
    approveAttendanceException: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.approveAttendanceException(id, payload || {}), onSuccess: invalidate }),
    skipAttendanceException: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.skipAttendanceException(id, payload || {}), onSuccess: invalidate }),
    saveLeaveType: useMutation({ mutationFn: ({ id, payload }: { id?: string; payload: unknown }) => hrApi.saveLeaveType(payload, id), onSuccess: invalidate }),
    createLeaveRequest: useMutation({ mutationFn: (payload: unknown) => hrApi.createLeaveRequest(payload), onSuccess: invalidate }),
    approveLeaveRequest: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.approveLeaveRequest(id, payload || {}), onSuccess: invalidate }),
    rejectLeaveRequest: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.rejectLeaveRequest(id, payload || {}), onSuccess: invalidate }),
    cancelLeaveRequest: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.cancelLeaveRequest(id, payload || {}), onSuccess: invalidate }),
    saveEmployeeAsset: useMutation({ mutationFn: ({ id, payload }: { id?: string; payload: unknown }) => hrApi.saveEmployeeAsset(payload, id), onSuccess: invalidate }),
    returnEmployeeAsset: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.returnEmployeeAsset(id, payload || {}), onSuccess: invalidate }),
    markEmployeeAssetLost: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.markEmployeeAssetLost(id, payload || {}), onSuccess: invalidate }),
    markEmployeeAssetDamaged: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.markEmployeeAssetDamaged(id, payload || {}), onSuccess: invalidate }),
    cancelEmployeeAsset: useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => hrApi.cancelEmployeeAsset(id, payload || {}), onSuccess: invalidate }),
    saveLoan: useMutation({ mutationFn: ({ id, payload }: { id?: string; payload: unknown }) => hrApi.saveLoan(payload, id), onSuccess: invalidate }),
    approveLoan: useMutation({ mutationFn: (id: string) => hrApi.approveLoan(id), onSuccess: invalidate }),
    disburseLoan: useMutation({ mutationFn: (id: string) => hrApi.disburseLoan(id), onSuccess: invalidate }),
    repayLoan: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: unknown }) => hrApi.repayLoan(id, payload), onSuccess: invalidate }),
    createPayrollRun: useMutation({ mutationFn: (payload: unknown) => hrApi.createPayrollRun(payload), onSuccess: invalidate }),
    recalculatePayrollRun: useMutation({ mutationFn: (id: string) => hrApi.recalculatePayrollRun(id), onSuccess: invalidate }),
    reviewPayrollRun: useMutation({ mutationFn: (id: string) => hrApi.reviewPayrollRun(id), onSuccess: invalidate }),
    applyAttendanceDeductions: useMutation({ mutationFn: (id: string) => hrApi.applyAttendanceDeductions(id), onSuccess: invalidate }),
    approvePayrollRun: useMutation({ mutationFn: (id: string) => hrApi.approvePayrollRun(id), onSuccess: invalidate }),
    cancelPayrollRun: useMutation({ mutationFn: (id: string) => hrApi.cancelPayrollRun(id), onSuccess: invalidate }),
    updatePayrollRunItem: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: unknown }) => hrApi.updatePayrollRunItem(id, payload), onSuccess: invalidate }),
    createPayrollAdjustment: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: unknown }) => hrApi.createPayrollAdjustment(id, payload), onSuccess: invalidate }),
    deletePayrollAdjustment: useMutation({ mutationFn: (id: string) => hrApi.deletePayrollAdjustment(id), onSuccess: invalidate }),
  };
}

