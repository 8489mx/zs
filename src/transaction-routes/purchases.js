const { buildPurchasesListResponse } = require('../transaction-query-service');

function registerPurchaseRoutes(deps) {
  const {
    app, authMiddleware, requirePermission, normalizeIncomingPurchase, createPurchaseRecord,
    cancelPurchaseRecord, updatePurchaseRecord, createSupplierPaymentRecord,
    relationalPurchases, relationalProducts, relationalSuppliers, relationalTreasury,
    relationalSupplierPayments, helpers,
  } = deps;

  app.get('/api/purchases', authMiddleware, requirePermission('purchases'), (req, res) => {
    res.json(buildPurchasesListResponse(relationalPurchases() || [], req.query || {}));
  });

  app.post('/api/purchases', authMiddleware, requirePermission('purchases'), (req, res) => {
    try {
      const purchase = createPurchaseRecord(normalizeIncomingPurchase(req.body || {}), req.user);
      res.status(201).json({ ok: true, purchase, purchases: relationalPurchases(), products: relationalProducts(), suppliers: relationalSuppliers(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not create purchase');
    }
  });

  app.post('/api/purchases/:id/cancel', authMiddleware, requirePermission('canEditInvoices'), (req, res) => {
    try {
      const purchase = cancelPurchaseRecord(Number(req.params.id), (req.body || {}).reason || '', req.user, (req.body || {}).managerPin || '');
      res.json({ ok: true, purchase, purchases: relationalPurchases(), products: relationalProducts(), suppliers: relationalSuppliers(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not cancel purchase');
    }
  });

  app.put('/api/purchases/:id', authMiddleware, requirePermission('canEditInvoices'), (req, res) => {
    try {
      const purchase = updatePurchaseRecord(Number(req.params.id), req.body || {}, req.user, (req.body || {}).managerPin || '');
      res.json({ ok: true, purchase, purchases: relationalPurchases(), products: relationalProducts(), suppliers: relationalSuppliers(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not update purchase');
    }
  });

  app.get('/api/supplier-payments', authMiddleware, requirePermission('accounts'), (_req, res) => {
    res.json({ supplierPayments: relationalSupplierPayments() || [] });
  });

  app.post('/api/supplier-payments', authMiddleware, requirePermission('accounts'), (req, res) => {
    try {
      const result = createSupplierPaymentRecord(req.body || {}, req.user);
      res.status(201).json({ ...result, supplierPayments: relationalSupplierPayments(), suppliers: relationalSuppliers(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not create supplier payment');
    }
  });
}

module.exports = { registerPurchaseRoutes };
