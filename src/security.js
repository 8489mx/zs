const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function createPasswordRecord(password) {
  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  return { salt, hash };
}

function createRateLimiter({ windowMs = 60000, max = 10, maxEntries = 5000 } = {}) {
  const bucket = new Map();

  function prune(now) {
    if (bucket.size <= maxEntries) return;
    for (const [key, current] of bucket.entries()) {
      if (now > current.resetAt) {
        bucket.delete(key);
      }
      if (bucket.size <= maxEntries) break;
    }
    if (bucket.size <= maxEntries) return;
    const orderedKeys = [...bucket.entries()]
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, bucket.size - maxEntries)
      .map(([key]) => key);
    orderedKeys.forEach((key) => bucket.delete(key));
  }

  return function rateLimit(key) {
    const normalizedKey = String(key || 'anonymous');
    const now = Date.now();
    const current = bucket.get(normalizedKey) || { count: 0, resetAt: now + windowMs };
    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }
    current.count += 1;
    bucket.set(normalizedKey, current);
    prune(now);
    return {
      allowed: current.count <= max,
      remaining: Math.max(0, max - current.count),
      retryAfterMs: Math.max(0, current.resetAt - now)
    };
  };
}

function normalizeText(value, maxLen = 255) {
  return String(value ?? '').trim().slice(0, maxLen);
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

module.exports = { hashPassword, generateSalt, safeEqual, createPasswordRecord, createRateLimiter, normalizeText, normalizeNumber };
