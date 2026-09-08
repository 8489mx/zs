export interface SignagePromoItem {
  id: number | string;
  name: string;
  categoryName?: string;
  originalPrice: number;
  promoPrice: number;
  discountPercent: number;
  savingAmount: number;
  badge: string;
  barcode?: string;
  imageUrl?: string;
}
