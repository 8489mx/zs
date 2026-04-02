function sendCsv(res, filename, headers, rows, csvFromRows) {
  const csv = csvFromRows(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
}

function buildScopedRange(parseDateRange, query) {
  return Object.assign({}, parseDateRange(query || {}), {
    branchId: query && query.branchId ? String(query.branchId) : '',
    locationId: query && query.locationId ? String(query.locationId) : '',
  });
}

function respondReportError(res, err, fallbackMessage) {
  res.status(err.statusCode || 400).json({ error: err.message || fallbackMessage });
}

module.exports = { sendCsv, buildScopedRange, respondReportError };
