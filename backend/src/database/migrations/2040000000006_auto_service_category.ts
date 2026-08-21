import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      INSERT INTO product_categories (name, is_active, tenant_id)
      SELECT DISTINCT 'خدمات', true, p.tenant_id
      FROM products p
      WHERE p.item_type = 'service'
        AND NOT EXISTS (
          SELECT 1 FROM product_categories pc
          WHERE LOWER(pc.name) = 'خدمات'
            AND (pc.tenant_id = p.tenant_id OR (pc.tenant_id IS NULL AND p.tenant_id IS NULL))
        );
    `.execute(db);

    await sql`
      UPDATE products p
      SET category_id = pc.id,
          updated_at = NOW()
      FROM product_categories pc
      WHERE p.item_type = 'service'
        AND p.category_id IS NULL
        AND LOWER(pc.name) = 'خدمات'
        AND (pc.tenant_id = p.tenant_id OR (pc.tenant_id IS NULL AND p.tenant_id IS NULL));
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // No-op rollback
  },
};
