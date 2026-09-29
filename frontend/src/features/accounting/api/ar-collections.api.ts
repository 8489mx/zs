import { http } from '@/lib/http';

export interface ArCollectionsOverview {
  totalOverdue: number;
  openCasesCount: number;
  escalatedCasesCount: number;
  promisedPaymentsCount: number;
  promisedAmountToday: number;
  creditBlockedCount: number;
}

export interface ArCollectionCaseItem {
  id: string;
  tenant_id: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_balance: number;
  customer_credit_limit: number;
  is_credit_blocked: boolean;
  credit_block_reason?: string;
  total_overdue: number;
  oldest_overdue_days: number;
  status: 'open' | 'promised_to_pay' | 'escalated' | 'settled' | 'disputed';
  promised_payment_date?: string;
  promised_amount?: number;
  last_contact_date?: string;
  next_followup_date?: string;
  notes?: string;
  updated_at: string;
  level_id?: string;
  level_name?: string;
  level_order?: number;
  level_days_past_due?: number;
  level_auto_block_sales?: boolean;
  level_action_type?: string;
  collector_name?: string;
  reminderMessage?: string;
  whatsAppUrl?: string;
}

export interface ArCollectionCaseDetails {
  case: ArCollectionCaseItem & {
    customer_address?: string;
    created_at: string;
  };
  invoices: Array<{
    id: number;
    doc_no?: string;
    invoice_number?: string;
    total: number;
    paid_amount: number;
    unpaid_amount: number;
    created_at: string;
    status: string;
  }>;
  logs: Array<{
    id: string;
    interaction_type: string;
    result_status: string;
    details?: string;
    promised_date?: string;
    promised_amount?: number;
    created_at: string;
    created_by_name?: string;
  }>;
}

export interface ArDunningLevel {
  id: string;
  tenant_id: string;
  level_order: number;
  level_name: string;
  days_past_due: number;
  auto_block_sales: boolean;
  action_type: 'whatsapp' | 'manual_call' | 'legal' | 'email';
  template_text: string;
}

export interface CreateCollectionLogPayload {
  interactionType: string;
  resultStatus: string;
  details?: string;
  promisedDate?: string;
  promisedAmount?: number;
  nextFollowupDate?: string;
}

export interface RecordPromiseToPayPayload {
  promisedDate: string;
  promisedAmount: number;
  notes?: string;
}

export interface ToggleCreditBlockPayload {
  block: boolean;
  reason?: string;
}

export interface UpdateDunningLevelPayload {
  levelName?: string;
  daysPastDue?: number;
  autoBlockSales?: boolean;
  actionType?: string;
  templateText?: string;
}

export const arCollectionsApi = {
  getOverview: () =>
    http<ArCollectionsOverview>('/api/accounting/collections/overview'),

  getCases: (params?: {
    status?: string;
    levelId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.levelId) query.set('levelId', params.levelId);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return http<{ cases: ArCollectionCaseItem[]; totalCount: number }>(
      `/api/accounting/collections/cases?${query.toString()}`,
    );
  },

  getCaseDetails: (id: string) =>
    http<ArCollectionCaseDetails>(`/api/accounting/collections/cases/${id}`),

  syncCollections: () =>
    http<{
      scannedCustomers: number;
      activeCases: number;
      creditBlockedCount: number;
      settledCasesCount: number;
    }>('/api/accounting/collections/sync', { method: 'POST' }),

  logInteraction: (id: string, payload: CreateCollectionLogPayload) =>
    http<{ success: boolean; logId: string }>(
      `/api/accounting/collections/cases/${id}/logs`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  recordPromiseToPay: (id: string, payload: RecordPromiseToPayPayload) =>
    http<{ success: boolean; logId: string }>(
      `/api/accounting/collections/cases/${id}/promise-to-pay`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  toggleCreditBlock: (id: string, payload: ToggleCreditBlockPayload) =>
    http<{ success: boolean; isCreditBlocked: boolean }>(
      `/api/accounting/collections/cases/${id}/toggle-credit-block`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  getDunningLevels: () =>
    http<ArDunningLevel[]>('/api/accounting/collections/dunning-levels'),

  updateDunningLevel: (id: string, payload: UpdateDunningLevelPayload) =>
    http<{ success: boolean }>(
      `/api/accounting/collections/dunning-levels/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),
};
