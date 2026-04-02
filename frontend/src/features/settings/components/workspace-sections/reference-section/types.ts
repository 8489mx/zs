export interface BranchActionState {
  branchId: string;
  values: { name: string; code: string };
}

export interface LocationActionState {
  locationId: string;
  values: { name: string; code: string; branchId: string };
}

export interface ReferenceDeleteConfirmState {
  kind: 'branch' | 'location';
  id: string;
  name: string;
}
