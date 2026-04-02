function createOperationalReadModels({ db }) {
    function relationalBranches() {
      return db.prepare(`
        SELECT id, name, code
        FROM branches
        WHERE is_active = 1
        ORDER BY id ASC
      `).all().map((r) => ({
        id: String(r.id),
        name: r.name || '',
        code: r.code || ''
      }));
    }

    function relationalLocations() {
      return db.prepare(`
        SELECT l.id, l.name, l.code, l.branch_id, b.name AS branch_name
        FROM stock_locations l
        LEFT JOIN branches b ON b.id = l.branch_id
        WHERE l.is_active = 1
        ORDER BY l.id ASC
      `).all().map((r) => ({
        id: String(r.id),
        name: r.name || '',
        code: r.code || '',
        branchId: r.branch_id ? String(r.branch_id) : '',
        branchName: r.branch_name || ''
      }));
    }

    function relationalStockTransfers() {
      const transfers = db.prepare(`
        SELECT t.id, t.doc_no, t.from_location_id, t.to_location_id, t.from_branch_id, t.to_branch_id, t.status, t.note,
               t.received_at, t.cancelled_at, t.created_at,
               fl.name AS from_location_name, tl.name AS to_location_name,
               fb.name AS from_branch_name, tb.name AS to_branch_name,
               cu.username AS created_by_name, ru.username AS received_by_name, xu.username AS cancelled_by_name
        FROM stock_transfers t
        LEFT JOIN stock_locations fl ON fl.id = t.from_location_id
        LEFT JOIN stock_locations tl ON tl.id = t.to_location_id
        LEFT JOIN branches fb ON fb.id = t.from_branch_id
        LEFT JOIN branches tb ON tb.id = t.to_branch_id
        LEFT JOIN users cu ON cu.id = t.created_by
        LEFT JOIN users ru ON ru.id = t.received_by
        LEFT JOIN users xu ON xu.id = t.cancelled_by
        ORDER BY t.id DESC
      `).all();
      const items = db.prepare(`SELECT id, transfer_id, product_id, product_name, qty FROM stock_transfer_items ORDER BY transfer_id ASC, id ASC`).all();
      const byTransfer = new Map();
      for (const item of items) {
        const key = String(item.transfer_id);
        if (!byTransfer.has(key)) byTransfer.set(key, []);
        byTransfer.get(key).push({ id: String(item.id), productId: String(item.product_id), productName: item.product_name || '', qty: Number(item.qty || 0) });
      }
      return transfers.map((t) => ({
        id: String(t.id), docNo: t.doc_no || `TR-${t.id}`, fromLocationId: String(t.from_location_id), toLocationId: String(t.to_location_id),
        fromBranchId: t.from_branch_id ? String(t.from_branch_id) : '', toBranchId: t.to_branch_id ? String(t.to_branch_id) : '',
        fromLocationName: t.from_location_name || '', toLocationName: t.to_location_name || '', fromBranchName: t.from_branch_name || '', toBranchName: t.to_branch_name || '',
        status: t.status || 'sent', note: t.note || '', receivedAt: t.received_at || '', cancelledAt: t.cancelled_at || '',
        createdBy: t.created_by_name || '', receivedBy: t.received_by_name || '', cancelledBy: t.cancelled_by_name || '', date: t.created_at,
        items: byTransfer.get(String(t.id)) || []
      }));
    }

    function computeShiftExpectedCash(shiftRow, endAt) {
      if (!shiftRow) return 0;
      const closeAt = endAt || shiftRow.closed_at || new Date().toISOString();
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM treasury_transactions
        WHERE created_by = ?
          AND datetime(created_at) >= datetime(?)
          AND datetime(created_at) <= datetime(?)
      `).get(shiftRow.opened_by, shiftRow.created_at, closeAt);
      return Number(Number(shiftRow.opening_cash || 0) + Number(row && row.total || 0));
    }

    function relationalCashierShifts() {
      const rows = db.prepare(`
        SELECT s.id, s.doc_no, s.branch_id, s.location_id, s.opened_by, s.opening_cash, s.opening_note, s.status,
               s.expected_cash, s.counted_cash, s.variance, s.close_note, s.closed_by, s.closed_at, s.created_at,
               b.name AS branch_name, l.name AS location_name, ou.username AS opened_by_name, cu.username AS closed_by_name
        FROM cashier_shifts s
        LEFT JOIN branches b ON b.id = s.branch_id
        LEFT JOIN stock_locations l ON l.id = s.location_id
        LEFT JOIN users ou ON ou.id = s.opened_by
        LEFT JOIN users cu ON cu.id = s.closed_by
        ORDER BY s.id DESC
      `).all();
      return rows.map((row) => {
        const effectiveExpected = (row.status || 'open') === 'open'
          ? computeShiftExpectedCash(row)
          : Number(row.expected_cash || computeShiftExpectedCash(row, row.closed_at || row.created_at));
        const movementCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM treasury_transactions WHERE created_by = ? AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`).get(row.opened_by, row.created_at, row.closed_at || new Date().toISOString()) || {}).count || 0);
        return {
          id: String(row.id),
          docNo: row.doc_no || `SHIFT-${row.id}`,
          branchId: row.branch_id ? String(row.branch_id) : '',
          branchName: row.branch_name || '',
          locationId: row.location_id ? String(row.location_id) : '',
          locationName: row.location_name || '',
          openedById: row.opened_by ? String(row.opened_by) : '',
          openedBy: row.opened_by_name || '',
          openingCash: Number(row.opening_cash || 0),
          openingNote: row.opening_note || '',
          status: row.status || 'open',
          expectedCash: Number(effectiveExpected || 0),
          countedCash: row.counted_cash == null ? null : Number(row.counted_cash || 0),
          variance: row.variance == null ? null : Number(row.variance || 0),
          closeNote: row.close_note || '',
          closedBy: row.closed_by_name || '',
          closedAt: row.closed_at || '',
          openedAt: row.created_at,
          transactionCount: movementCount
        };
      });
    }

    function relationalStockCountSessions() {
      const sessions = db.prepare(`
        SELECT s.id, s.doc_no, s.branch_id, s.location_id, s.status, s.note, s.counted_by, s.approved_by, s.posted_at, s.created_at,
               b.name AS branch_name, l.name AS location_name, cu.username AS counted_by_name, au.username AS approved_by_name
        FROM stock_count_sessions s
        LEFT JOIN branches b ON b.id = s.branch_id
        LEFT JOIN stock_locations l ON l.id = s.location_id
        LEFT JOIN users cu ON cu.id = s.counted_by
        LEFT JOIN users au ON au.id = s.approved_by
        ORDER BY s.id DESC
      `).all();
      const items = db.prepare('SELECT id, session_id, product_id, product_name, expected_qty, counted_qty, variance_qty, reason, note FROM stock_count_items ORDER BY session_id ASC, id ASC').all();
      const bySession = new Map();
      for (const item of items) {
        const key = String(item.session_id);
        if (!bySession.has(key)) bySession.set(key, []);
        bySession.get(key).push({
          id: String(item.id), productId: String(item.product_id), productName: item.product_name || '',
          expectedQty: Number(item.expected_qty || 0), countedQty: Number(item.counted_qty || 0), varianceQty: Number(item.variance_qty || 0),
          reason: item.reason || '', note: item.note || ''
        });
      }
      return sessions.map((row) => ({
        id: String(row.id), docNo: row.doc_no || `COUNT-${row.id}`, branchId: row.branch_id ? String(row.branch_id) : '', branchName: row.branch_name || '',
        locationId: row.location_id ? String(row.location_id) : '', locationName: row.location_name || '', status: row.status || 'draft', note: row.note || '',
        countedBy: row.counted_by_name || '', approvedBy: row.approved_by_name || '', postedAt: row.posted_at || '', createdAt: row.created_at,
        items: bySession.get(String(row.id)) || []
      }));
    }

    function relationalDamagedStockRecords() {
      return db.prepare(`
        SELECT d.id, d.product_id, d.branch_id, d.location_id, d.qty, d.reason, d.note, d.created_at,
               p.name AS product_name, b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
        FROM damaged_stock_records d
        LEFT JOIN products p ON p.id = d.product_id
        LEFT JOIN branches b ON b.id = d.branch_id
        LEFT JOIN stock_locations l ON l.id = d.location_id
        LEFT JOIN users u ON u.id = d.created_by
        ORDER BY d.id DESC
      `).all().map((row) => ({
        id: String(row.id), productId: String(row.product_id), productName: row.product_name || '', branchId: row.branch_id ? String(row.branch_id) : '',
        branchName: row.branch_name || '', locationId: row.location_id ? String(row.location_id) : '', locationName: row.location_name || '',
        qty: Number(row.qty || 0), reason: row.reason || 'damage', note: row.note || '', createdBy: row.created_by_name || '', date: row.created_at
      }));
    }
  return {
    relationalBranches,
    relationalLocations,
    relationalStockTransfers,
    computeShiftExpectedCash,
    relationalCashierShifts,
    relationalStockCountSessions,
    relationalDamagedStockRecords,
  };
}

module.exports = { createOperationalReadModels };
