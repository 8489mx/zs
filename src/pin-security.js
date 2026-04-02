const crypto = require('crypto');

const MANAGER_PIN_HASH_PREFIX = 'pbkdf2$';

function normalizeManagerPin(pin) {
  return String(pin == null ? '' : pin).trim();
}

function hashManagerPin(pin) {
  const normalized = normalizeManagerPin(pin);
  if (!normalized) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(normalized, salt, 120000, 64, 'sha512').toString('hex');
  return `${MANAGER_PIN_HASH_PREFIX}${salt}$${hash}`;
}

function verifyManagerPin(pin, storedValue) {
  const normalizedPin = normalizeManagerPin(pin);
  const stored = String(storedValue || '').trim();
  if (!normalizedPin || !stored) return false;
  if (!stored.startsWith(MANAGER_PIN_HASH_PREFIX)) {
    return normalizedPin === stored;
  }
  const [, salt, expectedHash] = stored.split('$');
  if (!salt || !expectedHash) return false;
  const actualHash = crypto.pbkdf2Sync(normalizedPin, salt, 120000, 64, 'sha512').toString('hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actualHash, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

module.exports = { hashManagerPin, verifyManagerPin, normalizeManagerPin, MANAGER_PIN_HASH_PREFIX };
