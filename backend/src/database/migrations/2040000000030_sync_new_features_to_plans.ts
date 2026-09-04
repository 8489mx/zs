import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      INSERT INTO features (id, code, name, module) VALUES 
      ('feat_storefront', 'storefront', 'المتجر الإلكتروني وطلبات الأونلاين', 'storefront'),
      ('feat_import', 'import', 'الاستيراد والشراكة والحاويات', 'import'),
      ('feat_pharmacy', 'pharmacy', 'الصيدليات والأدوية والروشتات', 'pharmacy'),
      ('feat_maintenance', 'maintenance', 'إدارة الصيانة والأجهزة', 'maintenance'),
      ('feat_restaurant', 'restaurant', 'المطاعم والكافيهات والطاولات', 'restaurant'),
      ('feat_clothing', 'clothing', 'الأزياء والمقاسات والألوان', 'clothing')
      ON CONFLICT (code) DO NOTHING;
    `.execute(db);

    await sql`
      INSERT INTO plan_features (plan_id, feature_code) VALUES 
      ('plan_ultimate', 'storefront'),
      ('plan_ultimate', 'import'),
      ('plan_ultimate', 'pharmacy'),
      ('plan_ultimate', 'maintenance'),
      ('plan_ultimate', 'restaurant'),
      ('plan_ultimate', 'clothing')
      ON CONFLICT DO NOTHING;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DELETE FROM plan_features 
      WHERE plan_id = 'plan_ultimate' 
        AND feature_code IN ('storefront', 'import', 'pharmacy', 'maintenance', 'restaurant', 'clothing');
    `.execute(db);

    await sql`
      DELETE FROM features 
      WHERE code IN ('storefront', 'import', 'pharmacy', 'maintenance', 'restaurant', 'clothing');
    `.execute(db);
  },
};
