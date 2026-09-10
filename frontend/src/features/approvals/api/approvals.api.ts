import { http } from '@/lib/http';

export interface ApprovalRule {
  id: string;
  module: 'purchase_orders' | 'purchases' | 'expenses' | 'treasury_transactions';
  min_amount: number;
  max_amount: number | null;
  tier_level: number;
  required_role: string;
  approver_user_id: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequestLog {
  id: string;
  request_id: string;
  tier_level: number;
  action: 'initiated' | 'approved' | 'rejected';
  action_by: number;
  action_by_name: string | null;
  action_role: string | null;
  notes: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  module: string;
  record_id: string;
  record_ref: string;
  amount: number;
  currency: string;
  current_tier: number;
  max_tier: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: number;
  requested_by_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequestDetailsResponse {
  request: ApprovalRequest;
  logs: ApprovalRequestLog[];
  rules: ApprovalRule[];
}

export interface GetApprovalRequestsFilter {
  status?: string;
  module?: string;
  page?: number;
  limit?: number;
}

export async function getApprovalRules(): Promise<ApprovalRule[]> {
  return await http<ApprovalRule[]>('/api/approvals/rules');
}

export async function createApprovalRule(payload: {
  module: string;
  minAmount: number;
  maxAmount?: number | null;
  tierLevel?: number;
  requiredRole?: string;
  approverUserId?: number | null;
  notes?: string | null;
}): Promise<{ ok: boolean; rule: ApprovalRule }> {
  return await http<{ ok: boolean; rule: ApprovalRule }>('/api/approvals/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateApprovalRule(
  id: string,
  payload: Partial<{
    minAmount: number;
    maxAmount: number | null;
    tierLevel: number;
    requiredRole: string;
    approverUserId: number | null;
    isActive: boolean;
    notes: string | null;
  }>
): Promise<{ ok: boolean; rule: ApprovalRule }> {
  return await http<{ ok: boolean; rule: ApprovalRule }>(`/api/approvals/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteApprovalRule(id: string): Promise<{ ok: boolean }> {
  return await http<{ ok: boolean }>(`/api/approvals/rules/${id}`, {
    method: 'DELETE',
  });
}

export async function getApprovalRequests(
  filter: GetApprovalRequestsFilter = {}
): Promise<{ items: ApprovalRequest[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.module) params.set('module', filter.module);
  if (filter.page) params.set('page', String(filter.page));
  if (filter.limit) params.set('limit', String(filter.limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return await http<{ items: ApprovalRequest[]; total: number; page: number; limit: number }>(
    `/api/approvals/requests${query}`
  );
}

export async function getPendingApprovalsCount(): Promise<{ count: number }> {
  return await http<{ count: number }>('/api/approvals/requests/pending-count');
}

export async function getApprovalRequestDetails(id: string): Promise<ApprovalRequestDetailsResponse> {
  return await http<ApprovalRequestDetailsResponse>(`/api/approvals/requests/${id}`);
}

export async function approveApprovalRequest(id: string, notes?: string): Promise<{ ok: boolean; status: string }> {
  return await http<{ ok: boolean; status: string }>(`/api/approvals/requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function rejectApprovalRequest(id: string, reason: string): Promise<{ ok: boolean; status: string }> {
  return await http<{ ok: boolean; status: string }>(`/api/approvals/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
