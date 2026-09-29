import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000171: AR Dunning & Collections Hub
 *
 * Implements dedicated Accounts Receivable dunning tiers, collection cases tracking,
 * interaction audit logs, and credit-blocking governance.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Dunning levels configuration table
    await sql`
      CREATE TABLE IF NOT EXISTS ar_dunning_levels (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        level_order INT NOT NULL,
        level_name VARCHAR(100) NOT NULL,
        days_past_due INT NOT NULL,
        auto_block_sales BOOLEAN NOT NULL DEFAULT FALSE,
        action_type VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
        template_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_dunning_levels_tenant_order
      ON ar_dunning_levels (tenant_id, level_order);
    `.execute(db);

    // 2. Collection cases table
    await sql`
      CREATE TABLE IF NOT EXISTS ar_collection_cases (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        current_level_id VARCHAR(64) NULL REFERENCES ar_dunning_levels(id) ON DELETE SET NULL,
        total_overdue NUMERIC(15, 4) NOT NULL DEFAULT 0,
        oldest_overdue_days INT NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'open',
        promised_payment_date DATE NULL,
        promised_amount NUMERIC(15, 4) NULL,
        assigned_collector_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        last_contact_date TIMESTAMPTZ NULL,
        next_followup_date DATE NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ar_collection_cases_tenant_customer UNIQUE (tenant_id, customer_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ar_collection_cases_tenant_status
      ON ar_collection_cases (tenant_id, status);

      CREATE INDEX IF NOT EXISTS idx_ar_collection_cases_tenant_followup
      ON ar_collection_cases (tenant_id, next_followup_date)
      WHERE next_followup_date IS NOT NULL;
    `.execute(db);

    // 3. Collection interaction logs table
    await sql`
      CREATE TABLE IF NOT EXISTS ar_collection_logs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        case_id VARCHAR(64) NOT NULL REFERENCES ar_collection_cases(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50) NOT NULL,
        result_status VARCHAR(50) NOT NULL,
        details TEXT NULL,
        promised_date DATE NULL,
        promised_amount NUMERIC(15, 4) NULL,
        created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ar_collection_logs_tenant_case
      ON ar_collection_logs (tenant_id, case_id);
    `.execute(db);

    // 4. Customer credit block columns
    await sql`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS is_credit_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS credit_block_reason TEXT NULL,
      ADD COLUMN IF NOT EXISTS credit_blocked_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS credit_blocked_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_customers_tenant_credit_blocked
      ON customers (tenant_id, is_credit_blocked)
      WHERE is_credit_blocked = TRUE;
    `.execute(db);

    // 5. Seed default standard dunning levels for existing tenants
    await sql`
      INSERT INTO ar_dunning_levels (
        id, tenant_id, level_order, level_name, days_past_due, auto_block_sales, action_type, template_text
      )
      SELECT
        'lvl_1_' || t.id,
        t.id,
        1,
        'تذكير ودي (Friendly Reminder)',
        7,
        FALSE,
        'whatsapp',
        'مرحباً {customer_name}، نود تذكيركم بلطف بوجود رصيد مستحق بقيمة {total_overdue} ج.م تجاوز موعد استحقاقه منذ {days_overdue} يوماً. شاكرين حسن تعاونكم.'
      FROM (SELECT DISTINCT tenant_id AS id FROM customers) t
      ON CONFLICT DO NOTHING;

      INSERT INTO ar_dunning_levels (
        id, tenant_id, level_order, level_name, days_past_due, auto_block_sales, action_type, template_text
      )
      SELECT
        'lvl_2_' || t.id,
        t.id,
        2,
        'إشعار رسمي بالسداد (Formal Notice)',
        15,
        FALSE,
        'whatsapp',
        'إشعار سداد رسمي: السيد {customer_name}، نرجو التكرم بسرعة سداد المديونية المتأخرة وقدرها {total_overdue} ج.م لتجنب تعليق التسهيلات الائتمانية.'
      FROM (SELECT DISTINCT tenant_id AS id FROM customers) t
      ON CONFLICT DO NOTHING;

      INSERT INTO ar_dunning_levels (
        id, tenant_id, level_order, level_name, days_past_due, auto_block_sales, action_type, template_text
      )
      SELECT
        'lvl_3_' || t.id,
        t.id,
        3,
        'إنذار تعليق البيع الآجل (Credit Hold Warning)',
        30,
        TRUE,
        'manual_call',
        'إنذار إداري عاجل: تم إيقاف المبيعات الآجلة مؤقتاً لوجود متأخرات بقيمة {total_overdue} ج.م متأخرة منذ {days_overdue} يوماً. يرجى مراجعة إدارة التحصيل فوراً.'
      FROM (SELECT DISTINCT tenant_id AS id FROM customers) t
      ON CONFLICT DO NOTHING;

      INSERT INTO ar_dunning_levels (
        id, tenant_id, level_order, level_name, days_past_due, auto_block_sales, action_type, template_text
      )
      SELECT
        'lvl_4_' || t.id,
        t.id,
        4,
        'إشعار تصعيد قانوني (Legal Escalation)',
        60,
        TRUE,
        'legal',
        'إشعار أخير قبل اتخاذ الإجراءات القانونية: السيد {customer_name}، نظراً لعدم الاستجابة للمطالبات السابقة بخصوص المبلغ المستحق {total_overdue} ج.م، سيتم تحويل الملف للشؤون القانونية خلال 48 ساعة.'
      FROM (SELECT DISTINCT tenant_id AS id FROM customers) t
      ON CONFLICT DO NOTHING;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DROP TABLE IF EXISTS ar_collection_logs CASCADE;
      DROP TABLE IF EXISTS ar_collection_cases CASCADE;
      DROP TABLE IF EXISTS ar_dunning_levels CASCADE;

      DROP INDEX IF EXISTS idx_customers_tenant_credit_blocked;
      ALTER TABLE customers
      DROP COLUMN IF EXISTS credit_blocked_by,
      DROP COLUMN IF EXISTS credit_blocked_at,
      DROP COLUMN IF EXISTS credit_block_reason,
      DROP COLUMN IF EXISTS is_credit_blocked;
    `.execute(db);
  },
};
