export type LineItem = {
  id: number;
  productId: string;
  productName?: string;
  qty: number;
  fromLocationId?: string;
  fromLocationName?: string;
};
