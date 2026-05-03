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

export const hrApi = {
  summary: async () => (await http<{ summary?: HrSummary }>('/api/hr/summary')).summary || { employeeCount: 0, activeCount: 0, openLoans: 0, outstandingAmount: 0 },
  withdrawals: async (params: HrListParams = {}) => {
    const response = await http<WithdrawalsResponse>(`/api/hr/withdrawals${buildQueryString(params)}`);
    return { ...response, rows: (response.rows || []).map(normalizeHrWithdrawalRow) };
  },
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
  loans: async (params: HrListParams = {}) => {
    const response = await http<LoansResponse>(`/api/hr/loans${buildQueryString(params)}`);
    return { ...response, loans: (response.loans || []).map(normalizeHrLoanRow) };
  },
  saveLoan: (payload: unknown, id?: string) => http(`/api/hr/loans${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  approveLoan: (id: string) => http(`/api/hr/loans/${id}/approve`, { method: 'POST' }),
  disburseLoan: (id: string) => http(`/api/hr/loans/${id}/disburse`, { method: 'POST' }),
  repayLoan: (id: string, payload: unknown) => http(`/api/hr/loans/${id}/repayments`, { method: 'POST', body: JSON.stringify(payload) }),
  ledger: (employeeId: string) => http<RowsResponse<HrLedgerEntry>>(`/api/hr/employees/${employeeId}/ledger`),
};
