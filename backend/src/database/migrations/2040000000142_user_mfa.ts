import { sql, type Kysely } from 'kysely';

// المصادقة الثنائية (TOTP). لم تكن موجودة لأي دور، ولا حتى لحساب المنصة الذي يستطيع انتحال
// شخصية أي مالك منشأة والدخول إلى دفاتره — أي أن كلمة مرور واحدة مسروقة كانت تكفي للوصول إلى
// كل عملاء المنصة.
//
// صف واحد لكل مستخدم يُفعّلها:
//   secret_encrypted   سر TOTP مشفَّراً بـAES-256-GCM (المفتاح في البيئة لا في القاعدة)
//   confirmed_at       متى أثبت المستخدم أن التطبيق يولّد رموزاً صحيحة. قبله المصادقة غير مفعّلة.
//   last_used_step     آخر خطوة زمنية استُهلكت — يمنع إعادة استعمال نفس الرمز داخل نافذته
//   recovery_codes     تجزئات رموز الاسترداد المتبقية (الرمز المستعمَل يُحذف من المصفوفة)
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS user_mfa (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL,
        account_id TEXT NOT NULL DEFAULT '',
        secret_encrypted TEXT NOT NULL,
        confirmed_at TIMESTAMPTZ NULL,
        last_used_step BIGINT NOT NULL DEFAULT 0,
        recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.execute(db);

    // كل تسجيل دخول يسأل «هل لهذا المستخدم مصادقة ثنائية مؤكَّدة؟»، والسؤال مقيَّد بالمستأجر.
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_mfa_tenant_confirmed
      ON user_mfa (tenant_id, user_id)
      WHERE confirmed_at IS NOT NULL
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_user_mfa_tenant_confirmed`.execute(db);
    await sql`DROP TABLE IF EXISTS user_mfa`.execute(db);
  },
};
