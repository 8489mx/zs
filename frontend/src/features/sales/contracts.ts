import type { Sale } from '@/types/domain';

export function buildSaleCancelReason(docNo?: string) {
  return `إلغاء فاتورة البيع ${docNo || ''}`.trim();
}

export function buildSaleUpdatePayload(sale: Sale, payload: {
  paymentType: string;
  paymentChannel: string;
  discount: number;
  note: string;
  paidAmount: number;
  editReason: string;
  managerPin: string;
  items: Array<{ productId: string; qty: number; price: number; unitName: string; unitMultiplier: number; priceType: string }>;
}) {
  const subTotal = Number(payload.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0).toFixed(2));
  const discount = Number(Math.max(0, payload.discount || 0).toFixed(2));
  const taxable = Math.max(0, subTotal - discount);
  const taxRate = Number(sale.taxRate || 0);
  const taxAmount = !taxRate ? 0 : sale.pricesIncludeTax
    ? Number((taxable - taxable / (1 + taxRate / 100)).toFixed(2))
    : Number((taxable * (taxRate / 100)).toFixed(2));
  const total = sale.pricesIncludeTax ? Number(taxable.toFixed(2)) : Number((taxable + taxAmount).toFixed(2));

  return {
    customerId: sale.customerId ? Number(sale.customerId) : null,
    paymentType: payload.paymentType === 'credit' ? 'credit' : 'cash',
    paymentChannel: payload.paymentType === 'credit' ? 'credit' : (payload.paymentChannel === 'card' ? 'card' : 'cash'),
    discount,
    note: payload.note || '',
    paidAmount: Number(payload.paidAmount || 0),
    editReason: String(payload.editReason || '').trim(),
    managerPin: String(payload.managerPin || '').trim(),
    storeCreditUsed: 0,
    taxRate,
    pricesIncludeTax: Boolean(sale.pricesIncludeTax),
    branchId: sale.branchId ? Number(sale.branchId) : null,
    locationId: sale.locationId ? Number(sale.locationId) : null,
    items: payload.items.map((item) => ({
      productId: Number(item.productId),
      qty: Number(item.qty),
      unitName: item.unitName,
      unitMultiplier: Number(item.unitMultiplier || 1),
      price: Number(item.price),
      priceType: item.priceType === 'wholesale' ? 'wholesale' : 'retail'
    })),
    subTotal,
    taxAmount,
    total
  };
}
