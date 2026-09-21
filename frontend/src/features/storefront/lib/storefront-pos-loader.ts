import { storefrontApi } from '../api/storefront.api';
import { persistDraftSnapshot } from '@/features/pos/lib/pos.persistence';
import type { PosItem } from '@/features/pos/types/pos.types';

export async function loadOnlineOrderIntoPosCart(orderId: number, navigate: (to: string) => void) {
  const data = await storefrontApi.preparePos(orderId);

  const posItems: PosItem[] = data.items.map((it) => ({
    lineKey: `${it.productId}::default::retail`,
    productId: String(it.productId),
    name: it.name,
    unitId: 'default',
    unitName: it.unitName || 'قطعة',
    unitMultiplier: 1,
    price: Number(it.price),
    costPrice: Number(it.costPrice || 0),
    qty: Number(it.qty || 1),
    stockLimit: Number(it.stockQty || 9999),
    currentStock: Number(it.stockQty || 9999),
    minStock: 0,
    priceType: 'retail',
  }));

  const baseNote = data.customerNotes && data.customerNotes.trim()
    ? data.customerNotes.trim()
    : `طلب متجر إلكتروني #${data.orderNumber}`;
  const noteText = data.couponCode ? `${baseNote} - كوبون ${data.couponCode}` : baseNote;

  persistDraftSnapshot({
    cart: posItems,
    customerId: data.customerId ? String(data.customerId) : '',
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    customerAddress: data.customerAddress || '',
    quickCustomerName: data.customerName || '',
    quickCustomerPhone: data.customerPhone || '',
    quickCustomerAddress: data.customerAddress || '',
    deliveryFee: Number(data.deliveryFee || 0),
    // The coupon discount quoted to the customer at checkout (O55). Dropping it here overcharged them.
    discount: Number(data.discountAmount || 0),
    orderType: data.orderType === 'dine_in' ? 'dine_in' : 'delivery',
    note: noteText,
    paymentType: 'cash',
    paymentChannel: data.paymentMethod === 'instapay_wallet' ? 'instapay' : 'cash',
    paidAmount: 0,
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
    search: '',
    priceType: 'retail',
    tableNumber: data.orderType === 'dine_in' ? (data.tableNumber || '') : '',
    branchId: '',
    locationId: '',
    deliveryRepId: '',
    onlineOrderId: data.orderId,
  } as any);

  try {
    localStorage.setItem('zs_pos_online_order_id', String(data.orderId));
    localStorage.setItem('zs_pos_online_order_number', String(data.orderNumber));
  } catch {}

  navigate('/pos');
  return data;
}
