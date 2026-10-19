-- ==============================================================================
-- Z-Systems: Platform Tenant (zs) Purification & Super-Admin Restoration
-- ==============================================================================
-- هذا السكربت يقوم بتطهير منشأة السوبر أدمن المركزية 'zs' من أي بيانات تجارية دخيلة
-- (أصناف، مبيعات، عملاء، فروع) دخلت إليها بالخطأ نتيجة استرجاع نسخة غير صحيحة عليها.
-- يعيد ضبط 'zs' كمنصة ساس مركزية نقية 100%، مع الحفاظ الكامل على باقي المشتركين.
-- ==============================================================================

BEGIN;

SET LOCAL session_replication_role = 'replica';

-- 1. تطهير كافة الجداول التشغيلية والتجارية للمنشأة 'zs'
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
      'held_sale_items', 'held_sales', 'sale_items', 'sale_line_stock_allocations',
      'sale_payments', 'sales_order_items', 'sales_orders', 'sales',
      'customer_payments', 'customer_ledger', 'customer_loyalty_logs', 'customers',
      'purchase_items', 'purchases', 'supplier_ledger', 'supplier_payment_schedule_logs',
      'supplier_payment_schedules', 'supplier_payments', 'suppliers',
      'return_items', 'return_documents', 'damaged_stock_records',
      'stock_count_items', 'stock_count_sessions', 'stock_transfer_items',
      'stock_transfers', 'stock_movements', 'product_location_stock',
      'product_pricing_profiles', 'pricing_rules', 'product_customer_prices',
      'product_offers', 'product_units', 'product_categories', 'products',
      'product_serials', 'online_orders', 'quotation_items', 'quotations',
      'expenses', 'price_change_items', 'price_change_runs', 'cashier_shifts',
      'treasury_transactions', 'journal_entry_lines', 'journal_entries',
      'cost_centers', 'accounting_accounts', 'accounting_settings', 'branches',
      'stock_locations', 'user_branches', 'maritime_containers',
      'maritime_inland_trucking_trips', 'maritime_inquiries',
      'maritime_job_milestones', 'maritime_jobs', 'maritime_quotation_charges',
      'maritime_quotations', 'maritime_rfq_bids', 'maritime_rfqs',
      'shipping_lines', 'shipping_ports', 'van_field_visits',
      'van_load_requisitions', 'van_rep_financial_settlements',
      'van_sales_trips', 'delivery_representatives', 'restaurant_stamp_cards',
      'restaurant_table_layouts', 'storefront_abandoned_carts',
      'storefront_media', 'pos_audit_events', 'operation_executions', 'settings'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DELETE FROM %I WHERE tenant_id = ''zs''', t);
        END IF;
    END LOOP;
END $$;

-- 2. تنظيف الجلسات والمستخدمين الدخلاء في 'zs' (مع الحفاظ على المستخدم الأساسي 'zs')
DELETE FROM sessions WHERE tenant_id = 'zs';
DELETE FROM users WHERE tenant_id = 'zs' AND LOWER(TRIM(username)) != 'zs';

-- 3. تثبيت وضمان منشأة 'zs' في جدول tenants
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
    owner_name = 'محمود زكريا',
    owner_email = 'admin@zsystems.io',
    status = 'active',
    trial_ends_at = NOW() + INTERVAL '100 years',
    updated_at = NOW();

-- 4. ضمان اشتراك ساري أبدي لمنشأة 'zs'
DO $$
DECLARE
    v_plan_id int;
BEGIN
    SELECT id INTO v_plan_id FROM saas_plans ORDER BY id LIMIT 1;
    IF v_plan_id IS NULL THEN v_plan_id := 1; END IF;

    IF EXISTS (SELECT 1 FROM tenant_subscriptions WHERE tenant_id = 'zs') THEN
        UPDATE tenant_subscriptions
        SET status = 'active', ends_at = NOW() + INTERVAL '100 years', grace_ends_at = NOW() + INTERVAL '100 years', updated_at = NOW()
        WHERE tenant_id = 'zs';
    ELSE
        INSERT INTO tenant_subscriptions (
            tenant_id, plan_id, status, starts_at, ends_at, grace_ends_at, auto_renew, created_at, updated_at
        ) VALUES (
            'zs', v_plan_id, 'active', NOW(), NOW() + INTERVAL '100 years', NOW() + INTERVAL '100 years', true, NOW(), NOW()
        );
    END IF;
END $$;

-- 5. تثبيت مستخدم السوبر أدمن 'zs' بصلاحيات كاملة
UPDATE users
SET tenant_id = 'zs',
    account_id = 'zs',
    role = 'super_admin',
    is_active = true,
    display_name = 'محمود زكريا',
    permissions_json = '["dashboard","products","sales","purchases","inventory","suppliers","customers","accounts","accounting","returns","reports","audit","treasury","services","hr","hrEmployees","hrAttendance","hrContracts","hrLoans","hrPayrollView","hrPayrollManage","hrPayrollApprove","hrSalaryView","hrSalaryManage","settings","pricingCenterView","pricingCenterManage","canEditUsers","canManageUsers","canManageSettings","canManageBackups","canPrint","canDiscount","canEditPrice","canSellWholesale","canViewProfit","canDelete","canEditInvoices","canDirectReturn","canAdjustInventory","canManageBranchStock","cashDrawer","deliveryReps"]'::json,
    default_branch_id = NULL,
    failed_login_count = 0,
    locked_until = NULL
WHERE tenant_id = 'zs' AND LOWER(TRIM(username)) = 'zs';

-- ضمان عدم وجود رتبة super_admin داخل منشآت المشتركين
UPDATE users
SET role = 'admin'
WHERE role = 'super_admin' AND tenant_id NOT IN ('zs', 'default', 'dev-tenant');

-- 6. إضافة اسم المنشأة في الإعدادات
INSERT INTO settings (tenant_id, account_id, key, value)
VALUES ('zs', 'zs', 'companyName', '"منصة Z-Systems المركزية"');

SET LOCAL session_replication_role = 'origin';

COMMIT;
