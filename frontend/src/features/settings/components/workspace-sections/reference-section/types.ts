export interface BranchActionState {
  branchId: string;
  values: { name: string; code: string; defaultStockLocationId?: string; salesStockMode?: 'single_location' | 'all_operational_locations'; allowExternalSalesStock?: boolean };
}

export interface LocationActionState {
  locationId: string;
  values: { name: string; code: string; branchId: string; locationType: string };
}

export interface ReferenceDeleteConfirmState {
  kind: 'branch' | 'location';
  id: string;
  name: string;
}
