export type PosPriceType = 'retail' | 'wholesale';

export interface PosItem {
  lineKey: string;
  productId: string;
  name: string;
  unitId: string;
  unitName: string;
  unitMultiplier: number;
  price: number;
  qty: number;
  stockLimit: number;
  currentStock: number;
  minStock: number;
  priceType: PosPriceType;
}
