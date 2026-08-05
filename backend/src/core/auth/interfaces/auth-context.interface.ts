export interface AuthContext {
  userId: number;
  sessionId: string;
  username: string;
  role: string;
  permissions: string[];
  tenantId?: string;
  accountId?: string;
  planId?: string;
  extraFeatures?: string[];
}
