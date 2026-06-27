import { http } from '@/lib/http';

export type SaasTenantStatus = 'trial' | 'active' | 'expired' | 'suspended' | string;

export type SaasTenantRow = {
  id: string;
  slug: string;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  activityType: string;
  status: SaasTenantStatus;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  activatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  trialDaysRemaining: number | null;
  usersCount: number;
  activeUsersCount: number;
  ownerLocked: boolean;
  ownerIsActive: boolean;
  ownerUsername: string;
};

export type CreateTrialTenantPayload = {
  slug: string;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  activityType?: string;
  username: string;
  password?: string;
  days?: number;
  source?: string;
  campaign?: string;
  notes?: string;
};

export const saasAdminApi = {
  tenants: (query?: { status?: string; search?: string }) => {
    const search = new URLSearchParams();
    if (query?.status) search.set('status', query.status);
    if (query?.search) search.set('search', query.search);
    const suffix = search.toString();
    return http<{ tenants: SaasTenantRow[] }>(`/api/saas-admin/tenants${suffix ? `?${suffix}` : ''}`);
  },
  createTrialTenant: (payload: CreateTrialTenantPayload) =>
    http<{
      tenant: SaasTenantRow;
      owner: { username: string; temporaryPassword: string; mustChangePassword: boolean };
    }>('/api/saas-admin/tenants/trial', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  activateTenant: (id: string, durationMonths?: number) => http<{ ok: boolean }>(`/api/saas-admin/tenants/${encodeURIComponent(id)}/activate`, { method: 'POST', body: JSON.stringify({ durationMonths }) }),
  suspendTenant: (id: string, notes?: string) => http<{ ok: boolean }>(`/api/saas-admin/tenants/${encodeURIComponent(id)}/suspend`, { method: 'POST', body: JSON.stringify({ notes: notes || '' }) }),
  expireTenant: (id: string, notes?: string) => http<{ ok: boolean }>(`/api/saas-admin/tenants/${encodeURIComponent(id)}/expire`, { method: 'POST', body: JSON.stringify({ notes: notes || '' }) }),
  extendTrial: (id: string, days: number) =>
    http<{ ok: boolean; trialEndsAt: string; daysAdded: number }>(`/api/saas-admin/tenants/${encodeURIComponent(id)}/extend-trial`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),
  unlockOwner: (id: string) => http<{ ok: boolean }>(`/api/saas-admin/tenants/${encodeURIComponent(id)}/unlock-owner`, { method: 'POST', body: JSON.stringify({}) }),
  resetOwnerPassword: (id: string, newPassword?: string) =>
    http<{ ok: boolean; owner: { username: string; temporaryPassword: string; mustChangePassword: boolean } }>(
      `/api/saas-admin/tenants/${encodeURIComponent(id)}/reset-owner-password`,
      { method: 'POST', body: JSON.stringify({ newPassword }) },
    ),
  deleteTenant: (id: string) => http<{ ok: boolean }>(`/api/saas-admin/tenants/${encodeURIComponent(id)}/delete`, { method: 'POST', body: JSON.stringify({}) }),
};
