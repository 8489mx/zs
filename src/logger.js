
const config = require('./config');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function normalizeLevel(level) {
  const value = String(level || 'info').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEVELS, value) ? value : 'info';
}

function shouldLog(level) {
  return LEVELS[normalizeLevel(level)] <= LEVELS[normalizeLevel(config.logLevel)];
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (value instanceof Error) {
      result[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
      continue;
    }
    if (typeof value === 'bigint') {
      result[key] = String(value);
      continue;
    }
    result[key] = value;
  }
  return result;
}

function emit(level, message, meta = {}) {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level: normalizeLevel(level),
    message: String(message || ''),
    ...sanitizeMeta(meta)
  };
  if (config.logFormat === 'json') {
    const line = JSON.stringify(payload);
    if (payload.level === 'error') return console.error(line);
    if (payload.level === 'warn') return console.warn(line);
    return console.log(line);
  }
  const extras = Object.keys(meta || {}).length ? ` ${JSON.stringify(sanitizeMeta(meta))}` : '';
  const line = `[${payload.ts}] ${payload.level.toUpperCase()} ${payload.message}${extras}`;
  if (payload.level === 'error') return console.error(line);
  if (payload.level === 'warn') return console.warn(line);
  return console.log(line);
}

module.exports = {
  debug(message, meta) { emit('debug', message, meta); },
  info(message, meta) { emit('info', message, meta); },
  warn(message, meta) { emit('warn', message, meta); },
  error(message, meta) { emit('error', message, meta); },
  _normalizeLevel: normalizeLevel,
  _sanitizeMeta: sanitizeMeta,
  _shouldLog: shouldLog
};
