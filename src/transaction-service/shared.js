function normalizeSalePayments(payload) {
  if ((payload.paymentType || 'cash') === 'credit') return [];
  const raw = Array.isArray(payload.payments) ? payload.payments : [];
  const payments = raw.map((entry) => ({
    paymentChannel: entry && entry.paymentChannel === 'card' ? 'card' : 'cash',
    amount: Number(entry && entry.amount || 0)
  })).filter((entry) => entry.amount > 0);
  if (payments.length) return payments;
  const fallback = Number(payload.paidAmount || 0);
  return fallback > 0 ? [{ paymentChannel: payload.paymentChannel === 'card' ? 'card' : 'cash', amount: fallback }] : [];
}

function summarizePaymentChannel(payments, paymentType) {
  if (paymentType === 'credit') return 'credit';
  const channels = Array.from(new Set((payments || []).map((entry) => entry.paymentChannel)));
  if (channels.length > 1) return 'mixed';
  return channels[0] || 'cash';
}

function safeAuditPayload(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function createStructuredAuditWriter(addAuditLog) {
  return function writeStructuredAudit(action, user, meta) {
    addAuditLog(action, JSON.stringify(safeAuditPayload({
      actorUserId: Number(user && user.id || 0),
      actorRole: String(user && user.role || ''),
      ...meta
    }, meta || {})), user && user.id ? Number(user.id) : null);
  };
}

function isCashPayment(paymentType, paymentChannel) {
  return paymentType !== 'credit' && paymentChannel !== 'card';
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function splitSaleReturnSources(sale, amount) {
  const returnAmount = Math.max(0, roundMoney(amount));
  const saleTotal = Math.max(0, Number(sale?.total || 0));
  const originalStoreCreditValue = sale?.storeCreditUsed ?? sale?.store_credit_used ?? 0;
  const originalStoreCredit = Math.max(0, Math.min(Number(originalStoreCreditValue), saleTotal));
  if (!(returnAmount > 0) || !(saleTotal > 0) || !(originalStoreCredit > 0)) {
    return { storeCreditPortion: 0, remainingPortion: returnAmount };
  }
  const proportionalStoreCredit = roundMoney((returnAmount * originalStoreCredit) / saleTotal);
  const storeCreditPortion = Math.min(returnAmount, proportionalStoreCredit);
  return {
    storeCreditPortion,
    remainingPortion: roundMoney(returnAmount - storeCreditPortion)
  };
}

function hasOpenCashierShiftForUser(db, userId) {
  if (!userId) return false;
  return Boolean(db.prepare("SELECT id FROM cashier_shifts WHERE opened_by = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(userId));
}

module.exports = {
  normalizeSalePayments,
  summarizePaymentChannel,
  safeAuditPayload,
  createStructuredAuditWriter,
  isCashPayment,
  roundMoney,
  splitSaleReturnSources,
  hasOpenCashierShiftForUser,
};
