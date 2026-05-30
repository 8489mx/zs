export type Permission = string;

export interface AuthUser {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'cashier';
  permissions: Permission[];
  displayName: string;
  branchIds: string[];
  defaultBranchId: string;
  tenantId?: string;
  accountId?: string;
  mustChangePassword?: boolean;
  usingDefaultAdminPassword?: boolean;
}

export interface AuthTenant {
  id: string;
  accountId: string;
  slug: string;
  businessName: string;
  status: 'trial' | 'active' | 'suspended' | 'expired' | string;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  createdAt?: string | null;
}

export interface AuthMeResponse {
  user: AuthUser;
  tenant?: AuthTenant | null;
  settings: {
    storeName: string;
    theme: string;
  };
  security: {
    mustChangePassword: boolean;
    usingDefaultAdminPassword?: boolean;
  };
}

export interface AuthLoginResponse extends AuthMeResponse {
  ok?: boolean;
  mustChangePassword?: boolean;
  expiresAt?: string;
  sessionId?: string;
}
