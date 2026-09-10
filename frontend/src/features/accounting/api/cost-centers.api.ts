import { http } from '@/lib/http';

export interface CostCenterRecord {
  id: number;
  code: string;
  name: string;
  dimension?: 'branch' | 'project' | 'department' | 'fleet' | 'operational' | string;
  budgetAmount?: number;
  parentId: number | null;
  parentName?: string | null;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenterReportData {
  costCenter: {
    id: number;
    code: string;
    name: string;
    dimension?: string;
    budgetAmount?: number;
  };
  summary: {
    totalDebit: number;
    totalCredit: number;
    totalExpenses: number;
    totalRevenues: number;
    netProfit: number;
    budgetAmount: number;
    variance: number;
    utilizationRate: number;
    linesCount: number;
  };
  lines: Array<{
    lineId: number;
    entryId: number;
    entryNo: string;
    entryDate: string;
    entryDescription: string;
    lineDescription: string;
    accountId: number;
    accountCode: string;
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
  }>;
}

export const costCentersApi = {
  list: async () => {
    const res = await http<{ ok: boolean; costCenters: CostCenterRecord[] }>('/api/accounting/cost-centers');
    return res.costCenters || [];
  },
  
  create: (data: { code: string; name: string; dimension?: string; budgetAmount?: number; parentId?: number | null; description?: string; isActive?: boolean }) =>
    http<{ ok: boolean; costCenter: CostCenterRecord }>('/api/accounting/cost-centers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { code?: string; name?: string; dimension?: string; budgetAmount?: number; parentId?: number | null; description?: string; isActive?: boolean }) =>
    http<{ ok: boolean; costCenter: CostCenterRecord }>(`/api/accounting/cost-centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    http<{ ok: boolean; message: string }>(`/api/accounting/cost-centers/${id}`, {
      method: 'DELETE',
    }),

  getReport: (id: number, params?: { fromDate?: string; toDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    const qs = searchParams.toString();
    return http<CostCenterReportData>(`/api/accounting/cost-centers/${id}/report${qs ? `?${qs}` : ''}`);
  },

  listAllocations: () =>
    http<CostCenterAllocation[]>('/api/accounting/cost-centers/allocations'),

  createAllocation: (data: { code: string; name: string; description?: string; splits: { costCenterId: number; percentage: number; notes?: string }[] }) =>
    http<{ ok: boolean; allocationId: string }>('/api/accounting/cost-centers/allocations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAllocation: (id: string, data: { code: string; name: string; description?: string; splits: { costCenterId: number; percentage: number; notes?: string }[] }) =>
    http<{ ok: boolean }>(`/api/accounting/cost-centers/allocations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAllocation: (id: string) =>
    http<{ ok: boolean }>(`/api/accounting/cost-centers/allocations/${id}`, {
      method: 'DELETE',
    }),

  calculateSplit: (id: string, amount: number) =>
    http<{ allocationName: string; totalAmount: number; splits: { costCenterId: number; costCenterName: string; costCenterCode: string; percentage: number; allocatedAmount: number }[] }>(
      `/api/accounting/cost-centers/allocations/${id}/calculate`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }
    ),
};

export interface CostCenterAllocationSplit {
  id: string;
  costCenterId: number;
  costCenterName: string;
  costCenterCode: string;
  percentage: number;
  notes?: string;
}

export interface CostCenterAllocation {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  splits: CostCenterAllocationSplit[];
}

