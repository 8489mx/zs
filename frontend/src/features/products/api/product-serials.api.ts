import { http } from '@/lib/http';

export interface ProductSerialItem {
  id: string;
  productId: string;
  serialNumber: string;
  imei2?: string | null;
  status: 'in_stock' | 'sold' | 'returned' | 'transferred' | 'damaged';
  costPrice?: number;
  warrantyEndDate?: string | null;
  notes?: string | null;
  saleId?: string | null;
  saleDocNo?: string | null;
  purchaseId?: string | null;
  purchaseDocNo?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  supplierName?: string | null;
  branchName?: string | null;
  locationName?: string | null;
  productName?: string | null;
  productBarcode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const productSerialsApi = {
  lookup: async (serial: string): Promise<ProductSerialItem | null> => {
    const res = await http<{ item: ProductSerialItem | null }>(`/api/catalog/serials/lookup?serial=${encodeURIComponent(serial)}`);
    return res?.item || null;
  },

  listByProduct: async (productId: string, status?: string): Promise<ProductSerialItem[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await http<{ items: ProductSerialItem[] }>(`/api/products/${productId}/serials${query}`);
    return res?.items || [];
  },

  addSerials: async (productId: string, serials: Array<{ serialNumber: string; imei2?: string; costPrice?: number; branchId?: number; locationId?: number; notes?: string }>) => {
    return http<{ addedCount: number }>(`/api/products/${productId}/serials`, {
      method: 'POST',
      body: JSON.stringify({ serials }),
    });
  },
};
