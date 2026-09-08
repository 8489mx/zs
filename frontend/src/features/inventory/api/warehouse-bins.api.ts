import { http } from '@/lib/http';

export interface WarehouseBin {
  id: number;
  locationId: number;
  locationName: string;
  code: string;
  barcode: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  capacity: number | null;
  isActive: boolean;
  notes: string;
  productsCount: number;
  totalQuantityStored: number;
  createdAt: string;
}

export interface CreateBinPayload {
  locationId: number;
  code: string;
  barcode?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateBinPayload {
  code?: string;
  barcode?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  isActive?: boolean;
  notes?: string;
}

export interface BinAuditedItem {
  allocationId: number;
  productId: number;
  productName: string;
  productBarcode: string;
  costPrice: number;
  retailPrice: number;
  quantity: number;
  isPrimary: boolean;
  lastAuditedAt?: string;
}

export interface ScanAuditResponse {
  type: 'bin' | 'product';
  bin?: {
    id: number;
    locationId: number;
    locationName: string;
    code: string;
    barcode: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;
    capacity: number | null;
    notes: string;
  };
  items?: BinAuditedItem[];
  product?: {
    id: number;
    name: string;
    barcode: string;
    stockQty: number;
    binLocation: string;
    primaryBinId: number | null;
  };
  allocatedBins?: {
    binId: number;
    binCode: string;
    binBarcode: string;
    locationName: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;
    quantity: number;
    isPrimary: boolean;
  }[];
}

export const warehouseBinsApi = {
  list: async (params?: { locationId?: number; search?: string }): Promise<WarehouseBin[]> => {
    const query = new URLSearchParams();
    if (params?.locationId) query.set('locationId', String(params.locationId));
    if (params?.search) query.set('search', params.search);
    const suffix = query.toString();
    const res = await http<WarehouseBin[] | { data: WarehouseBin[] }>(`/api/inventory/bins${suffix ? `?${suffix}` : ''}`);
    return Array.isArray(res) ? res : (res as any)?.data || [];
  },

  create: async (data: CreateBinPayload): Promise<WarehouseBin> => {
    const res = await http<WarehouseBin | { data: WarehouseBin }>('/api/inventory/bins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return (res as any)?.data || res;
  },

  update: async (id: number, data: UpdateBinPayload): Promise<{ success: boolean }> => {
    const res = await http<{ success: boolean }>(`/api/inventory/bins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res;
  },

  remove: async (id: number): Promise<{ success: boolean }> => {
    const res = await http<{ success: boolean }>(`/api/inventory/bins/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  scanAudit: async (barcode: string): Promise<ScanAuditResponse> => {
    const res = await http<ScanAuditResponse>(`/api/inventory/bins/scan-audit?barcode=${encodeURIComponent(barcode)}`);
    return (res as any)?.data || res;
  },

  quickReassign: async (data: { binId: number; productId: number; quantity: number; isPrimary?: boolean }): Promise<{ success: boolean }> => {
    const res = await http<{ success: boolean }>('/api/inventory/bins/reassign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  quickAuditUpdate: async (data: { binId: number; productId: number; countedQty: number; notes?: string }): Promise<{
    success: boolean;
    previousQty: number;
    countedQty: number;
    variance: number;
    message: string;
  }> => {
    const res = await http<any>('/api/inventory/bins/quick-audit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },
};
