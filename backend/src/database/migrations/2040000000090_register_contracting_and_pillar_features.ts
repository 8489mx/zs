import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Register contracting feature into features catalog
    await sql`
      INSERT INTO features (id, code, name, module)
      VALUES ('feat_contracting', 'contracting', 'المقاولات وإدارة المشاريع الإنشائية', 'contracting')
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        module = EXCLUDED.module;
    `.execute(db);

    // 2. Associate contracting with ultimate & omnichannel plans
    await sql`
      INSERT INTO plan_features (plan_id, feature_code)
      VALUES 
        ('plan_ultimate', 'contracting'),
        ('plan_omnichannel', 'contracting')
      ON CONFLICT DO NOTHING;
    `.execute(db);

    // 3. Ensure activity_type column exists and backfill default for existing tenants
    await sql`
      UPDATE tenants
      SET activity_type = 'retail_general'
      WHERE activity_type IS NULL OR TRIM(activity_type) = '';
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`
      DELETE FROM plan_features WHERE feature_code = 'contracting';
    `.execute(db);

    await sql`
      DELETE FROM features WHERE code = 'contracting';
    `.execute(db);
  },
};
