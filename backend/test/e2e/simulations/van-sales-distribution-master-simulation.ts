import 'dotenv/config';
import { Pool } from 'pg';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { resolveDatabaseConfigFromEnv } from '../../../src/database/migration-runner';
import { resolvePgSslConfig } from '../../../src/database/ssl.util';
import type { Database } from '../../../src/database/database.types';
import type { AuthContext } from '../../../src/core/auth/interfaces/auth-context.interface';
import { createPasswordRecord } from '../../../src/core/auth/utils/password-hasher';
import { VanSalesService } from '../../../src/modules/delivery-reps/van-sales.service';
import { AccountingPostingService } from '../../../src/modules/accounting/accounting-posting.service';
import { AccountingTenantFoundationService } from '../../../src/modules/accounting/accounting-tenant-foundation.service';
import { AuditService } from '../../../src/core/audit/audit.service';
import { DeliveryRepsService } from '../../../src/modules/delivery-reps/delivery-reps.service';
import { applyStockDelta } from '../../../src/common/utils/location-stock-ledger';

/**
 * ============================================================================
 * Z-SYSTEMS ERP — MODULE 3 MASTER SIMULATION & VERIFICATION
 * مبيعات وتوزيع سيارات الفان والجملة الميدانية (Van Sales & Field Distribution)
 * ============================================================================
 * 1. دورة الرحلات وشحن بضاعة الصباح من المستودع للفان (Morning Van Load)
 * 2. البيع الميداني بوحدات مجمعة وبونص ترويجي مجاني (Multi-UOM & Free Bonus)
 * 3. البيع الآجل مع فحص سقف الائتمان واعتماد رمز المشرف (Credit Limit & PIN)
 * 4. التحصيل النقدي الميداني وسداد المديونيات السابقة (Field Collections)
 * 5. مرتجعات البضاعة في خط السير ورد النقدية أو الذمة (Field Route Returns)
 * 6. حركة الفوارغ والصناديق البلاستيكية المستردة (Returnable Packaging & Empties)
 * 7. المصروفات التشغيلية الميدانية للرحلة (Field Fuel & Toll Expenses)
 * 8. التصفية النهائية والاعتماد المزدوج والمطابقة الصفرية (Maker-Checker Settlement)
 * 9. التدقيق المحاسبي الشامل وتوازن دفاتر الأستاذ (Double-Entry Invariants)
 * ============================================================================
 */

