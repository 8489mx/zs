import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000147: a durable record for a journal that failed to post.
 *
 * ## لماذا يوجد هذا الجدول
 *
 * `SalesWriteService.createSale` كان يرحّل القيد هكذا:
 *
 * ```ts
 * try { await this.accountingPosting.postSale(trx, id, auth); }
 * catch (error) { this.logger.error(`Failed to post accounting journal for sale ${id}: ...`); }
 * ```
 *
 * فالفاتورة تُحفظ، والمخزون ينزل، والعميل يأخذ إيصاله، والسيرفر يرد 201 — والقيد لم يُكتب. الأثر
 * الوحيد سطرٌ في السجل. وعلى الإنتاج (24 سبتمبر 2026) ظهرت النتيجة: **2,281 فاتورة وصفر قيد**
 * على منشأة واحدة، استمرت شهوراً بلا أن يلاحظها أحد.
 *
 * الحل ليس إيقاف البيع: الكاشير لا يقف لأن وحدة المحاسبة مضبوطة خطأ، والقيد **مشتقٌّ بالكامل**
 * من الفاتورة (`sales` و`sale_items` و`sale_payments`) فتأجيله لا يضيّع شيئاً. الذي كان يضيّع كل
 * شيء هو **الصمت**. فالفشل يُكتب هنا: صفٌّ يُستعلَم عنه، ويُعاد المحاولة عليه، ويُنبَّه عليه.
 *
 * تحذير تشغيلي: إعادة المحاولة يجب أن تكون **سريعة ومراقَبة**. لو أُقفلت الفترة المحاسبية قبل
 * نجاحها، لم يعد ممكناً ترحيل القيد في شهره الصحيح.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      CREATE TABLE IF NOT EXISTS accounting_posting_failures (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        source_type VARCHAR(40) NOT NULL,
        source_id BIGINT NOT NULL,
        error_message TEXT NOT NULL DEFAULT '',
        attempts INTEGER NOT NULL DEFAULT 1,
        first_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ NULL,
        CONSTRAINT uq_accounting_posting_failures_source
          UNIQUE (tenant_id, source_type, source_id)
      );
    `.execute(db);

    // العامل الدوري يسأل دائماً عن «غير المحلولة، الأقدم محاولةً أولاً».
    await sql`
      CREATE INDEX IF NOT EXISTS idx_accounting_posting_failures_pending
      ON accounting_posting_failures (last_attempt_at)
      WHERE resolved_at IS NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_accounting_posting_failures_tenant
      ON accounting_posting_failures (tenant_id, resolved_at);
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_accounting_posting_failures_tenant;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_accounting_posting_failures_pending;`.execute(db);
    await sql`DROP TABLE IF EXISTS accounting_posting_failures;`.execute(db);
  },
};
