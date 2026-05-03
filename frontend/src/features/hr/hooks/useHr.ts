import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { hrApi, type HrListParams } from '@/features/hr/api/hr.api';

function paramsKey(params: HrListParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 25,
    search: params.search || '',
    employeeId: params.employeeId || '',
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
  };
}

export function useHrProfile(employeeId?: string) {
  return useQuery({
    queryKey: queryKeys.hrProfile(employeeId || ''),
    queryFn: () => hrApi.profile(employeeId || ''),
    enabled: Boolean(employeeId),
  });
}

export function useHrMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['hr'] });
  };

  return {
    saveEmployee: useMutation({ mutationFn: ({ id, payload }: { id?: string; payload: unknown }) => hrApi.saveEmployee(payload, id), onSuccess: invalidate }),
    deactivateEmployee: useMutation({ mutationFn: (id: string) => hrApi.deactivateEmployee(id), onSuccess: invalidate }),
    saveMasterData: useMutation({ mutationFn: ({ kind, id, payload }: { kind: 'departments' | 'job-titles' | 'positions'; id?: string; payload: unknown }) => hrApi.saveMasterData(kind, payload, id), onSuccess: invalidate }),
    saveDocument: useMutation({ mutationFn: ({ employeeId, id, payload }: { employeeId: string; id?: string; payload: unknown }) => hrApi.saveDocument(employeeId, payload, id), onSuccess: invalidate }),
    saveContract: useMutation({ mutationFn: ({ employeeId, id, payload }: { employeeId: string; id?: string; payload: unknown }) => hrApi.saveContract(employeeId, payload, id), onSuccess: invalidate }),
    saveLoan: useMutation({ mutationFn: ({ id, payload }: { id?: string; payload: unknown }) => hrApi.saveLoan(payload, id), onSuccess: invalidate }),
    approveLoan: useMutation({ mutationFn: (id: string) => hrApi.approveLoan(id), onSuccess: invalidate }),
    disburseLoan: useMutation({ mutationFn: (id: string) => hrApi.disburseLoan(id), onSuccess: invalidate }),
    repayLoan: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: unknown }) => hrApi.repayLoan(id, payload), onSuccess: invalidate }),
  };
}
