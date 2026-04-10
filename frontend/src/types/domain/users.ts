export interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface Location {
  id: string;
  branchId: string;
  name: string;
  code?: string;
  isActive?: boolean;
}
