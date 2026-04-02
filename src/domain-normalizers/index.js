const { createAssertManagerPin } = require('./manager-pin');
const {
  normalizeIncomingSale,
  normalizeIncomingPurchase,
  normalizeInventoryAdjustment,
} = require('./transactions');
const { normalizeIncomingProduct, replaceProductRelations } = require('./products');
const { normalizeCategory, normalizeSupplier, normalizeCustomer } = require('./entities');

function createDomainNormalizers({ db, getSetting }) {
  return {
    assertManagerPin: createAssertManagerPin({ db, getSetting }),
    normalizeIncomingSale,
    normalizeIncomingPurchase,
    normalizeIncomingProduct,
    normalizeInventoryAdjustment,
    replaceProductRelations: (productId, payload) => replaceProductRelations(db, productId, payload),
    normalizeCategory,
    normalizeSupplier,
    normalizeCustomer,
  };
}

module.exports = { createDomainNormalizers };
