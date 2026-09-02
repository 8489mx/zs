import { http } from '@/lib/http';

export type TenantSubscriptionData = {
  tenant: {
    id: string;
    slug: string;
    businessName: string;
    ownerName: string;
    ownerPhone: string;
    status: string;
    trialStartsAt: string | null;
    trialEndsAt: string | null;
    createdAt: string;
  };
  subscription: {
    id: number;
    status: string;
    startsAt: string;
    endsAt: string;
    graceEndsAt: string | null;
    autoRenew: boolean;
    planId: number;
    planName: string;
    planCode: string;
    planPrice: number;
    planCurrency: string;
    billingPeriodMonths: number;
  } | null;
  usage: {
    users: { current: number; max: number | null };
    branches: { current: number; max: number | null };
    locations: { current: number };
    products: { current: number };
    sales: { current: number };
  };
  statusMeta: {
    daysRemaining: number | null;
    isExpiringSoon: boolean;
    isExpired: boolean;
  };
  availablePlans: Array<{
    id: number;
    name: string;
    code: string;
    price: number;
    currency: string;
    billingPeriodMonths: number;
    maxUsers: number | null;
    maxBranches: number | null;
    featurePlanId: string | null;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    currency: string;
    method: string;
    reference: string | null;
    paidAt: string;
    planName: string | null;
    startsAt: string | null;
    endsAt: string | null;
  }>;
};

export const tenantSubscriptionApi = {
  getMySubscription: () => http<TenantSubscriptionData>('/api/tenant-subscription/me'),
  requestRenewal: (payload: { planId: number; billingPeriodMonths?: number; paymentMethod?: string; notes?: string }) =>
    http<{ ok: boolean; message: string; plan: { id: number; name: string; price: number; currency: string } }>(
      '/api/tenant-subscription/request-renewal',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  initiateOnlinePayment: (payload: { planId: number; billingPeriodMonths?: number; gateway?: 'xpay' | 'paymob' | 'stripe'; redirectUrl?: string }) =>
    http<{ ok: boolean; paymentUrl: string; transactionReference: string; gateway: string; message?: string }>(
      '/api/tenant-subscription/initiate-online-payment',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};