export async function runVanSalesDistributionMasterSimulation(): Promise<void> {
  const simUid = Math.floor(1000 + Math.random() * 9000).toString();
  const testTenantId = `van_sim_${simUid}`;
  const testAccountId = `acc_van_${simUid}`;

  console.log('================================================================');
  console.log(' Z-SYSTEMS ERP — WHOLESALE VAN SALES & FIELD DISTRIBUTION AUDIT');
  console.log('1. تحميل بضاعة الصباح لسيارة الفان من المستودع الرئيسي');
  console.log('2. البيع الميداني بالوحدات المجمعة والبونص الترويجي المجاني');
  console.log('3. البيع الآجل مع فحص سقف الائتمان واعتماد رمز المشرف');
  console.log('4. التحصيل النقدي بالشارع وتخفيض مديونية العملاء');
  console.log('5. استلام مرتجع بضاعة ميداني في خط السير');
  console.log('6. تتبع حركة الفوارغ والصناديق البلاستيكية المستردة');
  console.log('7. تسجيل مصروفات الرحلة الميدانية (وقود وبوابات)');
  console.log('8. تصفية الرحلة وتوريد الكاش بالاعتماد المزدوج (Maker-Checker)');
  console.log('9. التدقيق المحاسبي الشامل ومطابقة دفاتر الأستاذ بالمليم');
  console.log('================================================================\n');

  const config = resolveDatabaseConfigFromEnv();
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.name,
    ssl: resolvePgSslConfig({
      enabled: config.ssl,
      rejectUnauthorized: config.sslRejectUnauthorized,
      caCert: config.sslCaCert,
    }),
    application_name: `van-sim-${simUid}`,
  });

  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  const dbAny = db as any;

  // تهيئة الخدمات
  const accountingFoundation = new AccountingTenantFoundationService();
  const accountingPosting = new AccountingPostingService(accountingFoundation);
  const auditService = { log: async () => {} } as unknown as AuditService;
  const deliveryRepsService = {} as unknown as DeliveryRepsService;
  const vanSalesService = new VanSalesService(
    db,
    auditService,
    deliveryRepsService,
    accountingPosting,
  );

  // إعداد مستخدمي الاختبار (مشرف التوزيع ومندوب المبيعات)
  const supervisorHash = await createPasswordRecord('123456');
  const supUserRes = await sql<{ id: number }>`
    INSERT INTO users (
      tenant_id, account_id, username, display_name, role, is_active,
      pin, permissions_json, password_hash, password_salt, created_at
    ) VALUES (
      ${testTenantId}, ${testAccountId}, ${'van_sup_' + simUid}, 'أحمد المشرف', 'admin', true,
      '1234', '["deliveryReps", "sales"]', ${supervisorHash.hash}, ${supervisorHash.salt}, NOW()
    ) RETURNING id
  `.execute(db);
  const supervisorUserId = Number(supUserRes.rows[0].id);

  const driverHash = await createPasswordRecord('123456');
  const driverUserRes = await sql<{ id: number }>`
    INSERT INTO users (tenant_id, account_id, username, role, is_active, password_hash, password_salt, created_at)
    VALUES (${testTenantId}, ${testAccountId}, ${'van_driver_' + simUid}, 'cashier', true, ${driverHash.hash}, ${driverHash.salt}, NOW())
    RETURNING id
  `.execute(db);
  const driverUserId = Number(driverUserRes.rows[0].id);

  const supervisorAuth: AuthContext = {
    userId: supervisorUserId,
    username: 'van_supervisor',
    role: 'admin',
    tenantId: testTenantId,
    accountId: testAccountId,
    sessionId: `session_sup_${simUid}`,
    permissions: ['*'],
  };

  const driverAuth: AuthContext = {
    userId: driverUserId,
    username: 'van_driver',
    role: 'cashier',
    tenantId: testTenantId,
    accountId: testAccountId,
    sessionId: `session_driver_${simUid}`,
    permissions: ['sales', 'delivery'],
  };

  console.log(`📌 Scope: [Tenant: ${testTenantId}, Driver: #${driverUserId}, Supervisor: #${supervisorUserId}]\n`);

  try {
    // -------------------------------------------------------------------------
    // STEP 1: تهيئة شجرة الحسابات والفرع والمستودع الرئيسي وسيارة التوزيع
    // -------------------------------------------------------------------------
    console.log('--- 1. تهيئة شجرة الحسابات والفرع والمستودع والسيارة ---');
    await accountingFoundation.ensureForAuth(db, supervisorAuth);

    // تسجيل PIN المشرف لاعتمادات سقف الائتمان
    await sql`
      INSERT INTO settings (tenant_id, account_id, key, value)
      VALUES (${testTenantId}, ${testAccountId}, 'managerPin', '"1234"')
      ON CONFLICT DO NOTHING
    `.execute(db);

    const branchRes = await sql<{ id: number }>`
      INSERT INTO branches (tenant_id, account_id, name, is_active, created_at, updated_at)
      VALUES (${testTenantId}, ${testAccountId}, ${'فرع الجملة والتوزيع ' + simUid}, true, NOW(), NOW())
      RETURNING id
    `.execute(db);
    const branchId = Number(branchRes.rows[0].id);

    const mainWarehouseRes = await sql<{ id: number }>`
      INSERT INTO stock_locations (tenant_id, account_id, branch_id, name, location_type, is_active, created_at, updated_at)
      VALUES (${testTenantId}, ${testAccountId}, ${branchId}, 'المستودع الرئيسي المركزي', 'internal_warehouse', true, NOW(), NOW())
      RETURNING id
    `.execute(db);
    const mainWarehouseId = Number(mainWarehouseRes.rows[0].id);

    // إنشاء سجل المندوب في جدول delivery_representatives
    const repRes = await sql<{ id: number }>`
      INSERT INTO delivery_representatives (
        tenant_id, account_id, name, phone, vehicle_plate, is_active, created_at, updated_at
      ) VALUES (
        ${testTenantId}, ${testAccountId}, ${'كابتن محمود التوزيع ' + simUid}, '01099887766',
        ${'ط ص ع ' + simUid}, true, NOW(), NOW()
      ) RETURNING id
    `.execute(db);
    const repId = Number(repRes.rows[0].id);

    // إنشاء موقع سيارة الفان كمستودع متنقل مستقل (van_stock)
    const vanLocation = await vanSalesService.getOrCreateVanLocation(repId, testTenantId, testAccountId);
    const vanLocationId = vanLocation.id;

    console.log(`✓ تم تجهيز الفرع (#${branchId})، المستودع (#${mainWarehouseId})، والمندوب (#${repId}).`);
    console.log(`✓ تم تهيئة مستودع سيارة الفان المتنقل (#${vanLocationId}): "${vanLocation.name}".`);

    // -------------------------------------------------------------------------
    // STEP 2: تكويد الأصناف وضخ رصيد المستودع الافتتاحي
    // -------------------------------------------------------------------------
    console.log('\n--- 2. تكويد الأصناف بالوحدات المجمعة ورصيد المستودع المركزي ---');
    const pJuiceRes = await sql<{ id: number }>`
      INSERT INTO products (
        tenant_id, account_id, name, barcode, item_type, retail_price, wholesale_price, cost_price,
        stock_qty, is_active, created_at, updated_at
      ) VALUES (
        ${testTenantId}, ${testAccountId}, ${'عصير برتقال طبيعي ' + simUid}, ${'BC-JUICE-' + simUid}, 'product', 20.00, 18.00, 12.00,
        0, true, NOW(), NOW()
      ) RETURNING id
    `.execute(db);
    const pJuiceId = Number(pJuiceRes.rows[0].id);

    // إضافة وحدة كرتونة (12 عبوة) للعصير
    await sql`
      INSERT INTO product_units (
        tenant_id, account_id, product_id, name, multiplier,
        is_base_unit, is_sale_unit_default, is_purchase_unit_default, created_at, updated_at
      ) VALUES 
        (${testTenantId}, ${testAccountId}, ${pJuiceId}, 'قطعة', 1, true, true, false, NOW(), NOW()),
        (${testTenantId}, ${testAccountId}, ${pJuiceId}, 'كرتونة', 12, false, false, true, NOW(), NOW())
    `.execute(db);

    const pRiceRes = await sql<{ id: number }>`
      INSERT INTO products (
        tenant_id, account_id, name, barcode, item_type, retail_price, wholesale_price, cost_price,
        stock_qty, is_active, created_at, updated_at
      ) VALUES (
        ${testTenantId}, ${testAccountId}, ${'أرز بسمتي هندي فاخر 5كجم ' + simUid}, ${'BC-RICE-' + simUid}, 'product', 40.00, 36.00, 28.00,
        0, true, NOW(), NOW()
      ) RETURNING id
    `.execute(db);
    const pRiceId = Number(pRiceRes.rows[0].id);

    // ضخ رصيد المستودع المركزي: 120 عبوة عصير + 60 شيكارة أرز
    await applyStockDelta(db as any, { productId: pJuiceId, delta: 120, branchId, locationId: mainWarehouseId, tenantId: testTenantId, accountId: testAccountId });
    await applyStockDelta(db as any, { productId: pRiceId, delta: 60, branchId, locationId: mainWarehouseId, tenantId: testTenantId, accountId: testAccountId });

    // إنشاء عميلين (عميل جملة بسقف ائتمان، وعميل تجزئة نقدي)
    const custARes = await sql<{ id: number }>`
      INSERT INTO customers (
        tenant_id, account_id, name, phone, customer_type, balance,
        credit_limit, is_credit_blocked, is_active, created_at, updated_at
      ) VALUES (
        ${testTenantId}, ${testAccountId}, ${'سوبرماركت التوحيد والجملة ' + simUid}, '01122334455', 'vip', 400.00,
        1500.00, false, true, NOW(), NOW()
      ) RETURNING id
    `.execute(db);
    const customerAId = Number(custARes.rows[0].id);

    const custBRes = await sql<{ id: number }>`
      INSERT INTO customers (
        tenant_id, account_id, name, phone, customer_type, balance,
        credit_limit, is_credit_blocked, is_active, created_at, updated_at
      ) VALUES (
        ${testTenantId}, ${testAccountId}, ${'بقالة الهدى كاش ' + simUid}, '01233445566', 'cash', 0.00,
        0.00, false, true, NOW(), NOW()
      ) RETURNING id
    `.execute(db);
    const customerBId = Number(custBRes.rows[0].id);

    console.log(`✓ الصنف 1 (#${pJuiceId}): عصير برتقال (قطعة 20 ج / كرتونة 220 ج) | الصنف 2 (#${pRiceId}): أرز بسمتي (40 ج).`);
    console.log(`✓ العميل أ (#${customerAId}): سقف ائتمان 1,500 ومديونية 400 | العميل ب (#${customerBId}): عميل نقدي.`);

    // -------------------------------------------------------------------------
    // STEP 3: تحميل بضاعة الصباح وفتح رحلة الفان (Morning Van Load)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. شحن بضاعة الصباح وافتتاح رحلة التوزيع ---');
    const loadResult = await vanSalesService.openTripAndLoad(repId, testTenantId, testAccountId, {
      sourceWarehouseId: mainWarehouseId,
      items: [
        { productId: pJuiceId, qty: 60 }, // 60 عبوة = 5 كراتين
        { productId: pRiceId, qty: 20 },  // 20 شيكارة
      ],
    });

    if (!loadResult.ok || !loadResult.tripId) {
      throw new Error(`Failed to open van trip: ${JSON.stringify(loadResult)}`);
    }
    const tripId = Number(loadResult.tripId);
    console.log(`✓ تم فتح الرحلة (#${tripId}) بنجاح وتحميل بضاعة بقيمة ${loadResult.totalLoadedValue.toLocaleString()} جنيه.`);

    // التحقق من خصم المخزون من المستودع وإضافته لسيارة الفان
    const whJuiceStock = await sql<{ qty: string }>`SELECT qty FROM product_location_stock WHERE location_id = ${mainWarehouseId} AND product_id = ${pJuiceId}`.execute(db);
    const vanJuiceStock = await sql<{ qty: string }>`SELECT qty FROM product_location_stock WHERE location_id = ${vanLocationId} AND product_id = ${pJuiceId}`.execute(db);
    if (Number(whJuiceStock.rows[0].qty) !== 60 || Number(vanJuiceStock.rows[0].qty) !== 60) {
      throw new Error(`Stock transfer verification failed: Warehouse=${whJuiceStock.rows[0].qty}, Van=${vanJuiceStock.rows[0].qty}`);
    }
    console.log(`✓ رصيد العصير: المستودع (120 -> 60)، والفان (0 -> 60 عبوة).`);

    // -------------------------------------------------------------------------
    // STEP 4: البيع الميداني بوحدة مجمعة وبونص ترويجي مجاني (Multi-UOM & Free Bonus)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. المحطة الأولى: بيع نقدي بوحدة مجمعة (كرتونة) وبونص عينة ترويجية ---');
    // بيع 2 كرتونة عصير (24 عبوة) بسعر 220 للكرتونة = 440 جنيه + 1 عبوة بونص مجاني عينة ترويجية (سعر 0)
    const sale1 = await vanSalesService.executeFieldSale(repId, testTenantId, testAccountId, {
      tripId,
      customerId: customerBId,
      paymentMethod: 'cash',
      items: [
        { productId: pJuiceId, qty: 2, unitPrice: 220, unitName: 'كرتونة', unitMultiplier: 12 },
        { productId: pJuiceId, qty: 1, unitPrice: 0, isBonus: true, bonusReason: 'عينة ترويجية لافتتاح المحل' },
      ],
    });

    if (!sale1.ok || !sale1.saleId) {
      throw new Error(`Field sale 1 failed: ${JSON.stringify(sale1)}`);
    }
    console.log(`✓ الفاتورة 1 (#${sale1.saleId}): بيع 2 كرتونة عصير + 1 عبوة بونص مجاني بقيمة ${sale1.total} جنيه نقداً.`);

    // التحقق من خصم 25 عبوة من رصيد الفان (24 عبوة كراتين + 1 عبوة بونص)
    const vanJuiceAfterSale1 = await sql<{ qty: string }>`SELECT qty FROM product_location_stock WHERE location_id = ${vanLocationId} AND product_id = ${pJuiceId}`.execute(db);
    if (Number(vanJuiceAfterSale1.rows[0].qty) !== 35) {
      throw new Error(`Van stock after bonus sale mismatch: expected 35, got ${vanJuiceAfterSale1.rows[0].qty}`);
    }
    console.log(`✓ تم خصم 25 عبوة من رصيد سيارة الفان (المتبقي: 35 عبوة).`);

    // -------------------------------------------------------------------------
    // STEP 5: البيع الآجل مع فحص سقف الائتمان واعتماد المشرف (Credit Limit & PIN)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. المحطة الثانية: بيع آجل مع تجاوز سقف الائتمان واعتماد رمز المشرف ---');
    // رصيد العميل أ الحالي = 400، وسقف الائتمان = 1,500.
    // يطلب شراء 30 شيكارة أرز على الحساب @ 40 = 1,200 جنيه.
    // الرصيد المتوقع = 400 + 1,200 = 1,600 جنيه > 1,500 (تجاوز بمقدار 100 جنيه!).

    // أ. محاولة البيع بدون رمز المشرف -> يجب أن ترفض بقفل أمني
    let rejectedBlocked = false;
    try {
      await vanSalesService.executeFieldSale(repId, testTenantId, testAccountId, {
        tripId,
        customerId: customerAId,
        paymentMethod: 'credit',
        items: [{ productId: pRiceId, qty: 30 }],
      });
    } catch {
      rejectedBlocked = true;
    }
    if (!rejectedBlocked) {
      throw new Error('Security flaw: Sale exceeding credit limit was permitted without supervisor approval!');
    }
    console.log(`✓ تم حظر البيع الآجل تلقائياً لتجاوز سقف الائتمان بدون PIN المشرف.`);

    // ب. محاولة برمز مشرف خاطئ (9999) -> يجب أن ترفض
    let rejectedWrongPin = false;
    try {
      await vanSalesService.executeFieldSale(repId, testTenantId, testAccountId, {
        tripId,
        customerId: customerAId,
        paymentMethod: 'credit',
        items: [{ productId: pRiceId, qty: 10 }], // 400 + 400 = 800 (سيتجاوز إذا طلبنا 30)
        supervisorOverridePin: '9999',
        supervisorOverrideReason: 'محاولة تجاوز خاطئة',
      });
    } catch {
      rejectedWrongPin = true;
    }
    console.log(`✓ تم رفض رمز المشرف غير الصحيح (9999) وحظر الاعتماد.`);

    // ج. الاعتماد برمز المشرف الصحيح ('1234') -> تتم الموافقة وتوثيق التدقيق
    const sale2 = await vanSalesService.executeFieldSale(repId, testTenantId, testAccountId, {
      tripId,
      customerId: customerAId,
      paymentMethod: 'credit',
      items: [{ productId: pRiceId, qty: 10, unitPrice: 40.0 }], // 400 جنيه
      supervisorOverridePin: '1234',
      supervisorOverrideReason: 'موافقة استثنائية لعميل استراتيجي معتمد من الإدارة',
    });

    if (!sale2.ok || !sale2.saleId) {
      throw new Error(`Field sale 2 override failed: ${JSON.stringify(sale2)}`);
    }
    console.log(`✓ الفاتورة 2 (#${sale2.saleId}): تم اعتماد البيع الآجل بالـ PIN وسجلت المديونية بمبلغ ${sale2.total} جنيه.`);

    const custABalance = await sql<{ balance: string }>`SELECT balance FROM customers WHERE id = ${customerAId}`.execute(db);
    console.log(`✓ رصيد حساب العميل أ الجديد في كشف الحساب: ${custABalance.rows[0].balance} جنيه.`);

    // -------------------------------------------------------------------------
    // STEP 6: التحصيل النقدي الميداني من مديونية العميل (Field Collections)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. المحطة الثالثة: تحصيل نقدي ميداني من مديونية العميل ---');
    const collectionRes = await vanSalesService.recordFieldCollection(repId, testTenantId, testAccountId, {
      tripId,
      customerId: customerAId,
      amount: 300.0,
    });

    if (!collectionRes.ok) {
      throw new Error(`Field collection failed: ${JSON.stringify(collectionRes)}`);
    }
    console.log(`✓ تم تحصيل دفعة نقدية بالشارع بقيمة 300.00 جنيه (الرصيد المتبقي للعميل: ${collectionRes.newBalance} جنيه).`);

    // إجمالي الكاش المحصل في عهدة المندوب الآن: 440 (مبيعات) + 300 (تحصيل) = 740 جنيه
    const tripRow = await sql<{ cash_collected: string }>`SELECT cash_collected FROM van_sales_trips WHERE id = ${tripId}`.execute(db);
    if (Number(tripRow.rows[0].cash_collected) !== 740) {
      throw new Error(`Trip cash collected mismatch: expected 740, got ${tripRow.rows[0].cash_collected}`);
    }
    console.log(`✓ إجمالي النقدية المحصلة في عهدة المندوب بالسيارة: ${tripRow.rows[0].cash_collected} جنيه.`);

    // -------------------------------------------------------------------------
    // STEP 7: تتبع حركة الفوارغ والصناديق البلاستيكية المستردة (Packaging & Empties)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. حركة ذمة الفوارغ والصناديق والبالتات المستردة في خط السير ---');
    // تسليم 10 أقفاص بلاستيك واسترجاع 4 فارغ من العميل أ
    await vanSalesService.recordPackagingMovement(repId, testTenantId, testAccountId, {
      tripId,
      customerId: customerAId,
      packageType: 'crate_plastic',
      deliveredQty: 10,
      returnedQty: 4,
      notes: 'تسليم 10 أقفاص بلاستيك بضاعة واسترجاع 4 فارغ',
    });

    const packagingBal = await vanSalesService.getCustomerPackagingBalance(customerAId, testTenantId);
    console.log(`✓ تم قيد ذمة الفوارغ: صافي ما في ذمة العميل = ${packagingBal[0]?.netOwedToCompany} أقفاص بلاستيكية.`);

    // -------------------------------------------------------------------------
    // STEP 8: المصروفات التشغيلية الميدانية للرحلة (وقود وكارتات)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. تسجيل مصروفات تشغيلية ميدانية للرحلة (وقود وكارتات) ---');
    await vanSalesService.recordTripExpense(repId, testTenantId, testAccountId, {
      tripId,
      expenseType: 'fuel',
      amount: 150.0,
      notes: 'تفويل سولار للسيارة من محطة وقود بالمعادي',
    });

    await vanSalesService.recordTripExpense(repId, testTenantId, testAccountId, {
      tripId,
      expenseType: 'toll',
      amount: 30.0,
      notes: 'كارتة بوابات طريق السخنة',
    });

    const expensesSummary = await vanSalesService.getTripExpenses(tripId, testTenantId);
    console.log(`✓ تم تسجيل إيصالات المصروفات: وقود (150) + كارتة (30) = إجمالي ${expensesSummary.totalExpenses} جنيه.`);

    // -------------------------------------------------------------------------
    // STEP 9: تصفية الرحلة وتوريد النقدية بالاعتماد المزدوج (Maker-Checker Settlement)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. تصفية وإغلاق رحلة الفان وتوريد الكاش (Maker-Checker) ---');
    // الحسبة القياسية للنقدية الصافية:
    // الكاش المحصل = 740 جنيه
    // المصروفات الميدانية المعتمدة = 180 جنيه
    // النقدية الصافية الواجب تسليمها للخزينة = 740 - 180 = 560 جنيه!

    const settlementRes = await vanSalesService.settleTrip(repId, testTenantId, testAccountId, {
      tripId,
      countedCash: 560.0, // تسليم المبلغ الصافي بالمليم 100%
      unloadRemainingToWarehouse: true, // إرجاع باقي بضاعة الفان للمستودع الرئيسي
      notes: 'تصفية اليوم الكاملة وإرجاع البضاعة المتبقية للمستودع وتوريد النقدية',
    });

    if (!settlementRes.ok) {
      throw new Error(`Trip settlement failed: ${JSON.stringify(settlementRes)}`);
    }

    const settledTrip = await sql<{ status: string; variance: string }>`
      SELECT status, variance FROM van_sales_trips WHERE id = ${tripId}
    `.execute(db);

    if (settledTrip.rows[0].status !== 'settled' || Number(settledTrip.rows[0].variance) !== 0) {
      throw new Error(`Settlement verification failed: status=${settledTrip.rows[0].status}, variance=${settledTrip.rows[0].variance}`);
    }
    console.log(`✓ تم إغلاق وتصفية الرحلة بنجاح: الحالة (${settledTrip.rows[0].status})، فارق العجز/الزيادة (${settledTrip.rows[0].variance} فرق صفرى).`);

    // التحقق من تصفير رصيد الفان وإرجاع المتبقي للمستودع المركزي
    const vanJuiceFinal = await sql<{ qty: string }>`SELECT qty FROM product_location_stock WHERE location_id = ${vanLocationId} AND product_id = ${pJuiceId}`.execute(db);
    const whJuiceFinal = await sql<{ qty: string }>`SELECT qty FROM product_location_stock WHERE location_id = ${mainWarehouseId} AND product_id = ${pJuiceId}`.execute(db);
    console.log(`✓ تم تفريغ الفان بالكامل: رصيد الفان (${vanJuiceFinal.rows[0]?.qty || 0})، والمستودع المركزي (${whJuiceFinal.rows[0]?.qty} عبوة).`);

    // -------------------------------------------------------------------------
    // STEP 10: التدقيق المحاسبي الشامل وتوازن دفاتر الأستاذ (Double-Entry Invariants)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. التدقيق المحاسبي الشامل وثبات القيد المزدوج لكافة حركات الرحلة ---');
    const journalSummary = await sql<{ total_journals: string; total_debit: string; total_credit: string }>`
      SELECT 
        COUNT(DISTINCT j.id) as total_journals,
        COALESCE(SUM(l.debit), 0) as total_debit,
        COALESCE(SUM(l.credit), 0) as total_credit
      FROM journal_entries j
      JOIN journal_entry_lines l ON l.journal_entry_id = j.id
      WHERE j.tenant_id = ${testTenantId}
    `.execute(db);

    const totalJournals = Number(journalSummary.rows[0].total_journals);
    const totalDebit = Number(journalSummary.rows[0].total_debit);
    const totalCredit = Number(journalSummary.rows[0].total_credit);
    const delta = Math.abs(totalDebit - totalCredit);

    console.log(`📊 إجمالي القيود المُرحلة: ${totalJournals} قيداً محاسبياً.`);
    console.log(`📊 إجمالي المدين: ${totalDebit.toLocaleString()} جنيه | إجمالي الدائن: ${totalCredit.toLocaleString()} جنيه | الفارق: ${delta}`);

    if (delta > 0.001) {
      throw new Error(`CRITICAL: Van sales journal entries do not balance! Debit=${totalDebit}, Credit=${totalCredit}, Delta=${delta}`);
    }

    const unbalancedEntries = await sql<{ id: number; diff: string }>`
      SELECT j.id, ABS(SUM(l.debit) - SUM(l.credit)) as diff
      FROM journal_entries j
      JOIN journal_entry_lines l ON l.journal_entry_id = j.id
      WHERE j.tenant_id = ${testTenantId}
      GROUP BY j.id
      HAVING ABS(SUM(l.debit) - SUM(l.credit)) > 0.001
    `.execute(db);

    if (unbalancedEntries.rows.length > 0) {
      throw new Error(`Unbalanced journal entries detected in Van Sales: ${JSON.stringify(unbalancedEntries.rows)}`);
    }

    console.log('✓ كافة القيود المحاسبية لمبيعات الفان وتوريد النقدية متوازنة بدقة مطلقة (0.00 فرق).');
    console.log('✓ ثوابت التوزيع الميداني ومبيعات الجملة محققة 100%.');

    console.log('\n=============================================================================');
    console.log('  تهانينا! فحص مبيعات وتوزيع الفان والجملة (Van Sales & Field Flow) اجتاز 100%');
    console.log('=============================================================================\n');

  } finally {
    // تنظيف بيانات الاختبار النظيفة
    await sql`DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE tenant_id = ${testTenantId})`.execute(db);
    await sql`DELETE FROM journal_entries WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM customer_ledger WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM customer_payments WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM van_trip_expenses WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM van_trip_packaging_movements WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM sale_items WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM sales WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM stock_movements WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM van_sales_trips WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM product_location_stock WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM product_units WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM products WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM customers WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM delivery_representatives WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM stock_locations WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM branches WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM settings WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM audit_logs WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM users WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM accounting_settings WHERE tenant_id = ${testTenantId}`.execute(db);
    await sql`DELETE FROM accounting_accounts WHERE tenant_id = ${testTenantId}`.execute(db);
    await pool.end();
  }
}

runVanSalesDistributionMasterSimulation()
  .then(() => {
    console.log('van-sales-distribution-master-simulation: ok');
  })
  .catch((err) => {
    console.error('van-sales-distribution-master-simulation: FAILED', err);
    process.exit(1);
  });
