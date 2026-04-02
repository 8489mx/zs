function createSystemRouteContexts(options) {
  const {
    defaultUsersState,
    db,
    normalizeIncomingProduct,
    normalizeCustomer,
    normalizeSupplier,
    replaceProductRelations,
    relationalProducts,
    relationalCustomers,
    relationalSuppliers,
    relationalCategories,
    relationalStockMovements,
    persistRelationalState,
    addAuditLog,
  } = options;

  return {
    withUserLookup: require('./common').createWithUserLookup(defaultUsersState),
    importOperations: require('./import-operations').createImportOperations({
      db,
      normalizeIncomingProduct,
      normalizeCustomer,
      normalizeSupplier,
      replaceProductRelations,
      relationalProducts,
      relationalCustomers,
      relationalSuppliers,
      relationalCategories,
      relationalStockMovements,
      persistRelationalState,
      addAuditLog,
    }),
  };
}

module.exports = { createSystemRouteContexts };
