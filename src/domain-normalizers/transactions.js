const { toTrimmedString, toNullableNumber, toBooleanFlag } = require('./shared');

function normalizeIncomingSale(body) {
  const payload = body || {};
  const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
  const normalizedPayments = paymentType === 'credit'
    ? []
    : (Array.isArray(payload.payments) ? payload.payments : []).map((entry) => ({
      paymentChannel: entry && entry.paymentChannel === 'card' ? 'card' : 'cash',
      amount: Number(entry && entry.amount || 0)
    })).filter((entry) => entry.amount > 0);
  const fallbackPaidAmount = Number(payload.paidAmount || 0);
  const payments = normalizedPayments.length
    ? normalizedPayments
    : (paymentType === 'credit' || fallbackPaidAmount <= 0
      ? []
      : [{ paymentChannel: payload.paymentChannel === 'card' ? 'card' : 'cash', amount: fallbackPaidAmount }]);
  const paymentChannel = paymentType === 'credit'
    ? 'credit'
    : (payments.length > 1 ? 'mixed' : (payments[0]?.paymentChannel || (payload.paymentChannel === 'card' ? 'card' : 'cash')));

  return {
    customerId: toNullableNumber(payload.customerId),
    paymentType,
    paymentChannel,
    payments,
    discount: Number(payload.discount || 0),
    note: toTrimmedString(payload.note),
    paidAmount: payments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    storeCreditUsed: Number(payload.storeCreditUsed || 0),
    taxRate: Number(payload.taxRate || 0),
    pricesIncludeTax: toBooleanFlag(payload.pricesIncludeTax),
    branchId: toNullableNumber(payload.branchId),
    locationId: toNullableNumber(payload.locationId),
    items: Array.isArray(payload.items) ? payload.items.map((item) => ({
      productId: Number(item.productId || item.id || 0),
      qty: Number(item.qty || 0),
      unitId: toNullableNumber(item.unitId),
      unitName: toTrimmedString(item.unitName, 'قطعة') || 'قطعة',
      unitMultiplier: Number(item.unitMultiplier || 1) || 1,
      price: Number(item.price || 0),
      priceType: item.priceType === 'wholesale' ? 'wholesale' : 'retail'
    })).filter((item) => item.productId > 0 && item.qty > 0) : []
  };
}

function normalizeIncomingPurchase(body) {
  const payload = body || {};
  return {
    supplierId: toNullableNumber(payload.supplierId),
    paymentType: payload.paymentType === 'credit' ? 'credit' : 'cash',
    discount: Number(payload.discount || 0),
    note: toTrimmedString(payload.note),
    taxRate: Number(payload.taxRate || 0),
    pricesIncludeTax: toBooleanFlag(payload.pricesIncludeTax),
    branchId: toNullableNumber(payload.branchId),
    locationId: toNullableNumber(payload.locationId),
    items: Array.isArray(payload.items) ? payload.items.map((item) => ({
      productId: Number(item.productId || item.id || 0),
      name: toTrimmedString(item.name),
      qty: Number(item.qty || 0),
      cost: Number(item.cost || 0),
      unitId: toNullableNumber(item.unitId),
      unitName: toTrimmedString(item.unitName, 'قطعة') || 'قطعة',
      unitMultiplier: Number(item.unitMultiplier || 1) || 1
    })).filter((item) => item.productId > 0 && item.qty > 0) : []
  };
}

function normalizeInventoryAdjustment(body) {
  const payload = body || {};
  const actionType = payload.actionType === 'add' || payload.actionType === 'deduct' ? payload.actionType : 'adjust';
  const quantity = Number(payload.qty);
  return {
    productId: Number(payload.productId || 0),
    actionType,
    qty: Number.isFinite(quantity) ? quantity : NaN,
    reason: toTrimmedString(payload.reason),
    note: toTrimmedString(payload.note),
    branchId: toNullableNumber(payload.branchId),
    locationId: toNullableNumber(payload.locationId),
    managerPin: toTrimmedString(payload.managerPin)
  };
}

module.exports = {
  normalizeIncomingSale,
  normalizeIncomingPurchase,
  normalizeInventoryAdjustment,
};
