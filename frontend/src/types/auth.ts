export type Permission = string;

export interface AuthUser {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'cashier';
  permissions: Permission[];
  displayName: string;
  branchIds: string[];
  defaultBranchId: string;
  mustChangePassword?: boolean;
  usingDefaultAdminPassword?: boolean;
}


export interface AuthMeResponse {
  user: AuthUser;
  settings: {
    storeName: string;
    theme: string;
  };
  security: {
    mustChangePassword: boolean;
    usingDefaultAdminPassword?: boolean;
  };
}

