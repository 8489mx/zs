function normalizeImportText(value, maxLength = 255) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function normalizeImportNumber(value, fallback = 0) {
  const normalized = String(value == null ? '' : value).replace(/,/g, '').trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getImportRows(req) {
  const rows = req.body && req.body.rows;
  if (!Array.isArray(rows)) {
    const err = new Error('rows must be an array');
    err.statusCode = 400;
    throw err;
  }
  return rows;
}

function createImportSummary() {
  return { created: 0, updated: 0, skipped: 0, errors: [] };
}

module.exports = {
  normalizeImportText,
  normalizeImportNumber,
  getImportRows,
  createImportSummary,
};
