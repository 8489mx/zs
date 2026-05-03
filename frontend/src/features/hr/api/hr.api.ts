import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';
import type {
  HrCompensationPackage,
  HrContact,
  HrContract,
  HrDocument,
  HrEmployee,
  HrLedgerEntry,
  HrLoan,
  HrMasterDataRecord,
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

export const hrApi = {
  summary: async () => (await http<{ summary?: HrSummary }>('/api/hr/summary')).summary || { employeeCount: 0, activeCount: 0, openLoans: 0, outstandingAmount: 0 },
  withdrawals: (params: HrListParams = {}) => http<WithdrawalsResponse>(`/api/hr/withdrawals${buildQueryString(params)}`),
  masterData: async (kind: MasterKind, params: HrListParams = {}) => http<MasterResponse>(`/api/hr/${kind}${buildQueryString(params)}`),
  saveMasterData: (kind: MasterKind, payload: unknown, id?: string) => http(`/api/hr/${kind}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  deactivateMasterData: (kind: MasterKind, id: string) => http(`/api/hr/${kind}/${id}`, { method: 'DELETE' }),
  employees: async (params: HrListParams = {}) => http<EmployeesResponse>(`/api/hr/employees${buildQueryString(params)}`),
  saveEmployee: (payload: unknown, id?: string) => http(`/api/hr/employees${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  deactivateEmployee: (id: string) => http(`/api/hr/employees/${id}`, { method: 'DELETE' }),
  profile: (id: string) => http<ProfileResponse>(`/api/hr/employees/${id}`),
  contacts: (employeeId: string) => http<RowsResponse<HrContact>>(`/api/hr/employees/${employeeId}/contacts`),
  saveContact: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/contacts${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  documents: (employeeId: string) => http<RowsResponse<HrDocument>>(`/api/hr/employees/${employeeId}/documents`),
  saveDocument: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/documents${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  contracts: (employeeId: string) => http<RowsResponse<HrContract>>(`/api/hr/employees/${employeeId}/contracts`),
  saveContract: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/contracts${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  compensation: (employeeId: string) => http<RowsResponse<HrCompensationPackage>>(`/api/hr/employees/${employeeId}/compensation`),
  saveCompensation: (employeeId: string, payload: unknown, id?: string) => http(`/api/hr/employees/${employeeId}/compensation${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  loans: async (params: HrListParams = {}) => http<LoansResponse>(`/api/hr/loans${buildQueryString(params)}`),
  saveLoan: (payload: unknown, id?: string) => http(`/api/hr/loans${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  approveLoan: (id: string) => http(`/api/hr/loans/${id}/approve`, { method: 'POST' }),
  disburseLoan: (id: string) => http(`/api/hr/loans/${id}/disburse`, { method: 'POST' }),
  repayLoan: (id: string, payload: unknown) => http(`/api/hr/loans/${id}/repayments`, { method: 'POST', body: JSON.stringify(payload) }),
  ledger: (employeeId: string) => http<RowsResponse<HrLedgerEntry>>(`/api/hr/employees/${employeeId}/ledger`),
};
