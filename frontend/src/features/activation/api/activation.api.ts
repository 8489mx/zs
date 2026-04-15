import { http } from '@/lib/http';

export interface ActivationStatusResponse {
  enforced: boolean;
  activated: boolean;
  setupRequired: boolean;
  machineId: string;
  machineLabel: string;
  license: {
    customerName: string;
    issuedAt: string;
    expiresAt?: string | null;
    plan?: string | null;
    issuedBy?: string | null;
  } | null;
}

export interface ActivatePayload {
  activationCode: string;
}

export interface InitializeSetupPayload {
  storeName: string;
  branchName: string;
  locationName: string;
  adminUsername: string;
  adminDisplayName: string;
  adminPassword: string;
}

export const activationApi = {
  status() {
    return http<ActivationStatusResponse>('/api/activation/status');
  },
  activate(payload: ActivatePayload) {
    return http<ActivationStatusResponse>('/api/activation/activate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  initialize(payload: InitializeSetupPayload) {
    return http<ActivationStatusResponse>('/api/activation/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
