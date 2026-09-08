import { http } from '@/lib/http';

export interface SettlementPreview {
  employee: {
    id: number;
    employeeNo: string;
    name: string;
    hireDate: string;
    departmentId: number | null;
    currentStatus: string;
  };
  servicePeriod: {
    years: number;
    months: number;
    days: number;
    totalYearsDecimal: number;
    totalDays: number;
  };
  salaries: {
    basicSalary: number;
    totalSalary: number;
    dailyWage: number;
  };
  gratuity: {
    lawType: string;
    reason: string;
    baseGratuity: number;
    gratuityPercentage: number;
    gratuityAmount: number;
  };
  leaveEncashment: {
    remainingLeaveDays: number;
    leaveEncashmentAmount: number;
  };
  pendingSalaryAmount: number;
  noticePeriodAmount: number;
  customEntitlements: number;
  unpaidLoansDeduction: number;
  assetsDeduction: number;
  otherDeductions: number;
  totalEntitlements: number;
  totalDeductions: number;
  netSettlementAmount: number;
  unreturnedAssets: Array<{
    id: number;
    assetType: string;
    assetName: string;
    assetCode?: string;
    serialNo?: string;
    assignedAt: string;
  }>;
}

export interface SettlementRecord {
  id: number;
  settlementNo: string;
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  departmentName?: string;
  settlementDate: string;
  hireDate: string;
  terminationDate: string;
  contractType: string;
  terminationReason: string;
  lawType: string;
  serviceYears: number;
  gratuityAmount: number;
  leaveEncashmentAmount: number;
  pendingSalaryAmount: number;
  netSettlementAmount: number;
  custodyCleared: boolean;
  clearanceChecklist?: Array<{ id: string; label: string; cleared: boolean; notes?: string }>;
  clearanceNotes?: string;
  status: 'draft' | 'approved' | 'posted' | 'cancelled';
  journalEntryId?: number | null;
  journalEntryNo?: string | null;
  notes?: string;
  createdAt: string;
}

export interface CreateSettlementInput {
  employeeId: number;
  settlementDate?: string;
  terminationDate: string;
  terminationReason: string;
  contractType?: string;
  lawType?: 'saudi' | 'egyptian' | 'custom';
  customGratuityDaysPerYear?: number;
  customEntitlements?: number;
  noticePeriodAmount?: number;
  assetsDeduction?: number;
  otherDeductions?: number;
  custodyCleared?: boolean;
  clearanceChecklist?: any[];
  clearanceNotes?: string;
  notes?: string;
  confirmTermination?: boolean;
}

export const endOfServiceApi = {
  calculatePreview: (payload: {
    employeeId: number;
    terminationDate: string;
    terminationReason: string;
    contractType?: string;
    lawType?: string;
    customGratuityDaysPerYear?: number;
    customEntitlements?: number;
    noticePeriodAmount?: number;
    assetsDeduction?: number;
    otherDeductions?: number;
  }) => http<SettlementPreview>('/api/hr/settlements/calculate-preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  create: (payload: CreateSettlementInput) => http<{ ok: boolean; settlement: any }>('/api/hr/settlements', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  list: async (params?: { status?: string; employeeId?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.employeeId) query.set('employeeId', String(params.employeeId));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await http<{ settlements: SettlementRecord[] }>(`/api/hr/settlements${qs}`);
    return res.settlements || [];
  },

  get: async (id: number) => {
    const res = await http<{ settlement: SettlementRecord }>(`/api/hr/settlements/${id}`);
    return res.settlement;
  },

  postAccounting: (id: number, payload: { treasuryAccountId?: number; notes?: string }) =>
    http<{ ok: boolean; journalEntryId: number; entryNo?: string }>(`/api/hr/settlements/${id}/post-accounting`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  remove: (id: number) => http<{ ok: boolean }>(`/api/hr/settlements/${id}`, { method: 'DELETE' }),
};
