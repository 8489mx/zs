export interface ProductRow {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  locationStocks: { locationId: string; locationName: string; qty: number }[];
  totalQty: number;
  unassignedQty?: number;
  isUnassigned: boolean;
}

export type SortMode = 'default' | 'qtyDesc' | 'qtyAsc';

export type ModalType = 'transfer' | 'assign' | 'categoryTransfer' | 'consolidate';

export interface ModalState {
  type: ModalType;
  product?: ProductRow;
  categoryName?: string;
  products?: ProductRow[];
  sourceLocationId?: string;
}
