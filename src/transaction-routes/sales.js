const { buildSalesListResponse } = require('../transaction-query-service');
const { buildSalesMutationResponse } = require('./sales-response');

function registerSalesRoutes(deps) {
  const {
    app, authMiddleware, requirePermission, requireAnyPermission, normalizeIncomingSale,
    createSaleRecord, listHeldSaleDrafts, saveHeldSaleDraft, deleteHeldSaleDraft,
    clearHeldSaleDrafts, cancelSaleRecord, updateSaleRecord, createCustomerPayment,
    relationalSales, relationalProducts, relationalCustomers, relationalTreasury, helpers,
  } = deps;

  app.get('/api/sales', authMiddleware, requireAnyPermission(['sales', 'reports']), (req, res) => {
    res.json(buildSalesListResponse(relationalSales() || [], req.query || {}));
  });

  app.get('/api/sales/:id', authMiddleware, requireAnyPermission(['sales', 'reports']), (req, res) => {
    const saleId = Number(req.params.id);
    const sale = relationalSales().find((entry) => Number(entry.id) === saleId);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json({ sale });
  });

  app.get('/api/held-sales', authMiddleware, requirePermission('sales'), (_req, res) => {
    try {
      res.json({ heldSales: listHeldSaleDrafts() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not load held drafts');
    }
  });

  app.post('/api/held-sales', authMiddleware, requirePermission('sales'), (req, res) => {
    try {
      const draft = saveHeldSaleDraft(req.body || {}, req.user);
      res.status(201).json({ ok: true, draft, heldSales: listHeldSaleDrafts() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not save held draft');
    }
  });

  app.delete('/api/held-sales', authMiddleware, requirePermission('sales'), (req, res) => {
    try {
      const beforeCount = listHeldSaleDrafts().length;
      clearHeldSaleDrafts();
      helpers.writeStructuredAudit('حذف كل الفواتير المعلقة', req.user, { reason: 'manual_clear', before: { draftsCount: beforeCount }, after: { draftsCount: 0 } });
      res.json({ ok: true, heldSales: listHeldSaleDrafts() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not clear held drafts');
    }
  });

  app.delete('/api/held-sales/:id', authMiddleware, requirePermission('sales'), (req, res) => {
    try {
      const heldSaleId = Number(req.params.id);
      const beforeDraft = listHeldSaleDrafts().find((entry) => Number(entry.id) === heldSaleId) || null;
      deleteHeldSaleDraft(heldSaleId);
      helpers.writeStructuredAudit('حذف فاتورة معلقة', req.user, { before: beforeDraft, after: { id: heldSaleId, deleted: true } });
      res.json({ ok: true, heldSales: listHeldSaleDrafts() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not delete held draft');
    }
  });

  app.post('/api/sales', authMiddleware, requirePermission('sales'), (req, res) => {
    try {
      const payload = normalizeIncomingSale(req.body || {});
      const sale = createSaleRecord(payload, req.user);
      res.status(201).json(buildSalesMutationResponse({ sale, relationalSales, relationalProducts, relationalCustomers, relationalTreasury }));
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not create sale');
    }
  });

  app.post('/api/sales/:id/cancel', authMiddleware, requirePermission('canEditInvoices'), (req, res) => {
    try {
      const sale = cancelSaleRecord(Number(req.params.id), (req.body || {}).reason || '', req.user, (req.body || {}).managerPin || '');
      res.json(buildSalesMutationResponse({ sale, relationalSales, relationalProducts, relationalCustomers, relationalTreasury }));
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not cancel sale');
    }
  });

  app.put('/api/sales/:id', authMiddleware, requirePermission('canEditInvoices'), (req, res) => {
    try {
      const sale = updateSaleRecord(Number(req.params.id), req.body || {}, req.user, (req.body || {}).managerPin || '');
      res.json(buildSalesMutationResponse({ sale, relationalSales, relationalProducts, relationalCustomers, relationalTreasury }));
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not update sale');
    }
  });

  app.post('/api/customer-payments', authMiddleware, requirePermission('accounts'), (req, res) => {
    try {
      const result = createCustomerPayment(req.body || {}, req.user);
      res.status(201).json({ ...result, customers: relationalCustomers(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not create customer payment');
    }
  });
}

module.exports = { registerSalesRoutes };
