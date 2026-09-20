import { sql, type Kysely } from 'kysely';
import { genSalt, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';

/**
 * تجزئة رموز الدخول السريع (PIN) لبوابات الموظفين والمناديب — البند O20.
 *
 * كان `hr_employees.pin_code` و`delivery_representatives.pin_code` يخزّنان الرمز
 * **نصاً صريحاً** (`VARCHAR(10)`)، وكان يُعاد ضمن قوائم الموظفين للواجهة. هذا خرق
 * مباشر للثابت الدستوري "صفر كلمات مرور نصية" (`CLAUDE.md §1`): أي نسخة احتياطية
 * أو تسريب قراءة على الجدول يكشف بيانات دخول كل الموظفين والمناديب مباشرة.
 *
 * الهجرة تضيف `pin_hash`/`pin_salt` بنفس نمط `users`، وتجزّئ القيم القائمة في
 * Node (bcrypt غير متاح داخل SQL)، ثم **تحذف عمود النص الصريح**.
 *
 * **تنبيه:** التراجع (`down`) يعيد العمود فارغاً ولا يستطيع استرجاع الرموز —
 * التجزئة أحادية الاتجاه بطبيعتها. بعد التراجع يجب إعادة تعيين الرموز يدوياً.
 */

const BCRYPT_ROUNDS = 10;

async function columnExists(db: Kysely<unknown>, table: string, column: string): Promise<boolean> {
  const result = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `.execute(db);
  return Boolean(result.rows[0]?.exists);
}

async function tableExists(db: Kysely<unknown>, table: string): Promise<boolean> {
  const result = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists
  `.execute(db);
  return Boolean(result.rows[0]?.exists);
}

async function migrateTablePins(db: Kysely<unknown>, table: string): Promise<void> {
  if (!(await tableExists(db, table))) return;

  await sql`ALTER TABLE ${sql.table(table)} ADD COLUMN IF NOT EXISTS pin_hash TEXT NULL`.execute(db);
  await sql`ALTER TABLE ${sql.table(table)} ADD COLUMN IF NOT EXISTS pin_salt TEXT NULL`.execute(db);

  // لا شيء لترحيله إن كان العمود النصي محذوفاً أصلاً (تشغيل متكرر للهجرة)
  if (await columnExists(db, table, 'pin_code')) {
    const rows = await sql<{ id: string; pin_code: string | null }>`
      SELECT id, pin_code FROM ${sql.table(table)}
      WHERE pin_code IS NOT NULL AND btrim(pin_code) <> '' AND pin_hash IS NULL
    `.execute(db);

    for (const row of rows.rows) {
      const plain = String(row.pin_code || '').trim();
      if (!plain) continue;
      const bcryptSalt = await genSalt(BCRYPT_ROUNDS);
      const pinHash = await hash(plain, bcryptSalt);
      const legacySalt = randomBytes(16).toString('hex');
      await sql`
        UPDATE ${sql.table(table)}
        SET pin_hash = ${pinHash}, pin_salt = ${legacySalt}
        WHERE id = ${row.id}
      `.execute(db);
    }

    await sql`ALTER TABLE ${sql.table(table)} DROP COLUMN IF EXISTS pin_code`.execute(db);
  }
}

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await migrateTablePins(db, 'hr_employees');
    await migrateTablePins(db, 'delivery_representatives');
  },

  async down(db: Kysely<unknown>): Promise<void> {
    for (const table of ['hr_employees', 'delivery_representatives']) {
      if (!(await tableExists(db, table))) continue;
      // العمود يعود فارغاً: الرموز الأصلية غير قابلة للاسترجاع بعد التجزئة.
      await sql`ALTER TABLE ${sql.table(table)} ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10) NULL`.execute(db);
      await sql`ALTER TABLE ${sql.table(table)} DROP COLUMN IF EXISTS pin_hash`.execute(db);
      await sql`ALTER TABLE ${sql.table(table)} DROP COLUMN IF EXISTS pin_salt`.execute(db);
    }
  },
};
