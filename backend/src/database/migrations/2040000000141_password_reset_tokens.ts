import { sql, type Kysely } from 'kysely';

// "نسيت كلمة المرور" لم يكن موجوداً إطلاقاً: الرابط في شاشة الدخول كان `href="#"` معطَّلاً،
// ولا مسار واحد في الباك إند. صاحب منشأة ينسى كلمته = تدخّل يدوي على قاعدة الإنتاج.
//
// الرمز صف هنا وليس توقيعاً بلا حالة (خلافاً لـ`portal-token.ts`) لأن ثلاث خصائص لا يوفّرها
// التوقيع: الاستهلاك مرة واحدة، والإلغاء عند إصدار رمز أحدث، وأثر يمكن تدقيقه لاحقاً.
//
// `token_hash` هو SHA-256 للرمز، والرمز نفسه لا يُخزَّن أبداً — نسخة احتياطية مسروقة أو وصول
// قراءة للقاعدة لا يمنحان القدرة على تغيير كلمة مرور أحد.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        account_id TEXT NOT NULL DEFAULT '',
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ NULL,
        invalidated_at TIMESTAMPTZ NULL,
        requested_ip VARCHAR(64) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.execute(db);

    // البحث كله يتم بالتجزئة، وتفرّدها يمنع أي احتمال — مهما بَعُد — لصفّين بنفس الرمز.
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_tokens_token_hash
      ON password_reset_tokens (token_hash)
    `.execute(db);

    // إصدار رمز جديد يلغي رموز نفس المستخدم القائمة، وحدّ الطلبات يعدّ رموز آخر ساعة.
    await sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
      ON password_reset_tokens (user_id, created_at DESC)
    `.execute(db);

    // تنظيف دوري للرموز الميتة.
    await sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
      ON password_reset_tokens (expires_at)
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_password_reset_tokens_user_created`.execute(db);
    await sql`DROP INDEX IF EXISTS uq_password_reset_tokens_token_hash`.execute(db);
    await sql`DROP TABLE IF EXISTS password_reset_tokens`.execute(db);
  },
};
