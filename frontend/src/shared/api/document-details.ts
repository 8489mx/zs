import { http } from '@/lib/http';
import type { Purchase, Sale } from '@/types/domain';

export const documentDetailsApi = {
  saleById: (id: string) => http<Sale>(`/api/sales/${id}`),
  purchaseById: (id: string) => http<Purchase>(`/api/purchases/${id}`),
};
