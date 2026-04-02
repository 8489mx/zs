const { toTrimmedString, toNullableNumber } = require('./shared');

function normalizeIncomingProduct(body) {
  const payload = body || {};
  const units = Array.isArray(payload.units) && payload.units.length
    ? payload.units
    : [{ name: payload.baseUnit || 'قطعة', multiplier: 1, barcode: payload.barcode || '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }];
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const normalizedUnits = units.map((u, index) => ({
    id: u.id ? Number(u.id) : null,
    name: toTrimmedString(u.name) || (index === 0 ? 'قطعة' : 'وحدة'),
    multiplier: Number(u.multiplier || 1) || 1,
    barcode: toTrimmedString(u.barcode),
    isBaseUnit: Boolean(u.isBaseUnit) || Number(u.multiplier || 1) === 1 || index === 0,
    isSaleUnit: Boolean(u.isSaleUnit),
    isPurchaseUnit: Boolean(u.isPurchaseUnit)
  }));

  if (!normalizedUnits.some((unit) => unit.isBaseUnit)) {
    normalizedUnits[0].isBaseUnit = true;
    normalizedUnits[0].multiplier = 1;
  }
  const baseUnits = normalizedUnits.filter((unit) => unit.isBaseUnit);
  if (baseUnits.length !== 1) throw new Error('Product must have exactly one base unit');
  const baseUnit = baseUnits[0];
  baseUnit.multiplier = 1;
  if (!normalizedUnits.some((unit) => unit.isSaleUnit)) baseUnit.isSaleUnit = true;
  if (!normalizedUnits.some((unit) => unit.isPurchaseUnit)) baseUnit.isPurchaseUnit = true;
  if (normalizedUnits.filter((unit) => unit.isSaleUnit).length !== 1) throw new Error('Choose exactly one default sale unit');
  if (normalizedUnits.filter((unit) => unit.isPurchaseUnit).length !== 1) throw new Error('Choose exactly one default purchase unit');

  const seenNames = new Set();
  const seenBarcodes = new Set();
  for (const unit of normalizedUnits) {
    if (!(Number(unit.multiplier || 0) > 0)) throw new Error('Unit multiplier must be greater than zero');
    const key = String(unit.name || '').trim().toLowerCase();
    if (!key) throw new Error('Unit name is required');
    if (seenNames.has(key)) throw new Error('Unit names must be unique per product');
    seenNames.add(key);
    if (unit.barcode) {
      const barcodeKey = String(unit.barcode).trim();
      if (seenBarcodes.has(barcodeKey)) throw new Error('Unit barcodes must be unique per product');
      seenBarcodes.add(barcodeKey);
    }
  }

  const normalized = {
    name: toTrimmedString(payload.name),
    barcode: toTrimmedString(payload.barcode),
    categoryId: toNullableNumber(payload.categoryId),
    supplierId: toNullableNumber(payload.supplierId),
    costPrice: Number(payload.costPrice || 0),
    retailPrice: Number(payload.retailPrice || 0),
    wholesalePrice: Number(payload.wholesalePrice || 0),
    minStock: Number(payload.minStock || 0),
    notes: toTrimmedString(payload.notes),
    units: normalizedUnits,
    offers: Array.isArray(payload.offers) ? payload.offers.map((offer) => ({
      type: offer.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(offer.value || 0),
      from: offer.from || null,
      to: offer.to || null
    })).filter((offer) => offer.value > 0) : [],
    customerPrices: Array.isArray(payload.customerPrices) ? payload.customerPrices.map((customerPrice) => ({
      customerId: Number(customerPrice.customerId || 0),
      price: Number(customerPrice.price || 0)
    })).filter((customerPrice) => customerPrice.customerId > 0) : []
  };

  if (hasOwn('stock')) {
    normalized.stock = Number(payload.stock || 0);
  }
  return normalized;
}

function replaceProductRelations(db, productId, payload) {
  db.prepare('DELETE FROM product_units WHERE product_id = ?').run(productId);
  db.prepare('DELETE FROM product_offers WHERE product_id = ?').run(productId);
  db.prepare('DELETE FROM product_customer_prices WHERE product_id = ?').run(productId);

  for (const unit of payload.units) {
    db.prepare('INSERT INTO product_units (product_id, name, multiplier, barcode, is_base_unit, is_sale_unit_default, is_purchase_unit_default) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(productId, unit.name, Number(unit.multiplier || 1), unit.barcode || null, unit.isBaseUnit ? 1 : 0, unit.isSaleUnit ? 1 : 0, unit.isPurchaseUnit ? 1 : 0);
  }
  for (const offer of payload.offers) {
    db.prepare('INSERT INTO product_offers (product_id, offer_type, value, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(productId, offer.type, Number(offer.value || 0), offer.from || null, offer.to || null);
  }
  for (const customerPrice of payload.customerPrices) {
    db.prepare('INSERT INTO product_customer_prices (product_id, customer_id, price) VALUES (?, ?, ?)')
      .run(productId, customerPrice.customerId, Number(customerPrice.price || 0));
  }
}

module.exports = { normalizeIncomingProduct, replaceProductRelations };
