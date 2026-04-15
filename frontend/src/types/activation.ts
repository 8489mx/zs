export interface ActivationStatusResponse {
  deploymentMode: 'desktop' | 'server';
  activationRequired: boolean;
  activated: boolean;
  setupRequired: boolean;
  machineId: string | null;
  customerName: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

export interface ActivationInitializePayload {
  storeName: string;
  theme?: string;
  branchName: string;
  branchCode?: string;
  locationName: string;
  locationCode?: string;
  adminDisplayName: string;
  adminUsername: string;
  adminPassword: string;
}
