import { http } from '@/lib/http';

export type DealStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type DealPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CrmDeal {
  id: number;
  tenantId: string;
  title: string;
  stage: DealStage;
  expectedAmount: number;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  companyName: string | null;
  source: string;
  priority: DealPriority;
  assignedUserId: number | null;
  assignedUserName?: string | null;
  customerId: number | null;
  customerName?: string | null;
  lostReason: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: number;
  dealId: number;
  activityType: 'call' | 'meeting' | 'note' | 'task' | 'stage_change' | 'converted';
  summary: string;
  dueDate: string | null;
  isCompleted: boolean;
  createdBy: number | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface PipelineSummary {
  totalDeals: number;
  totalActiveCount: number;
  totalActiveAmount: number;
  weightedAmount: number;
  wonCount: number;
  wonAmount: number;
  lostCount: number;
  winRate: number;
  stageBreakdown: Record<string, { count: number; totalAmount: number }>;
}

export interface DealQueryFilters {
  stage?: string;
  search?: string;
  source?: string;
  priority?: string;
  assignedUserId?: number;
}

export interface CreateDealPayload {
  title: string;
  expectedAmount?: number;
  currency?: string;
  probability?: number;
  stage?: string;
  expectedCloseDate?: string | null;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  companyName?: string;
  source?: string;
  priority?: string;
  assignedUserId?: number | null;
  notes?: string;
}

export interface UpdateDealPayload {
  title?: string;
  stage?: string;
  expectedAmount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  companyName?: string;
  source?: string;
  priority?: string;
  assignedUserId?: number | null;
  lostReason?: string;
  notes?: string;
}

export const crmApi = {
  list: async (filters?: DealQueryFilters) => {
    const params = new URLSearchParams();
    if (filters?.stage && filters.stage !== 'all') params.set('stage', filters.stage);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.source && filters.source !== 'all') params.set('source', filters.source);
    if (filters?.priority && filters.priority !== 'all') params.set('priority', filters.priority);
    if (filters?.assignedUserId) params.set('assignedUserId', String(filters.assignedUserId));

    const qs = params.toString();
    const res = await http<{ ok: boolean; deals: CrmDeal[] }>(`/api/crm/deals${qs ? `?${qs}` : ''}`);
    return res.deals || [];
  },

  get: async (id: number) => {
    return http<{ ok: boolean; deal: CrmDeal; activities: CrmActivity[] }>(`/api/crm/deals/${id}`);
  },

  create: (data: CreateDealPayload) => {
    return http<{ ok: boolean; deal: CrmDeal }>('/api/crm/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: UpdateDealPayload) => {
    return http<{ ok: boolean; deal: CrmDeal }>(`/api/crm/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return http<{ ok: boolean; message: string }>(`/api/crm/deals/${id}`, {
      method: 'DELETE',
    });
  },

  getSummary: async () => {
    const res = await http<{ ok: boolean; summary: PipelineSummary }>('/api/crm/pipeline-summary');
    return res.summary;
  },

  addActivity: (dealId: number, data: { activityType?: string; summary: string; dueDate?: string | null }) => {
    return http<{ ok: boolean; activity: CrmActivity }>(`/api/crm/deals/${dealId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  toggleActivity: (activityId: number) => {
    return http<{ ok: boolean; activity: CrmActivity }>(`/api/crm/activities/${activityId}/toggle`, {
      method: 'PATCH',
    });
  },

  convertToCustomer: (dealId: number) => {
    return http<{ ok: boolean; customerId: number; dealId: number; message: string }>(`/api/crm/deals/${dealId}/convert-to-customer`, {
      method: 'POST',
    });
  },
};
