#!/usr/bin/env node
import readline from 'readline';
import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  const privateKeyPath = path.resolve(await ask('Path to activation-private.pem: '));
  const machineInput = String(await ask('Machine ID or machine hash: ')).trim();
  const customerName = String(await ask('Customer name: ')).trim() || 'عميل';
  const expiresAt = String(await ask('Expires at (optional, ISO date): ')).trim();
  const privateKey = readFileSync(privateKeyPath, 'utf8');
  const normalizedMachineId = machineInput.trim().toUpperCase();
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
  console.log('\nActivation Code:\n');
  console.log(`${payloadBase64}.${signature}`);
  console.log('\nUse pkg to build EXE later: npx pkg tools/activation-studio');
  rl.close();
}

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
