import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createPasswordRecord, verifyPassword } from '../../src/core/auth/utils/password-hasher';

/**
 * يحرس البند O20: رموز الدخول السريع (PIN) للبوابات لا تُخزَّن ولا تُعاد نصاً صريحاً.
 *
 * الحارس مزدوج: تأكيد سلوكي على التجزئة نفسها، **وفحص على المصدر** يمنع عودة
 * عمود `pin_code` إلى كود الخدمات. بدون الشق الثاني تكفي ميزة جديدة واحدة
 * تكتب `pin_code` لتعيد فتح الباب بصمت بعد شهور.
 */

const SERVICE_ROOT = join(__dirname, '..', '..', 'src', 'modules');

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectTsFiles(full, acc);
    else if (entry.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

async function run(): Promise<void> {
  // ── 1. التجزئة تعمل على مدخلات بطول PIN ولا تكشف الأصل ────────────────────
  const record = await createPasswordRecord('1234');
  assert.notEqual(record.hash, '1234', 'the stored hash must not be the PIN itself');
  assert.ok(record.hash.length > 20, 'expected a bcrypt hash');

  assert.equal((await verifyPassword('1234', record.hash, record.salt)).valid, true);
  assert.equal((await verifyPassword('1235', record.hash, record.salt)).valid, false);
  assert.equal((await verifyPassword('', record.hash, record.salt)).valid, false);

  // نفس الـPIN لموظفين مختلفين ينتج تجزئتين مختلفتين (ملح لكل سجل)
  const other = await createPasswordRecord('1234');
  assert.notEqual(record.hash, other.hash, 'identical PINs must not share a hash');
  assert.equal((await verifyPassword('1234', other.hash, other.salt)).valid, true);

  // تجزئة غائبة تفشل مغلقة، لا تمر
  assert.equal((await verifyPassword('1234', '', '')).valid, false);

  // ── 2. فحص المصدر: لا عمود `pin_code` في كود الخدمات ─────────────────────
  const offenders: string[] = [];
  for (const file of collectTsFiles(SERVICE_ROOT)) {
    const src = readFileSync(file, 'utf8');
    if (/\bpin_code\b/.test(src)) {
      offenders.push(file.slice(file.indexOf('modules')));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `plaintext pin_code reappeared in: ${offenders.join(', ')}. ` +
      'Portal PINs must be written through createPasswordRecord and checked with verifyPassword.',
  );

  console.log('portal-pin-hashing.spec: ok');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
