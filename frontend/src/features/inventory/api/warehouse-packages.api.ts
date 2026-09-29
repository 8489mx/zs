import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';

export interface PackageItem {
  itemId?: string;
  productId: number;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitName?: string;
  batchNumber?: string;
  serialNumbers?: string[];
}

export interface PackageHierarchyNode {
  id: string;
  packageNumber: string;
  packageType: 'pallet' | 'crate' | 'carton' | 'box';
  status: 'sealed' | 'opened' | 'shipped' | 'consumed';
  grossWeightKg?: number;
  items: PackageItem[];
  children?: PackageHierarchyNode[];
}

export interface WarehousePackageRecord {
  id: string;
  package_number: string;
  package_type: 'pallet' | 'crate' | 'carton' | 'box';
  parent_package_id?: string | null;
  parent_package_number?: string | null;
  warehouse_id?: number | null;
  location_id?: number | null;
  status: 'sealed' | 'opened' | 'shipped' | 'consumed';
  gross_weight_kg?: number | null;
  net_weight_kg?: number | null;
  notes?: string | null;
  created_at: string;
  itemsCount: number;
  totalQuantity: number;
  childrenCount: number;
}

export interface CreatePackagePayload {
  packageNumber?: string;
  packageType: 'pallet' | 'crate' | 'carton' | 'box';
  parentPackageId?: string;
  warehouseId?: number;
  locationId?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  notes?: string;
  items?: Array<{
    productId: number;
    quantity: number;
    unitName?: string;
    batchNumber?: string;
    serialNumbers?: string[];
  }>;
}

export interface UnpackPackagePayload {
  action: 'unpack_all' | 'remove_item' | 'remove_child_package';
  targetPackageItemId?: string;
  targetChildPackageId?: string;
}

export const warehousePackagesApi = {
  list: async (params?: { packageType?: string; status?: string; search?: string }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<WarehousePackageRecord[]>(`/api/inventory/packages${qs}`);
  },

  getDetails: async (identifier: string) => {
    return http<{
      package: any;
      tree: PackageHierarchyNode;
      aggregatedContents: Array<{ productId: number; productName?: string; totalQuantity: number }>;
    }>(`/api/inventory/packages/${encodeURIComponent(identifier)}`);
  },

  create: async (payload: CreatePackagePayload) => {
    return http<{ success: boolean; packageId: string; packageNumber: string; packageType: string }>(
      '/api/inventory/packages',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  unpack: async (id: string, payload: UnpackPackagePayload) => {
    return http<{ success: boolean }>(`/api/inventory/packages/${id}/unpack`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (id: string, status: 'sealed' | 'opened' | 'shipped' | 'consumed') => {
    return http<{ success: boolean }>(`/api/inventory/packages/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
