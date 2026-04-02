#!/usr/bin/env node
const crypto = require('crypto');
const bytes = Number(process.env.SESSION_SECRET_BYTES || 48);
if (!Number.isFinite(bytes) || bytes < 32) {
  console.error('SESSION_SECRET_BYTES must be a number >= 32');
  process.exit(1);
}
process.stdout.write(`${crypto.randomBytes(bytes).toString('base64url')}\n`);
