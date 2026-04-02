const { DatabaseSync } = require('node:sqlite');
const { backupCorruptedDb } = require('./filesystem');

function openDatabase(filePath) {
  try {
    const candidate = new DatabaseSync(filePath);
    candidate.exec('PRAGMA schema_version');
    return candidate;
  } catch (error) {
    const message = String(error && (error.message || error.errstr) || '').toLowerCase();
    const isMalformed = message.includes('database disk image is malformed') || String(error && error.code || '').includes('ERR_SQLITE_ERROR');
    if (!isMalformed) throw error;
    backupCorruptedDb(filePath);
    const replacement = new DatabaseSync(filePath);
    replacement.exec('PRAGMA schema_version');
    return replacement;
  }
}

module.exports = { openDatabase };
