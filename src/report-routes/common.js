const { respondError } = require('../http/respond');

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

function withReportError(res, fallbackMessage, callback) {
  try {
    return callback();
  } catch (error) {
    return respondError(res, error, fallbackMessage);
  }
}

module.exports = { sendCsv, buildScopedRange, withReportError };
