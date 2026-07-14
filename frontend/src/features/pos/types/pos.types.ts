export type PosPriceType = 'retail' | 'wholesale';

export interface PosItem {
  lineKey: string;
  productId: string;
  name: string;
  itemCode?: string;
  unitId: string;
  unitName: string;
  unitMultiplier: number;
  price: number;
  costPrice: number;
  qty: number;
  stockLimit: number;
  currentStock: number;
  minStock: number;
  priceType: PosPriceType;
  isWeighted?: boolean;
  sourceBarcode?: string;
  notes?: string;
  offerName?: string;
  modifiers?: any[];
  quantityChunks?: number[];
}
