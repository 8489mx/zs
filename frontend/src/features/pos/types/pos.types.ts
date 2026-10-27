export type PosPriceType = 'retail' | 'wholesale';

export interface PosItem {
  lineKey: string;
  productId: string;
  name: string;
  nameEn?: string;
  name_en?: string;
  itemCode?: string;
  unitId: string;
  unitName: string;
  unitMultiplier: number;
  price: number;
  originalPrice?: number;
  offerDiscount?: number;
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
  seatNumber?: number;
  course?: string;
  quantityChunks?: number[];
  trackSerials?: boolean;
  serials?: string[];
  imageUrl?: string;
  icon?: string;
}
