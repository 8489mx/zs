import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    -- 1. Sanitize any legacy rogue users with username 'zs' outside the platform tenant
    UPDATE users
    SET username = CONCAT(tenant_id, '_admin')
    WHERE LOWER(TRIM(username)) = 'zs' AND tenant_id NOT IN ('zs', 'default', 'dev-tenant');

    -- 2. Sanitize any super_admin roles outside the platform tenant
    UPDATE users
    SET role = 'admin'
    WHERE role = 'super_admin' AND tenant_id NOT IN ('zs', 'default', 'dev-tenant');

    -- 3. Ensure platform root tenant 'zs' exists and is active
    INSERT INTO tenants (
      id, slug, business_name, owner_name, owner_phone, owner_email,
      activity_type, status, trial_starts_at, trial_ends_at, activated_at,
      created_at, updated_at, plan_id, extra_features, country_code
    ) VALUES (
      'zs', 'zs', 'منصة Z-Systems المركزية', 'محمود زكريا', '0000000000', 'admin@zsystems.io',
      'retail_general', 'active', NOW(), NOW() + INTERVAL '100 years', NOW(),
      NOW(), NOW(), 'plan_omnichannel', '[]'::jsonb, 'EG'
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = 'zs',
      business_name = 'منصة Z-Systems المركزية',
      status = 'active',
      trial_ends_at = NOW() + INTERVAL '100 years',
      updated_at = NOW();

    -- 4. PostgreSQL Trigger Function: Immunity of Platform Super Admin and Username 'zs'
    CREATE OR REPLACE FUNCTION trg_protect_platform_super_admin()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        IF ((OLD.tenant_id = 'zs' OR OLD.tenant_id = 'default') AND LOWER(TRIM(OLD.username)) = 'zs') THEN
          RAISE EXCEPTION 'CANNOT_DELETE_PLATFORM_SUPER_ADMIN: The root super administrator account (zs) is constitutionally protected from deletion!';
        END IF;
        IF (OLD.tenant_id = 'zs' AND OLD.role = 'super_admin') THEN
          RAISE EXCEPTION 'CANNOT_DELETE_PLATFORM_SUPER_ADMIN: Cannot delete super_admin account in platform tenant!';
        END IF;
        RETURN OLD;
      END IF;

      IF (TG_OP = 'UPDATE') THEN
        IF ((OLD.tenant_id = 'zs' OR OLD.tenant_id = 'default') AND LOWER(TRIM(OLD.username)) = 'zs') THEN
          IF (LOWER(TRIM(NEW.username)) != 'zs') THEN
            RAISE EXCEPTION 'CANNOT_RENAME_PLATFORM_SUPER_ADMIN: The root super administrator username (zs) cannot be renamed!';
          END IF;
          IF (NEW.role != 'super_admin') THEN
            RAISE EXCEPTION 'CANNOT_DEMOTE_PLATFORM_SUPER_ADMIN: The root super administrator (zs) cannot be demoted from super_admin!';
          END IF;
          IF (NEW.is_active = false) THEN
            RAISE EXCEPTION 'CANNOT_DEACTIVATE_PLATFORM_SUPER_ADMIN: The root super administrator (zs) cannot be deactivated!';
          END IF;
          IF (NEW.tenant_id != OLD.tenant_id) THEN
            RAISE EXCEPTION 'CANNOT_TRANSFER_PLATFORM_SUPER_ADMIN: The root super administrator (zs) cannot be transferred out of platform tenant!';
          END IF;
        END IF;
      END IF;

      IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Prevent non-platform tenants from using reserved username 'zs'
        IF (NEW.tenant_id NOT IN ('zs', 'default', 'dev-tenant') AND LOWER(TRIM(NEW.username)) = 'zs') THEN
          RAISE EXCEPTION 'RESERVED_PLATFORM_USERNAME: Username "zs" is strictly reserved for the SaaS platform root administration!';
        END IF;

        -- Prevent non-platform tenants from possessing super_admin role
        IF (NEW.tenant_id NOT IN ('zs', 'default', 'dev-tenant') AND NEW.role = 'super_admin') THEN
          NEW.role := 'admin';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_users_platform_immunity ON users;
    CREATE TRIGGER trg_users_platform_immunity
      BEFORE INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION trg_protect_platform_super_admin();

    -- 5. PostgreSQL Trigger Function: Immunity of Platform Tenant Record
    CREATE OR REPLACE FUNCTION trg_protect_platform_tenant_record()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (TG_OP = 'DELETE' AND OLD.id = 'zs') THEN
        RAISE EXCEPTION 'CANNOT_DELETE_PLATFORM_TENANT: Tenant "zs" is the SaaS platform control plane and cannot be deleted!';
      END IF;
      IF (TG_OP = 'UPDATE' AND OLD.id = 'zs' AND NEW.id != 'zs') THEN
        RAISE EXCEPTION 'CANNOT_RENAME_PLATFORM_TENANT: Tenant id "zs" cannot be altered!';
      END IF;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_tenants_platform_immunity ON tenants;
    CREATE TRIGGER trg_tenants_platform_immunity
      BEFORE DELETE OR UPDATE OF id ON tenants
      FOR EACH ROW
      EXECUTE FUNCTION trg_protect_platform_tenant_record();

    -- 6. PostgreSQL Trigger Function: Prevent Commercial Data Pollution on Platform Tenant
    CREATE OR REPLACE FUNCTION trg_prevent_platform_commercial_pollution()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (NEW.tenant_id = 'zs') THEN
        RAISE EXCEPTION 'CANNOT_POLLUTE_PLATFORM_TENANT: Tenant "zs" is strictly the SaaS platform management tenant. Commercial store records cannot be created in tenant "zs"!';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Attach commercial pollution prevention trigger to core retail store tables
    DO $$
    DECLARE
      tbl text;
      commercial_tables text[] := ARRAY[
        'products', 'product_categories', 'product_units', 'product_location_stock',
        'sales', 'sale_items', 'sale_payments', 'purchases', 'purchase_items',
        'suppliers', 'customers', 'branches', 'stock_locations',
        'stock_movements', 'stock_transfers', 'expenses', 'return_documents'
      ];
    BEGIN
      FOREACH tbl IN ARRAY commercial_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
          EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_pollution ON %I;', tbl);
          EXECUTE format('CREATE TRIGGER trg_prevent_pollution BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trg_prevent_platform_commercial_pollution();', tbl);
        END IF;
      END LOOP;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TRIGGER IF EXISTS trg_users_platform_immunity ON users;
    DROP FUNCTION IF EXISTS trg_protect_platform_super_admin();

    DROP TRIGGER IF EXISTS trg_tenants_platform_immunity ON tenants;
    DROP FUNCTION IF EXISTS trg_protect_platform_tenant_record();

    DO $$
    DECLARE
      tbl text;
      commercial_tables text[] := ARRAY[
        'products', 'product_categories', 'product_units', 'product_location_stock',
        'sales', 'sale_items', 'sale_payments', 'purchases', 'purchase_items',
        'suppliers', 'customers', 'branches', 'stock_locations',
        'stock_movements', 'stock_transfers', 'expenses', 'return_documents'
      ];
    BEGIN
      FOREACH tbl IN ARRAY commercial_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
          EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_pollution ON %I;', tbl);
        END IF;
      END LOOP;
    END $$;

    DROP FUNCTION IF EXISTS trg_prevent_platform_commercial_pollution();
  `.execute(db);
}
