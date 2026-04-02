const { normalizeSalePayments, summarizePaymentChannel, createStructuredAuditWriter } = require('./shared');

function createHeldSaleDraftHandlers(deps) {
  const {
    db,
    addAuditLog,
    resolveBranchLocationScope,
  } = deps;

  const writeStructuredAudit = createStructuredAuditWriter(addAuditLog);

    function listHeldSaleDrafts() {
      const rows = db.prepare(`
        SELECT hs.id, hs.customer_id, hs.payment_type, hs.payment_channel, hs.paid_amount, hs.cash_amount, hs.card_amount, hs.discount, hs.note, hs.search, hs.price_type,
               hs.branch_id, hs.location_id, hs.created_at, c.name AS customer_name
        FROM held_sales hs
        LEFT JOIN customers c ON c.id = hs.customer_id
        ORDER BY hs.id DESC
      `).all();
      const items = db.prepare(`
        SELECT id, held_sale_id, product_id, product_name, qty, unit_price, unit_name, unit_multiplier, price_type
        FROM held_sale_items
        ORDER BY held_sale_id ASC, id ASC
      `).all();
      const itemsByDraft = new Map();
      for (const item of items) {
        const key = String(item.held_sale_id);
        if (!itemsByDraft.has(key)) itemsByDraft.set(key, []);
        itemsByDraft.get(key).push({
          productId: item.product_id ? String(item.product_id) : '',
          name: item.product_name || '',
          qty: Number(item.qty || 0),
          price: Number(item.unit_price || 0),
          unitName: item.unit_name || 'قطعة',
          unitMultiplier: Number(item.unit_multiplier || 1),
          priceType: item.price_type || 'retail',
          lineKey: `${item.product_id || ''}::${item.unit_name || 'قطعة'}::${item.price_type || 'retail'}`,
        });
      }
      return rows.map((row) => ({
        id: String(row.id),
        savedAt: row.created_at,
        customerId: row.customer_id ? String(row.customer_id) : '',
        customerName: row.customer_name || '',
        paymentType: row.payment_type === 'credit' ? 'credit' : 'cash',
        paymentChannel: row.payment_type === 'credit' ? 'credit' : (row.payment_channel || 'cash'),
        paidAmount: Number(row.paid_amount || 0),
        cashAmount: Number(row.cash_amount || 0),
        cardAmount: Number(row.card_amount || 0),
        discount: Number(row.discount || 0),
        note: row.note || '',
        search: row.search || '',
        priceType: row.price_type || 'retail',
        branchId: row.branch_id ? String(row.branch_id) : '',
        locationId: row.location_id ? String(row.location_id) : '',
        cart: itemsByDraft.get(String(row.id)) || []
      }));
    }

    function saveHeldSaleDraft(payload, user) {
      const tx = db.transaction(() => {
        const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: payload.branchId || null, locationId: payload.locationId || null };
        const items = Array.isArray(payload.items) ? payload.items.map((item) => ({
          productId: Number(item.productId || 0),
          productName: String(item.name || item.productName || '').trim(),
          qty: Number(item.qty || 0),
          unitPrice: Number(item.price || item.unitPrice || 0),
          unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
          unitMultiplier: Number(item.unitMultiplier || 1) || 1,
          priceType: item.priceType === 'wholesale' ? 'wholesale' : 'retail'
        })).filter((item) => item.productId > 0 && item.qty > 0) : [];
        if (!items.length) throw new Error('لا يمكن حفظ فاتورة معلقة فارغة');
        const cashAmount = Math.max(0, Number(payload.cashAmount || 0));
        const cardAmount = Math.max(0, Number(payload.cardAmount || 0));
        const paidAmount = Number((cashAmount + cardAmount).toFixed(2));
        const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
        const paymentChannel = paymentType === 'credit' ? 'credit' : summarizePaymentChannel(normalizeSalePayments({ paymentType, payments: [{ paymentChannel: 'cash', amount: cashAmount }, { paymentChannel: 'card', amount: cardAmount }] }), paymentType);
        const result = db.prepare(`
          INSERT INTO held_sales (customer_id, payment_type, payment_channel, paid_amount, cash_amount, card_amount, discount, note, search, price_type, branch_id, location_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          payload.customerId ? Number(payload.customerId) : null,
          paymentType,
          paymentChannel,
          paidAmount,
          cashAmount,
          cardAmount,
          Number(payload.discount || 0),
          String(payload.note || '').trim(),
          String(payload.search || '').trim(),
          payload.priceType === 'wholesale' ? 'wholesale' : 'retail',
          scope.branchId,
          scope.locationId,
          user && user.id ? Number(user.id) : null
        );
        const heldSaleId = Number(result.lastInsertRowid || 0);
        for (const item of items) {
          db.prepare(`
            INSERT INTO held_sale_items (held_sale_id, product_id, product_name, qty, unit_price, unit_name, unit_multiplier, price_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(heldSaleId, item.productId, item.productName, item.qty, item.unitPrice, item.unitName, item.unitMultiplier, item.priceType);
        }
        const savedDraft = listHeldSaleDrafts().find((entry) => Number(entry.id) === heldSaleId) || null;
        writeStructuredAudit('حفظ فاتورة معلقة', user, {
          before: null,
          after: {
            id: heldSaleId,
            customerId: payload.customerId ? Number(payload.customerId) : null,
            paymentType,
            paymentChannel,
            paidAmount,
            cashAmount,
            cardAmount,
            discount: Number(payload.discount || 0),
            branchId: scope.branchId,
            locationId: scope.locationId,
            items: items.map((item) => ({ productId: item.productId, qty: Number(item.qty || 0), unitPrice: Number(item.unitPrice || 0), unitName: item.unitName, unitMultiplier: Number(item.unitMultiplier || 1), priceType: item.priceType }))
          }
        });
        return savedDraft;
      });
      return tx();
    }

    function deleteHeldSaleDraft(heldSaleId) {
      const id = Number(heldSaleId || 0);
      if (!(id > 0)) throw new Error('Held draft not found');
      db.prepare('DELETE FROM held_sales WHERE id = ?').run(id);
      return { ok: true };
    }

    function clearHeldSaleDrafts() {
      db.prepare('DELETE FROM held_sales').run();
      return { ok: true };
    }
  return {
    listHeldSaleDrafts,
    saveHeldSaleDraft,
    deleteHeldSaleDraft,
    clearHeldSaleDrafts,
  };
}

module.exports = { createHeldSaleDraftHandlers };
