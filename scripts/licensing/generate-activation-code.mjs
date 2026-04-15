import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const [privateKeyPath, machineId, customerName = 'عميل', expiresAt = ''] = process.argv.slice(2);
if (!privateKeyPath || !machineId) {
  console.error('Usage: node scripts/licensing/generate-activation-code.mjs <private-key.pem> <machine-id> [customer-name] [expiresAt]');
  process.exit(1);
}
const privateKey = readFileSync(path.resolve(privateKeyPath), 'utf8');
const normalizedMachineId = String(machineId).trim().toUpperCase();
const payload = {
  machineId: normalizedMachineId,
  customerName,
  issuedAt: new Date().toISOString(),
  expiresAt: expiresAt || null,
  mode: 'desktop',
};
const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
const sign = createSign('RSA-SHA256');
sign.update(payloadBase64);
sign.end();
const signature = sign.sign(privateKey).toString('base64url');
console.log(`${payloadBase64}.${signature}`);
