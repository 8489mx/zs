const { buildCashierShiftsListResponse } = require('../transaction-query-service');

function registerCashierRoutes(deps) {
  const {
    app, db, authMiddleware, requirePermission, requireAnyPermission,
    relationalCashierShifts, relationalTreasury, addTreasuryTransaction,
    computeShiftExpectedCash, makeDocNo, resolveBranchLocationScope, assertManagerPin, helpers,
  } = deps;

  app.get('/api/cashier-shifts', authMiddleware, requireAnyPermission(['cashDrawer', 'treasury']), (req, res) => {
    res.json(buildCashierShiftsListResponse(relationalCashierShifts(), req.query || {}));
  });

  app.post('/api/cashier-shifts/open', authMiddleware, requirePermission('cashDrawer'), (req, res) => {
    try {
      const payload = req.body || {};
      const openingCash = Number(payload.openingCash || 0);
      const openingNote = String(payload.note || '').trim();
      const active = helpers.getActiveCashierShiftForUser(req.user.id);
      if (active) throw new Error('يوجد وردية مفتوحة بالفعل لهذا المستخدم');
      const scope = resolveBranchLocationScope
        ? resolveBranchLocationScope({ branchId: payload.branchId || null, locationId: payload.locationId || null }, req.user)
        : { branchId: payload.branchId ? Number(payload.branchId) : null, locationId: payload.locationId ? Number(payload.locationId) : null };
      const branchId = scope.branchId;
      const locationId = scope.locationId;
      const result = db.prepare(`INSERT INTO cashier_shifts (doc_no, branch_id, location_id, opened_by, opening_cash, opening_note, status, expected_cash) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`).run(null, branchId, locationId, req.user.id, openingCash, openingNote, openingCash);
      const shiftId = Number(result.lastInsertRowid || 0);
      const docNo = makeDocNo('SHIFT', shiftId);
      db.prepare('UPDATE cashier_shifts SET doc_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(docNo, shiftId);
      helpers.writeStructuredAudit('فتح وردية كاشير', req.user, { before: null, after: { id: shiftId, docNo, openingCash, openingNote, branchId, locationId, status: 'open' } });
      res.status(201).json({ ok: true, cashierShifts: relationalCashierShifts() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not open cashier shift');
    }
  });

  app.post('/api/cashier-shifts/:id/cash-movement', authMiddleware, requirePermission('cashDrawer'), (req, res) => {
    try {
      const shiftId = Number(req.params.id || 0);
      const payload = req.body || {};
      const movementType = String(payload.type || '').trim() === 'cash_out' ? 'cash_out' : 'cash_in';
      const amount = Number(payload.amount || 0);
      const note = String(payload.note || '').trim();
      const managerPin = String(payload.managerPin || '').trim();
      if (!(amount > 0)) throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      if (note.length < 8) throw new Error('اكتب سبب الحركة بوضوح في 8 أحرف على الأقل');
      const shift = db.prepare('SELECT * FROM cashier_shifts WHERE id = ?').get(shiftId);
      if (!shift) throw new Error('الوردية غير موجودة');
      if ((shift.status || 'open') !== 'open') throw new Error('لا يمكن تسجيل حركة على وردية مغلقة');
      if (Number(shift.opened_by || 0) !== Number(req.user.id || 0) && !['admin','super_admin'].includes(String(req.user.role || ''))) throw new Error('غير مسموح لك بتعديل هذه الوردية');
      if (movementType === 'cash_out') assertManagerPin(managerPin);
      const before = { id: shiftId, docNo: shift.doc_no || shift.id, expectedCash: Number(shift.expected_cash || 0), status: shift.status || 'open' };
      const signedAmount = movementType === 'cash_out' ? -Math.abs(amount) : Math.abs(amount);
      addTreasuryTransaction(movementType, signedAmount, `وردية ${shift.doc_no || shift.id}: ${note}`, 'cashier_shift', shiftId, req.user.id);
      const refreshed = db.prepare('SELECT * FROM cashier_shifts WHERE id = ?').get(shiftId);
      const expectedCash = computeShiftExpectedCash(refreshed);
      db.prepare('UPDATE cashier_shifts SET expected_cash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(expectedCash, shiftId);
      helpers.writeStructuredAudit('حركة درج نقدية', req.user, { reason: note, before, after: { id: shiftId, docNo: shift.doc_no || shift.id, movementType, amount: signedAmount, expectedCash, status: 'open' } });
      res.status(201).json({ ok: true, cashierShifts: relationalCashierShifts(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not record drawer movement');
    }
  });

  app.post('/api/cashier-shifts/:id/close', authMiddleware, requirePermission('cashDrawer'), (req, res) => {
    try {
      const shiftId = Number(req.params.id || 0);
      const payload = req.body || {};
      const countedCash = Number(payload.countedCash || 0);
      const closeNote = String(payload.note || '').trim();
      const managerPin = String(payload.managerPin || '').trim();
      if (!(countedCash >= 0)) throw new Error('المبلغ المعدود لا يمكن أن يكون سالبًا');
      const shift = db.prepare('SELECT * FROM cashier_shifts WHERE id = ?').get(shiftId);
      if (!shift) throw new Error('الوردية غير موجودة');
      if ((shift.status || 'open') !== 'open') throw new Error('الوردية مغلقة بالفعل');
      if (Number(shift.opened_by || 0) !== Number(req.user.id || 0) && !['admin','super_admin'].includes(String(req.user.role || ''))) throw new Error('غير مسموح لك بإغلاق هذه الوردية');
      const expectedCash = computeShiftExpectedCash(shift, new Date().toISOString());
      const variance = Number((countedCash - expectedCash).toFixed(2));
      assertManagerPin(managerPin);
      if (Math.abs(variance) >= 0.01 && closeNote.length < 8) throw new Error('اكتب سبب فرق الجرد بوضوح في 8 أحرف على الأقل قبل إغلاق الوردية');
      const before = { id: shiftId, docNo: shift.doc_no || shift.id, expectedCash: Number(shift.expected_cash || 0), status: shift.status || 'open' };
      db.prepare(`UPDATE cashier_shifts SET status = 'closed', expected_cash = ?, counted_cash = ?, variance = ?, close_note = ?, closed_by = ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(expectedCash, countedCash, variance, closeNote, req.user.id, shiftId);
      helpers.writeStructuredAudit('إغلاق وردية كاشير', req.user, { reason: closeNote, before, after: { id: shiftId, docNo: shift.doc_no || shift.id, expectedCash, countedCash, variance, status: 'closed' } });
      res.json({ ok: true, cashierShifts: relationalCashierShifts(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not close cashier shift');
    }
  });
}

module.exports = { registerCashierRoutes };
