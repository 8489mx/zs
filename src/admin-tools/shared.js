const fs = require('fs');
const path = require('path');
const config = require('../config');
const pkg = require('../../package.json');

let _db = null;

function getDb() {
  if (!_db) _db = require('../db');
  return _db;
}

function safeCount(table, where = '') {
  const sql = `SELECT COUNT(*) AS c FROM ${table} ${where}`;
  return Number((getDb().prepare(sql).get() || {}).c || 0);
}

function safeSum(table, column, where = '') {
  const sql = `SELECT COALESCE(SUM(${column}), 0) AS total FROM ${table} ${where}`;
  return Number((getDb().prepare(sql).get() || {}).total || 0);
}

function normalizeBackupPayload(payload) {
  return payload && typeof payload === 'object' ? payload : {};
}

function escapeCsvCell(value) {
  const raw = value == null ? '' : String(value);
  if (/[\,\"\n]/.test(raw)) return '"' + raw.replace(/"/g, '""') + '"';
  return raw;
}

function csvFromRows(headers, rows) {
  const lines = [];
  lines.push(headers.map(escapeCsvCell).join(','));
  rows.forEach((row) => {
    const values = headers.map((header) => escapeCsvCell(row[header]));
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

function resolveDbFile() {
  return getDb().__dbFile || path.join(__dirname, '..', '..', 'data', 'zstore.db');
}

function getDbFileInfo() {
  const file = resolveDbFile();
  try {
    const stat = fs.statSync(file);
    return {
      file,
      sizeBytes: stat.size,
      sizeMb: Number((stat.size / 1024 / 1024).toFixed(2)),
      modifiedAt: new Date(stat.mtimeMs).toISOString()
    };
  } catch {
    return { file, sizeBytes: 0, sizeMb: 0, modifiedAt: null };
  }
}

module.exports = {
  config,
  pkg,
  getDb,
  safeCount,
  safeSum,
  normalizeBackupPayload,
  csvFromRows,
  resolveDbFile,
  getDbFileInfo,
};
