import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Ensure all 22 feature definitions exist in features table
    await sql`
      INSERT INTO features (id, code, name, module) VALUES
      ('feat_catalog', 'catalog', 'المنتجات والأصناف', 'catalog'),
      ('feat_sales', 'sales', 'المبيعات ونقاط البيع', 'sales'),
      ('feat_sessions', 'sessions', 'ورديات العمل والكاشير', 'sessions'),
      ('feat_cashDrawer', 'cashDrawer', 'صندوق الكاشير والخزينة', 'cashDrawer'),
      ('feat_purchases', 'purchases', 'المشتريات والموردين', 'purchases'),
      ('feat_inventory', 'inventory', 'المخزون المتقدم والجرد', 'inventory'),
      ('feat_reports', 'reports', 'التقارير المتقدمة وسجل النشاط', 'reports'),
      ('feat_hr', 'hr', 'الموارد البشرية والرواتب', 'hr'),
      ('feat_deliveryReps', 'deliveryReps', 'مناديب التوصيل والشحن', 'deliveryReps'),
      ('feat_loyalty', 'loyalty', 'محرك نقاط وولاء العملاء', 'sales'),
      ('feat_maintenance', 'maintenance', 'إدارة الصيانة وتتبع السيريال والأجهزة', 'maintenance'),
      ('feat_clothing', 'clothing', 'الأزياء والمقاسات والألوان', 'clothing'),
      ('feat_restaurant', 'restaurant', 'المطاعم والكافيهات والطاولات', 'restaurant'),
      ('feat_accounting', 'accounting', 'الحسابات العامة وشجرة الحسابات والقيود', 'accounting'),
      ('feat_fixed_assets', 'fixed_assets', 'إدارة وإهلاك الأصول الثابتة', 'accounting'),
      ('feat_installments', 'installments', 'مبيعات وجدولة التقسيط', 'sales'),
      ('feat_taxIntegration', 'taxIntegration', 'الربط الضريبي والفاتورة الإلكترونية', 'taxIntegration'),
      ('feat_vat_declaration', 'vat_declaration', 'الإقرار الضريبي (ن10 و ZATCA)', 'taxIntegration'),
      ('feat_manufacturing', 'manufacturing', 'التصنيع وقوائم المواد وأوامر الإنتاج', 'manufacturing'),
      ('feat_import', 'import', 'الاستيراد والشراكة والحاويات', 'import'),
      ('feat_pharmacy', 'pharmacy', 'الصيدليات والأدوية والبدائل والنواقص', 'pharmacy'),
      ('feat_storefront', 'storefront', 'المتجر الإلكتروني وطلبات الأونلاين', 'storefront')
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        module = EXCLUDED.module;
    `.execute(db);

    // 2. Clear old plan_features to reconstruct clean matrices
    await sql`DELETE FROM plan_features`.execute(db);

    // 3. Plan 1: Basic (4 features: POS, Catalog, Sessions, CashDrawer/Expenses)
    await sql`
      INSERT INTO plan_features (plan_id, feature_code) VALUES
      ('plan_basic', 'catalog'),
      ('plan_basic', 'sales'),
      ('plan_basic', 'sessions'),
      ('plan_basic', 'cashDrawer');
    `.execute(db);

    // 4. Plan 2: Pro (7 features: Basic 4 + Purchases, Inventory, Reports)
    await sql`
      INSERT INTO plan_features (plan_id, feature_code) VALUES
      ('plan_pro', 'catalog'),
      ('plan_pro', 'sales'),
      ('plan_pro', 'sessions'),
      ('plan_pro', 'cashDrawer'),
      ('plan_pro', 'purchases'),
      ('plan_pro', 'inventory'),
      ('plan_pro', 'reports');
    `.execute(db);

    // 5. Plan 3: Ultimate ERP (21 features: Pro 7 + 14 ERP features, EXCLUDING storefront)
    await sql`
      INSERT INTO plan_features (plan_id, feature_code) VALUES
      ('plan_ultimate', 'catalog'),
      ('plan_ultimate', 'sales'),
      ('plan_ultimate', 'sessions'),
      ('plan_ultimate', 'cashDrawer'),
      ('plan_ultimate', 'purchases'),
      ('plan_ultimate', 'inventory'),
      ('plan_ultimate', 'reports'),
      ('plan_ultimate', 'hr'),
      ('plan_ultimate', 'deliveryReps'),
      ('plan_ultimate', 'loyalty'),
      ('plan_ultimate', 'maintenance'),
      ('plan_ultimate', 'clothing'),
      ('plan_ultimate', 'restaurant'),
      ('plan_ultimate', 'accounting'),
      ('plan_ultimate', 'fixed_assets'),
      ('plan_ultimate', 'installments'),
      ('plan_ultimate', 'taxIntegration'),
      ('plan_ultimate', 'vat_declaration'),
      ('plan_ultimate', 'manufacturing'),
      ('plan_ultimate', 'import'),
      ('plan_ultimate', 'pharmacy');
    `.execute(db);

    // 6. Plan 4: Omnichannel Enterprise (All 22 features including storefront)
    await sql`
      INSERT INTO plan_features (plan_id, feature_code)
      SELECT 'plan_omnichannel', code FROM features;
    `.execute(db);

    // 7. Update and normalize plans in `plans` table (feature plans)
    await sql`
      INSERT INTO plans (id, code, name, description, price) VALUES
      ('plan_basic', 'basic', 'الأساسية', 'باقة نقاط البيع والمحلات الفردية', 350),
      ('plan_pro', 'pro', 'الاحترافية', 'باقة المتاجر والشركات النامية والفروع', 750),
      ('plan_ultimate', 'ultimate', 'المتكاملة', 'باقة المؤسسات الكبرى والمحاسبة والتصنيع', 1500),
      ('plan_omnichannel', 'omnichannel', 'باقة التجارة الشاملة (Omnichannel Enterprise)', 'باقة المؤسسات المتكاملة مع المتجر الإلكتروني والدفع والشحن', 2400)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price;
    `.execute(db);

    // 8. Safely normalize codes of legacy saas_plans if standard uppercase version doesn't exist yet
    await sql`
      UPDATE saas_plans 
      SET code = 'BASIC' 
      WHERE LOWER(code) = 'basic' 
        AND code != 'BASIC' 
        AND NOT EXISTS (SELECT 1 FROM saas_plans WHERE code = 'BASIC');
    `.execute(db);

    await sql`
      UPDATE saas_plans 
      SET code = 'PRO' 
      WHERE LOWER(code) = 'pro' 
        AND code != 'PRO' 
        AND NOT EXISTS (SELECT 1 FROM saas_plans WHERE code = 'PRO');
    `.execute(db);

    await sql`
      UPDATE saas_plans 
      SET code = 'ULTIMATE' 
      WHERE LOWER(code) IN ('ultimate', 'enterprise') 
        AND code != 'ULTIMATE' 
        AND NOT EXISTS (SELECT 1 FROM saas_plans WHERE code = 'ULTIMATE');
    `.execute(db);

    await sql`
      UPDATE saas_plans 
      SET code = 'OMNICHANNEL' 
      WHERE LOWER(code) = 'omnichannel' 
        AND code != 'OMNICHANNEL' 
        AND NOT EXISTS (SELECT 1 FROM saas_plans WHERE code = 'OMNICHANNEL');
    `.execute(db);

    // 9. Upsert the 4 standardized production plans (ensuring they exist before re-linking)
    await sql`
      INSERT INTO saas_plans (code, name, price, currency, billing_period_months, max_users, max_branches, feature_plan_id, is_active)
      VALUES 
        ('BASIC', 'الباقة الأساسية (Basic POS)', 3500.00, 'EGP', 12, 2, 1, 'plan_basic', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        currency = 'EGP',
        billing_period_months = 12,
        max_users = 2,
        max_branches = 1,
        feature_plan_id = 'plan_basic',
        is_active = true;
    `.execute(db);

    await sql`
      INSERT INTO saas_plans (code, name, price, currency, billing_period_months, max_users, max_branches, feature_plan_id, is_active)
      VALUES 
        ('PRO', 'الباقة الاحترافية (Professional)', 7500.00, 'EGP', 12, 6, 3, 'plan_pro', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        currency = 'EGP',
        billing_period_months = 12,
        max_users = 6,
        max_branches = 3,
        feature_plan_id = 'plan_pro',
        is_active = true;
    `.execute(db);

    await sql`
      INSERT INTO saas_plans (code, name, price, currency, billing_period_months, max_users, max_branches, feature_plan_id, is_active)
      VALUES 
        ('ULTIMATE', 'الباقة المتكاملة (Ultimate ERP)', 15000.00, 'EGP', 12, 15, 10, 'plan_ultimate', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        currency = 'EGP',
        billing_period_months = 12,
        max_users = 15,
        max_branches = 10,
        feature_plan_id = 'plan_ultimate',
        is_active = true;
    `.execute(db);

    await sql`
      INSERT INTO saas_plans (code, name, price, currency, billing_period_months, max_users, max_branches, feature_plan_id, is_active)
      VALUES 
        ('OMNICHANNEL', 'باقة التجارة الشاملة (Omnichannel Enterprise)', 24000.00, 'EGP', 12, null, null, 'plan_omnichannel', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        currency = 'EGP',
        billing_period_months = 12,
        max_users = null,
        max_branches = null,
        feature_plan_id = 'plan_omnichannel',
        is_active = true;
    `.execute(db);

    // 10. Safely re-link any subscriptions pointing to legacy/duplicate plans to standard plans
    await sql`
      UPDATE tenant_subscriptions
      SET plan_id = (SELECT id FROM saas_plans WHERE code = 'PRO' LIMIT 1)
      WHERE plan_id IN (SELECT id FROM saas_plans WHERE LOWER(code) = 'pro' AND code != 'PRO');
    `.execute(db);

    await sql`
      UPDATE tenant_subscriptions
      SET plan_id = (SELECT id FROM saas_plans WHERE code = 'BASIC' LIMIT 1)
      WHERE plan_id IN (SELECT id FROM saas_plans WHERE LOWER(code) = 'basic' AND code != 'BASIC');
    `.execute(db);

    await sql`
      UPDATE tenant_subscriptions
      SET plan_id = (SELECT id FROM saas_plans WHERE code = 'ULTIMATE' LIMIT 1)
      WHERE plan_id IN (SELECT id FROM saas_plans WHERE LOWER(code) IN ('ultimate', 'enterprise') AND code != 'ULTIMATE');
    `.execute(db);

    await sql`
      UPDATE tenant_subscriptions
      SET plan_id = (SELECT id FROM saas_plans WHERE code = 'OMNICHANNEL' LIMIT 1)
      WHERE plan_id IN (SELECT id FROM saas_plans WHERE LOWER(code) = 'omnichannel' AND code != 'OMNICHANNEL');
    `.execute(db);

    // Re-link any subscriptions pointing to other/invalid plans to BASIC plan before deletion
    await sql`
      UPDATE tenant_subscriptions 
      SET plan_id = (SELECT id FROM saas_plans WHERE code = 'BASIC' LIMIT 1)
      WHERE plan_id NOT IN (SELECT id FROM saas_plans WHERE code IN ('BASIC', 'PRO', 'ULTIMATE', 'OMNICHANNEL'));
    `.execute(db);

    // 11. Delete any leftover dummy/obsolete plans so saas_plans contains only the 4 standard plans
    await sql`
      DELETE FROM saas_plans 
      WHERE code NOT IN ('BASIC', 'PRO', 'ULTIMATE', 'OMNICHANNEL');
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    // Revert storefront to plan_ultimate if rolled back
    await sql`
      INSERT INTO plan_features (plan_id, feature_code)
      VALUES ('plan_ultimate', 'storefront')
      ON CONFLICT DO NOTHING;
    `.execute(db);
  },
};
