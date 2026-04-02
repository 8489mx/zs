const { toTrimmedString } = require('./shared');

function normalizeCategory(body) {
  const payload = body || {};
  return { name: toTrimmedString(payload.name) };
}

function normalizeSupplier(body) {
  const payload = body || {};
  return {
    name: toTrimmedString(payload.name),
    phone: toTrimmedString(payload.phone),
    address: toTrimmedString(payload.address),
    balance: Number(payload.balance || 0),
    notes: toTrimmedString(payload.notes)
  };
}

function normalizeCustomer(body) {
  const payload = body || {};
  return {
    name: toTrimmedString(payload.name),
    phone: toTrimmedString(payload.phone),
    address: toTrimmedString(payload.address),
    balance: Number(payload.balance || 0),
    type: payload.type === 'vip' ? 'vip' : 'cash',
    creditLimit: Number(payload.creditLimit || 0),
    storeCreditBalance: Number(payload.storeCreditBalance || 0),
    companyName: toTrimmedString(payload.companyName),
    taxNumber: toTrimmedString(payload.taxNumber)
  };
}

module.exports = { normalizeCategory, normalizeSupplier, normalizeCustomer };
