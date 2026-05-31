import { http } from '@/lib/http';

export type PublicTrialSignupPayload = {
  businessName: string;
  ownerPhone: string;
  ownerEmail: string;
  honeypot?: string;
};

export type PublicTrialSignupResponse = {
  ok: boolean;
  message: string;
  debug?: {
    username: string;
    temporaryPassword: string;
    trialEndsAt: string;
  };
};

export const publicTrialApi = {
  signup(payload: PublicTrialSignupPayload) {
    return http<PublicTrialSignupResponse>('/api/public/trial-signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

