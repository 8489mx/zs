import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { AuditService } from '../../../core/audit/audit.service';
import { SettingsBackupService } from './settings-backup.service';
import { createPasswordRecord, verifyPassword } from '../../../core/auth/utils/password-hasher';

@Injectable()
export class SettingsDemoDataService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
    private readonly backupService: SettingsBackupService,
  ) {}

  private scope(actor: AuthContext): { tenantId: string; accountId: string } {
    const tenantId = String(actor.tenantId || '').trim();
    const accountId = String(actor.accountId || actor.tenantId || '').trim();
    if (!tenantId || !accountId) {
      throw new AppError('Tenant scope missing', 'MISSING_TENANT_SCOPE', 400);
    }
    return { tenantId, accountId };
  }

  private async assertSuperAdminAndPassword(password: string, actor: AuthContext): Promise<void> {
    if (actor.role !== 'super_admin') {
      throw new AppError('فقط السوبر أدمن هو المخول بتنفيذ هذه العملية', 'SUPER_ADMIN_REQUIRED', 403);
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      throw new AppError('يرجى إدخال كلمة مرور السوبر أدمن لتأكيد العملية', 'PASSWORD_REQUIRED', 400);
    }

    const scope = this.scope(actor);
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'password_hash', 'password_salt'])
      .where('id', '=', actor.userId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();

    if (!user || !user.password_hash) {
      throw new AppError('تعذر التحقق من حساب المستخدم', 'USER_NOT_FOUND', 404);
    }

    const check = await verifyPassword(password.trim(), String(user.password_hash), String(user.password_salt || ''));
    if (!check.valid) {
      throw new AppError('كلمة مرور السوبر أدمن غير صحيحة', 'INVALID_SUPER_ADMIN_PASSWORD', 401);
    }
  }

  private async takeAutoBackup(actor: AuthContext, reason: string): Promise<void> {
    try {
      const scope = this.scope(actor);
      const now = new Date();
      const { manifest } = await this.backupService.exportBackup(actor);
      await sql`insert into backup_snapshots (label, source, payload_json, tenant_id, account_id) values (${'auto-' + reason + '-' + now.toISOString()}, ${'demo-data-guard'}, ${JSON.stringify({ manifest })}::jsonb, ${scope.tenantId}, ${scope.accountId})`.execute(this.db).catch(() => undefined);
      await this.backupService.saveBackupToConfiguredFolder(actor).catch(() => undefined);
    } catch {
      // Backup attempt logged, continue with operation
    }
  }

  async getDemoDataStatus(actor: AuthContext): Promise<{ isEmpty: boolean; productCount: number; saleCount: number; isSuperAdmin: boolean }> {
    const scope = this.scope(actor);
    const productCountRes = await this.db
      .selectFrom('products')
      .select(this.db.fn.count('id').as('cnt'))
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
    const saleCountRes = await this.db
      .selectFrom('sales')
      .select(this.db.fn.count('id').as('cnt'))
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();

    const productCount = Number(productCountRes?.cnt || 0);
    const saleCount = Number(saleCountRes?.cnt || 0);
    const isEmpty = productCount === 0 && saleCount === 0;
    const isSuperAdmin = actor.role === 'super_admin';

    return {
      isEmpty,
      productCount,
      saleCount,
      isSuperAdmin,
    };
  }

  async wipeAllData(password: string, actor: AuthContext): Promise<{ ok: boolean; message: string }> {
    await this.assertSuperAdminAndPassword(password, actor);
    const scope = this.scope(actor);

    await this.takeAutoBackup(actor, 'before_wipe');

    await this.db.transaction().execute(async (trx) => {
      // 1. Operational tables
      await trx.deleteFrom('sale_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('sale_payments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('held_sale_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('held_sales').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('sales').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('purchase_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('purchase_attachments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('purchases').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('return_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('return_documents').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('cashier_shifts').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('treasury_transactions').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('expenses').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('customer_payments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('customer_ledger').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('customers').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('supplier_payment_schedule_logs').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('supplier_payment_schedules').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('supplier_payments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('supplier_ledger').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('suppliers').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('delivery_representatives').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('stock_transfer_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('stock_transfers').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('stock_count_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('stock_count_sessions').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('damaged_stock_records').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('stock_movements').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('product_location_stock').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      // Manufacturing & Work Orders (must be deleted before products/stock)
      await trx.deleteFrom('manufacturing_wo_consumptions')
        .where(
          'work_order_id',
          'in',
          trx.selectFrom('manufacturing_work_orders').select('id').where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        )
        .execute();
      await trx.deleteFrom('manufacturing_work_orders').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await trx.deleteFrom('manufacturing_bom_lines')
        .where(
          'bom_id',
          'in',
          trx.selectFrom('manufacturing_boms').select('id').where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        )
        .execute();
      await trx.deleteFrom('manufacturing_boms').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      // Import & Export Shipments (must be deleted before products/suppliers)
      await (trx as any).deleteFrom('import_sale_partner_shares').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await (trx as any).deleteFrom('import_sales_and_profit').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await (trx as any).deleteFrom('import_shipment_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await (trx as any).deleteFrom('import_shipments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await (trx as any).deleteFrom('import_partners').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);

      // Maintenance & Trade-in & Online Orders & Pharmacy
      await trx.deleteFrom('maintenance_ticket_parts').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('maintenance_tickets').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('trade_in_transactions').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('online_orders').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);

      await trx.deleteFrom('pharmacy_clinical_services').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('pharmacy_shortages').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('pharmacy_prescriptions').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('pharmacy_batches').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('pharmacy_drugs').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);

      // Price change runs & allocations
      await trx.deleteFrom('sale_line_stock_allocations').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('price_change_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);
      await trx.deleteFrom('price_change_runs').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);

      await trx.deleteFrom('product_offers').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('product_units').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('product_customer_prices').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('product_pricing_profiles').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('pricing_rules').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('products').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('product_categories').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      // 2. HR tables
      await trx.deleteFrom('hr_attendance_records').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_attendance_exceptions').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_leave_requests').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_leave_types').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employee_loans').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employee_loan_installments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employee_ledger').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employee_assets').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_payroll_run_items').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_payroll_item_adjustments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_payroll_runs').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employment_contracts').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_compensation_packages').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employee_documents').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employee_contacts').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_employees').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_positions').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_job_titles').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('hr_departments').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      // 3. Accounting & Journals
      await trx.deleteFrom('journal_entry_lines').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('journal_entries').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      // Services (must be deleted before users)
      await trx.deleteFrom('services').where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute().catch(() => undefined);

      // Unlink any audit logs or subscription payments created by users being deleted
      await trx.updateTable('audit_logs')
        .set({ created_by: null })
        .where(
          'created_by',
          'in',
          trx.selectFrom('users').select('id').where('id', '<>', actor.userId).where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        )
        .execute();

      await (trx as any).updateTable('tenant_subscription_payments')
        .set({ created_by: null })
        .where(
          'created_by',
          'in',
          trx.selectFrom('users').select('id').where('id', '<>', actor.userId).where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        )
        .execute().catch(() => undefined);

      // 4. Delete demo users (keep current user)
      await trx.deleteFrom('users')
        .where('id', '<>', actor.userId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute();
    });

    await this.audit.log('تصفير النظام والبيانات', `تم تصفير ومسح كافة بيانات النظام بواسطة ${actor.username}`, actor).catch(() => undefined);

    return {
      ok: true,
      message: 'تم تصفير ومسح كافة البيانات بنجاح، والنظام الآن جاهز ونظيف تماماً للبدء الفعلي.',
    };
  }

  async seedComprehensiveDemoData(password: string, actor: AuthContext): Promise<{ ok: boolean; message: string }> {
    const status = await this.getDemoDataStatus(actor);
    const scope = this.scope(actor);

    // If store already contains data, strictly require super admin + password!
    if (!status.isEmpty) {
      await this.assertSuperAdminAndPassword(password, actor);
      await this.takeAutoBackup(actor, 'before_demo_seed');
      await this.wipeAllData(password, actor);
    } else {
      // If store is completely empty, allow any admin/super_admin/owner to seed without password
      if (!actor || (!['admin', 'super_admin', 'owner'].includes(actor.role))) {
        throw new AppError('فقط المسؤول أو السوبر أدمن هو المخول ببدء البيانات التجريبية', 'ADMIN_REQUIRED', 403);
      }
      await this.takeAutoBackup(actor, 'before_empty_demo_seed');
    }

    await this.db.transaction().execute(async (trx) => {
      // 1. Ensure Default Branch & Stock Locations
      let branch = await trx.selectFrom('branches').select(['id', 'name']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (!branch) {
        const branchRes = await trx.insertInto('branches').values({
          name: 'الفرع الرئيسي',
          code: 'BR-01',
          sales_stock_mode: 'single_location',
          allow_external_sales_stock: true,
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id', 'name']).executeTakeFirst();
        branch = branchRes;
      }

      let location = await trx.selectFrom('stock_locations').select(['id', 'name']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (!location) {
        const locRes = await trx.insertInto('stock_locations').values({
          name: 'المستودع الرئيسي',
          code: 'LOC-MAIN',
          branch_id: branch?.id ? Number(branch.id) : null,
          location_type: 'internal_warehouse',
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id', 'name']).executeTakeFirst();
        location = locRes;
      }

      const branchId = branch?.id ? Number(branch.id) : 1;
      const locationId = location?.id ? Number(location.id) : 1;

      // 2. Demo Users: كاشير1, كاشير2, admin (Password: 1)
      const pass1 = await createPasswordRecord('1');
      const demoUsers = [
        { username: 'كاشير1', display_name: 'أحمد محمود (كاشير 1)', role: 'cashier' as const, permissions_json: '["pos","sales"]' },
        { username: 'كاشير2', display_name: 'محمد إبراهيم (كاشير 2)', role: 'cashier' as const, permissions_json: '["pos","sales"]' },
        { username: 'admin', display_name: 'مدير النظام التجريبي', role: 'admin' as const, permissions_json: '["*"]' },
      ];

      for (const u of demoUsers) {
        await trx.insertInto('users').values({
          username: u.username,
          display_name: u.display_name,
          role: u.role,
          password_hash: pass1.hash,
          password_salt: pass1.salt,
          permissions_json: u.permissions_json,
          is_active: true,
          must_change_password: false,
          failed_login_count: 0,
          default_branch_id: branchId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).execute();
      }

      // 3. Product Categories
      const categories = [
        'بقالة ومواد غذائية',
        'مشروبات وعصائر ومياه',
        'منظفات وعناية منزلية',
        'ألبان وجبن وبيض',
        'حلويات وبسكويت ومسليات',
        'مجمدات ولحوم ودواجن',
      ];

      const categoryMap = new Map<string, number>();
      for (const catName of categories) {
        const res = await trx.insertInto('product_categories').values({
          name: catName,
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();
        if (res) categoryMap.set(catName, Number(res.id));
      }

      // 4. Suppliers (8 Realistic Egyptian Suppliers)
      const suppliersData = [
        { name: 'شركة جهينة للصناعات الغذائية', phone: '01011112222', address: 'مدينة 6 أكتوبر - الجيزة', balance: -14500 },
        { name: 'شركة المراعي مصر', phone: '01022223333', address: 'التجمع الخامس - القاهرة', balance: -8200 },
        { name: 'شركة صافولا للأغذية (عافية وسكر)', phone: '01033334444', address: 'مدينة العاشر من رمضان', balance: -22000 },
        { name: 'شركة إيديتا للصناعات الغذائية', phone: '01044445555', address: 'بني سويف الصناعية', balance: -5400 },
        { name: 'شركة يونيليفر المشرق (أومو وفيري)', phone: '01055556666', address: 'برج النيل - القاهرة', balance: -16800 },
        { name: 'شركة شيبسي للصناعات الغذائية (بيبسيكو)', phone: '01066667777', address: 'مدينة نصر - القاهرة', balance: -9600 },
        { name: 'شركة الضحى للأغذية والحبوب', phone: '01077778888', address: 'قليوب - القليوبية', balance: -12300 },
        { name: 'شركة كوكاكولا هيلينيك مصر', phone: '01088889999', address: 'مدينة العبور - القليوبية', balance: -7100 },
      ];

      const supplierIds: number[] = [];
      for (const sup of suppliersData) {
        const res = await trx.insertInto('suppliers').values({
          name: sup.name,
          phone: sup.phone,
          address: sup.address,
          balance: sup.balance,
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();
        if (res) supplierIds.push(Number(res.id));
      }

      // 5. Customers (10 Realistic Customers: Retail, Wholesale, Companies)
      const customersData = [
        { name: 'سوبر ماركت الأمانة والتقوى', phone: '01112345671', address: 'شارع الملك فيصل - الجيزة', balance: 6400, credit_limit: 25000 },
        { name: 'مطعم ومشويات البرنس', phone: '01112345672', address: 'إمبابة - الجيزة', balance: 12800, credit_limit: 40000 },
        { name: 'كافيه وكافتيريا الأهرام', phone: '01112345673', address: 'شارع الهرم - الجيزة', balance: 3200, credit_limit: 15000 },
        { name: 'شركة النيل العامة للمقاولات', phone: '01112345674', address: 'الدقي - الجيزة', balance: 18500, credit_limit: 50000 },
        { name: 'د. طارق عبد الله خليل', phone: '01112345675', address: 'مصر الجديدة - القاهرة', balance: 850, credit_limit: 5000 },
        { name: 'أستاذ عمر الشريف عبد الرحمن', phone: '01112345676', address: 'المعادي - القاهرة', balance: 0, credit_limit: 10000 },
        { name: 'صيدلية الشفاء التخصصية', phone: '01112345677', address: 'شبرا - القاهرة', balance: 4100, credit_limit: 20000 },
        { name: 'فندق وكازينو رويال بلازا', phone: '01112345678', address: 'الزمالك - القاهرة', balance: 29000, credit_limit: 80000 },
        { name: 'مهندس حسام أحمد محمود', phone: '01112345679', address: 'التجمع الأول - القاهرة الجديدة', balance: 1200, credit_limit: 10000 },
        { name: 'عميل نقدي مباشر', phone: '01110000000', address: 'صالة البيع', balance: 0, credit_limit: 0 },
      ];

      const customerIds: number[] = [];
      for (const cust of customersData) {
        const res = await trx.insertInto('customers').values({
          name: cust.name,
          phone: cust.phone,
          address: cust.address,
          balance: cust.balance,
          credit_limit: cust.credit_limit,
          customer_type: 'cash',
          store_credit_balance: 0,
          company_name: '',
          tax_number: '',
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();
        if (res) customerIds.push(Number(res.id));
      }

      // 6. Delivery Representatives (مناديب التوصيل)
      const deliveryRepsData = [
        { name: 'كابتن حسام حسن', phone: '01221110001', full_name: 'حسام حسن إبراهيم', vehicle_plate: 'أ ب ج 1234', rep_type: 'freelance' },
        { name: 'كابتن طارق علي', phone: '01221110002', full_name: 'طارق علي مصطفى', vehicle_plate: 'س ص ع 5678', rep_type: 'freelance' },
        { name: 'كابتن محمود رضا', phone: '01221110003', full_name: 'محمود رضا الشناوي', vehicle_plate: 'د هـ و 9012', rep_type: 'freelance' },
        { name: 'كابتن علي سمير', phone: '01221110004', full_name: 'علي سمير جاد', vehicle_plate: 'ر ز ح 3456', rep_type: 'freelance' },
        { name: 'كابتن خالد نبيل', phone: '01221110005', full_name: 'خالد نبيل فاروق', vehicle_plate: 'ط ك ل 7890', rep_type: 'freelance' },
        { name: 'كابتن أحمد يوسف', phone: '01221110006', full_name: 'أحمد يوسف غانم', vehicle_plate: 'م ن هـ 2345', rep_type: 'freelance' },
      ];

      const deliveryRepIds: number[] = [];
      for (const rep of deliveryRepsData) {
        const res = await trx.insertInto('delivery_representatives').values({
          name: rep.name,
          phone: rep.phone,
          full_name: rep.full_name,
          vehicle_plate: rep.vehicle_plate,
          rep_type: rep.rep_type,
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();
        if (res) deliveryRepIds.push(Number(res.id));
      }

      // 7. Products (50 Realistic Retail Products)
      const catG = categoryMap.get('بقالة ومواد غذائية') || 1;
      const catB = categoryMap.get('مشروبات وعصائر ومياه') || 2;
      const catC = categoryMap.get('منظفات وعناية منزلية') || 3;
      const catD = categoryMap.get('ألبان وجبن وبيض') || 4;
      const catS = categoryMap.get('حلويات وبسكويت ومسليات') || 5;
      const catF = categoryMap.get('مجمدات ولحوم ودواجن') || 6;

      const productsData = [
        // Grocery
        { name: 'أرز فاخر الضحى 1 كجم', barcode: '6221001001', category_id: catG, cost: 32, retail: 40, wholesale: 36, stock: 350, min: 20 },
        { name: 'سكر الأسرة نقي 1 كجم', barcode: '6221001002', category_id: catG, cost: 28, retail: 35, wholesale: 31, stock: 400, min: 30 },
        { name: 'زيت ذرة عافية بلس 800 مل', barcode: '6221001003', category_id: catG, cost: 68, retail: 85, wholesale: 76, stock: 220, min: 15 },
        { name: 'زيت عباد الشمس كريستال 1 لتر', barcode: '6221001004', category_id: catG, cost: 65, retail: 80, wholesale: 72, stock: 180, min: 15 },
        { name: 'مكرونة روجينا فرن 400 جم', barcode: '6221001005', category_id: catG, cost: 16, retail: 22, wholesale: 19, stock: 280, min: 25 },
        { name: 'مكرونة الملكة سباجيتي 400 جم', barcode: '6221001006', category_id: catG, cost: 12, retail: 16, wholesale: 14, stock: 320, min: 30 },
        { name: 'سمن نباتي روابي بطعم الزبدة 700 جم', barcode: '6221001007', category_id: catG, cost: 58, retail: 72, wholesale: 65, stock: 140, min: 10 },
        { name: 'شاي العروسة ناعم 250 جم', barcode: '6221001008', category_id: catG, cost: 42, retail: 52, wholesale: 47, stock: 300, min: 20 },
        { name: 'شاي ليبتون أحمر خرز 100 فتلة', barcode: '6221001009', category_id: catG, cost: 60, retail: 75, wholesale: 68, stock: 160, min: 15 },
        { name: 'نسكافيه كلاسيك سريع التحضير 100 جم', barcode: '6221001010', category_id: catG, cost: 85, retail: 110, wholesale: 98, stock: 95, min: 10 },
        { name: 'دقيق الضحى فاخر جميع الأغراض 1 كجم', barcode: '6221001011', category_id: catG, cost: 22, retail: 28, wholesale: 25, stock: 210, min: 20 },
        { name: 'صلصة طماطم هاينز برطمان 360 جم', barcode: '6221001012', category_id: catG, cost: 24, retail: 32, wholesale: 28, stock: 190, min: 15 },
        { name: 'تونة صن شاين قطع سهلة الفتح 185 جم', barcode: '6221001013', category_id: catG, cost: 48, retail: 62, wholesale: 54, stock: 170, min: 15 },
        { name: 'فول مدمس هارفست سادة 400 جم', barcode: '6221001014', category_id: catG, cost: 14, retail: 19, wholesale: 16, stock: 240, min: 20 },
        { name: 'خل قصب طبيعي هاينز 1 لتر', barcode: '6221001015', category_id: catG, cost: 11, retail: 15, wholesale: 13, stock: 150, min: 10 },

        // Dairy
        { name: 'لبن جهينة كامل الدسم 1 لتر تتراباك', barcode: '6221002001', category_id: catD, cost: 34, retail: 44, wholesale: 39, stock: 360, min: 25 },
        { name: 'لبن المراعي خالي الدسم 1 لتر', barcode: '6221002002', category_id: catD, cost: 35, retail: 45, wholesale: 40, stock: 200, min: 20 },
        { name: 'جبنة فيتا دومتي بلس 500 جم', barcode: '6221002003', category_id: catD, cost: 30, retail: 38, wholesale: 34, stock: 290, min: 20 },
        { name: 'جبنة بيضاء إسطنبولي عبور لاند 500 جم', barcode: '6221002004', category_id: catD, cost: 32, retail: 40, wholesale: 36, stock: 250, min: 20 },
        { name: 'زبادي جهينة طبيعي 105 جم (كوب)', barcode: '6221002005', category_id: catD, cost: 6, retail: 8.5, wholesale: 7.25, stock: 180, min: 30 },
        { name: 'جبنة موزاريلا مبشورة الأطباء 500 جم', barcode: '6221002006', category_id: catD, cost: 75, retail: 98, wholesale: 86, stock: 110, min: 10 },
        { name: 'كرتونة بيض أحمر طازج 30 بيضة', barcode: '6221002007', category_id: catD, cost: 140, retail: 165, wholesale: 152, stock: 65, min: 10 },

        // Beverages
        { name: 'مياه معدنية داساني 1.5 لتر (زجاجة)', barcode: '6221003001', category_id: catB, cost: 6, retail: 9, wholesale: 7.5, stock: 480, min: 40 },
        { name: 'مياه معدنية نستله 600 مل', barcode: '6221003002', category_id: catB, cost: 4.5, retail: 7, wholesale: 5.5, stock: 520, min: 50 },
        { name: 'كوكاكولا كانز أصلية 330 مل', barcode: '6221003003', category_id: catB, cost: 11, retail: 15, wholesale: 13, stock: 340, min: 30 },
        { name: 'بيبسي كانز كولا 330 مل', barcode: '6221003004', category_id: catB, cost: 11, retail: 15, wholesale: 13, stock: 310, min: 30 },
        { name: 'سفن أب كانز ليمون 330 مل', barcode: '6221003005', category_id: catB, cost: 11, retail: 15, wholesale: 13, stock: 230, min: 20 },
        { name: 'عصير جهينة مانجو بيور 1 لتر', barcode: '6221003006', category_id: catB, cost: 26, retail: 35, wholesale: 30, stock: 180, min: 15 },
        { name: 'عصير بيتي برتقال تتراباك 200 مل', barcode: '6221003007', category_id: catB, cost: 6, retail: 8.5, wholesale: 7.2, stock: 260, min: 25 },
        { name: 'مشروب طاقة ريد بول كانز 250 مل', barcode: '6221003008', category_id: catB, cost: 45, retail: 60, wholesale: 52, stock: 130, min: 15 },

        // Cleaning
        { name: 'مسحوق غسيل أوتوماتيك أريال لافندر 2.5 كجم', barcode: '6221004001', category_id: catC, cost: 145, retail: 185, wholesale: 165, stock: 120, min: 10 },
        { name: 'مسحوق غسيل يدوي أوكسي 1 كجم', barcode: '6221004002', category_id: catC, cost: 38, retail: 48, wholesale: 43, stock: 140, min: 12 },
        { name: 'صابون سائل لغسيل الأطباق فيري ليمون 1 لتر', barcode: '6221004003', category_id: catC, cost: 46, retail: 60, wholesale: 52, stock: 160, min: 15 },
        { name: 'كلوركس أبيض مبيض ملابس 950 مل', barcode: '6221004004', category_id: catC, cost: 22, retail: 30, wholesale: 26, stock: 190, min: 15 },
        { name: 'مناديل مطبخ زينة ماكسي رول 2 طبقة', barcode: '6221004005', category_id: catC, cost: 32, retail: 42, wholesale: 37, stock: 150, min: 15 },
        { name: 'صابون وجه لوكس بالورد 120 جم', barcode: '6221004006', category_id: catC, cost: 15, retail: 20, wholesale: 17.5, stock: 220, min: 20 },
        { name: 'معجون أسنان سيجنال تو مكافح التسوس 75 مل', barcode: '6221004007', category_id: catC, cost: 25, retail: 34, wholesale: 29, stock: 130, min: 10 },

        // Snacks
        { name: 'شيبسي بطاطس مقرمشة بالجبنة المتبلة عائلي', barcode: '6221005001', category_id: catS, cost: 9, retail: 12, wholesale: 10.5, stock: 420, min: 40 },
        { name: 'دوريتوس شيبس ذرة بجبنة الناتشو 85 جم', barcode: '6221005002', category_id: catS, cost: 9.5, retail: 13, wholesale: 11, stock: 280, min: 25 },
        { name: 'بسكويت أوريو محشو كريمة فانيليا 6 قطع', barcode: '6221005003', category_id: catS, cost: 7.5, retail: 10, wholesale: 8.75, stock: 350, min: 30 },
        { name: 'مولتو ميني كرواسون شيكولاتة عائلي', barcode: '6221005004', category_id: catS, cost: 12, retail: 16, wholesale: 14, stock: 240, min: 20 },
        { name: 'شوكولاتة كادبوري ديري ميلك سادة 37 جم', barcode: '6221005005', category_id: catS, cost: 22, retail: 30, wholesale: 26, stock: 190, min: 20 },
        { name: 'ويفر توداي محشو كريمة البندق 40 جم', barcode: '6221005006', category_id: catS, cost: 5, retail: 7, wholesale: 6, stock: 310, min: 25 },

        // Frozen
        { name: 'ملوخية خضراء مجمدة بسمة 400 جم', barcode: '6221006001', category_id: catF, cost: 18, retail: 25, wholesale: 21, stock: 160, min: 15 },
        { name: 'بامية ممتازة مجمدة أمريكانا 400 جم', barcode: '6221006002', category_id: catF, cost: 22, retail: 30, wholesale: 26, stock: 130, min: 10 },
        { name: 'برجر لحم بقري حلواني 8 قطع 400 جم', barcode: '6221006003', category_id: catF, cost: 82, retail: 108, wholesale: 94, stock: 85, min: 10 },
        { name: 'ستربس دجاج مقرمش كوكي 1 كجم حار', barcode: '6221006004', category_id: catF, cost: 165, retail: 210, wholesale: 185, stock: 70, min: 8 },

        // 4 Out of Stock items (Qty = 0) -> To trigger dashboard "أصناف نفدت"
        { name: 'شوكولاتة نوتيلا برطمان أصلي 750 جم', barcode: '6221007001', category_id: catS, cost: 190, retail: 245, wholesale: 218, stock: 0, min: 10 },
        { name: 'زيت زيتون بكر ممتاز وادي فود 500 مل', barcode: '6221007002', category_id: catG, cost: 140, retail: 180, wholesale: 160, stock: 0, min: 8 },
        { name: 'لبن نيدو مجفف فورتيجرو كيس 900 جم', barcode: '6221007003', category_id: catD, cost: 230, retail: 290, wholesale: 260, stock: 0, min: 10 },
        { name: 'أقراص غسالة أطباق فيري بلاتينيوم 42 قرص', barcode: '6221007004', category_id: catC, cost: 280, retail: 360, wholesale: 320, stock: 0, min: 5 },

        // 4 Low Stock items (Qty <= 5, Min = 15) -> To trigger dashboard "نواقص الشراء"
        { name: 'فشار بالزبدة مايكرويف أمريكانا 3 أكياس', barcode: '6221008001', category_id: catS, cost: 35, retail: 48, wholesale: 42, stock: 3, min: 15 },
        { name: 'شاي أخضر أحمد تي بالنعناع 20 فتلة', barcode: '6221008002', category_id: catG, cost: 28, retail: 38, wholesale: 33, stock: 4, min: 15 },
        { name: 'صابون ديتول أصلي معقم 120 جم', barcode: '6221008003', category_id: catC, cost: 18, retail: 25, wholesale: 22, stock: 5, min: 20 },
        { name: 'كاتشب هاينز عبوة ضاغطة توب داون 440 جم', barcode: '6221008004', category_id: catG, cost: 38, retail: 50, wholesale: 44, stock: 4, min: 18 },
      ];

      const insertedProducts: { id: number; name: string; cost: number; retail: number; wholesale: number }[] = [];
      for (const p of productsData) {
        const supId = supplierIds[Math.floor(Math.random() * supplierIds.length)] || null;
        const res = await trx.insertInto('products').values({
          name: p.name,
          barcode: p.barcode,
          item_type: 'product',
          item_kind: 'standard',
          category_id: p.category_id,
          supplier_id: supId,
          cost_price: p.cost,
          retail_price: p.retail,
          wholesale_price: p.wholesale,
          stock_qty: p.stock,
          min_stock_qty: p.min,
          default_location_id: locationId,
          is_active: true,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();

        if (res) {
          const pid = Number(res.id);
          insertedProducts.push({ id: pid, name: p.name, cost: p.cost, retail: p.retail, wholesale: p.wholesale });

          // Also set location stock
          await trx.insertInto('product_location_stock').values({
            product_id: pid,
            branch_id: branchId,
            location_id: locationId,
            qty: p.stock,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          }).execute();
        }
      }

      // 8. HR Departments & Job Titles & 20 Realistic Employees
      const hrDepartments = [
        'الإدارة العامة والتنفيذية',
        'المبيعات والكاشير',
        'المخازن واللوجستيات',
        'الحسابات والمالية',
        'خدمة العملاء والتوصيل (الدليفري)',
      ];

      const deptMap = new Map<string, number>();
      for (const dName of hrDepartments) {
        const res = await trx.insertInto('hr_departments').values({
          name: dName,
          description: dName,
          is_active: true,
          created_by: actor.userId,
          updated_by: actor.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();
        if (res) deptMap.set(dName, Number(res.id));
      }

      const jobTitles = [
        'مدير الفرع العام',
        'مشرف وردية نقطة بيع',
        'كاشير رئيسي',
        'كاشير مساعد',
        'أمين مخزن رئيسي',
        'مساعد أمين مخزن / عمالة',
        'محاسب مالي عام',
        'مراجع ومراقب حسابات',
        'مشرف دليفري وخدمة عملاء',
        'طيار دليفري سريع',
      ];

      const titleMap = new Map<string, number>();
      for (const jName of jobTitles) {
        const res = await trx.insertInto('hr_job_titles').values({
          name: jName,
          description: jName,
          is_active: true,
          created_by: actor.userId,
          updated_by: actor.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();
        if (res) titleMap.set(jName, Number(res.id));
      }

      // 20 Employees
      const employeesData = [
        { empNo: 'EMP-001', first: 'محمد', last: 'فتحي المنشاوي', title: 'مدير الفرع العام', dept: 'الإدارة العامة والتنفيذية', natId: '29001010101234', salary: 18000 },
        { empNo: 'EMP-002', first: 'طارق', last: 'جمال الدين', title: 'مشرف وردية نقطة بيع', dept: 'المبيعات والكاشير', natId: '29205040101235', salary: 9000 },
        { empNo: 'EMP-003', first: 'أحمد', last: 'محمود عبد السلام', title: 'كاشير رئيسي', dept: 'المبيعات والكاشير', natId: '29508120101236', salary: 6500 },
        { empNo: 'EMP-004', first: 'محمد', last: 'إبراهيم غنيم', title: 'كاشير رئيسي', dept: 'المبيعات والكاشير', natId: '29603150101237', salary: 6500 },
        { empNo: 'EMP-005', first: 'سارة', last: 'أحمد علي', title: 'كاشير مساعد', dept: 'المبيعات والكاشير', natId: '29811200101238', salary: 5500 },
        { empNo: 'EMP-006', first: 'محمود', last: 'شاكر النجار', title: 'كاشير مساعد', dept: 'المبيعات والكاشير', natId: '29709090101239', salary: 5500 },
        { empNo: 'EMP-007', first: 'ياسر', last: 'عزت عبد ربه', title: 'أمين مخزن رئيسي', dept: 'المخازن واللوجستيات', natId: '28904010101240', salary: 8500 },
        { empNo: 'EMP-008', first: 'وليد', last: 'صلاح مراد', title: 'مساعد أمين مخزن / عمالة', dept: 'المخازن واللوجستيات', natId: '29906060101241', salary: 5000 },
        { empNo: 'EMP-009', first: 'إسلام', last: 'عادل بيومي', title: 'مساعد أمين مخزن / عمالة', dept: 'المخازن واللوجستيات', natId: '29801020101242', salary: 5000 },
        { empNo: 'EMP-010', first: 'حازم', last: 'كمال الدين', title: 'محاسب مالي عام', dept: 'الحسابات والمالية', natId: '29107100101243', salary: 11000 },
        { empNo: 'EMP-011', first: 'عمرو', last: 'مجدي الشريف', title: 'مراجع ومراقب حسابات', dept: 'الحسابات والمالية', natId: '28812150101244', salary: 12500 },
        { empNo: 'EMP-012', first: 'رانيا', last: 'مصطفى كامل', title: 'مشرف دليفري وخدمة عملاء', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29402280101245', salary: 7500 },
        { empNo: 'EMP-013', first: 'حسام', last: 'حسن إبراهيم', title: 'طيار دليفري سريع', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29609180101246', salary: 5500 },
        { empNo: 'EMP-014', first: 'طارق', last: 'علي مصطفى', title: 'طيار دليفري سريع', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29705120101247', salary: 5500 },
        { empNo: 'EMP-015', first: 'محمود', last: 'رضا الشناوي', title: 'طيار دليفري سريع', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29510250101248', salary: 5500 },
        { empNo: 'EMP-016', first: 'علي', last: 'سمير جاد', title: 'طيار دليفري سريع', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29903140101249', salary: 5500 },
        { empNo: 'EMP-017', first: 'خالد', last: 'نبيل فاروق', title: 'طيار دليفري سريع', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29807200101250', salary: 5500 },
        { empNo: 'EMP-018', first: 'أحمد', last: 'يوسف غانم', title: 'طيار دليفري سريع', dept: 'خدمة العملاء والتوصيل (الدليفري)', natId: '29712010101251', salary: 5500 },
        { empNo: 'EMP-019', first: 'مينا', last: 'فايز جرجس', title: 'كاشير مساعد', dept: 'المبيعات والكاشير', natId: '29608080101252', salary: 5500 },
        { empNo: 'EMP-020', first: 'كريم', last: 'علاء الدين', title: 'مشرف وردية نقطة بيع', dept: 'المبيعات والكاشير', natId: '29304190101253', salary: 9000 },
      ];

      for (const emp of employeesData) {
        const dId = deptMap.get(emp.dept) || 1;
        const jId = titleMap.get(emp.title) || 1;
        const hireDate = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

        const empRes = await trx.insertInto('hr_employees').values({
          employee_no: emp.empNo,
          first_name: emp.first,
          last_name: emp.last,
          display_name: `${emp.first} ${emp.last}`,
          national_id: emp.natId,
          department_id: dId,
          job_title_id: jId,
          hire_date: hireDate,
          status: 'active',
          compensation_type: 'monthly',
          pay_frequency: 'monthly',
          expected_daily_hours: 8,
          scheduled_check_in_time: '09:00',
          scheduled_check_out_time: '17:00',
          grace_minutes: 15,
          overtime_policy: 'review_only',
          attendance_policy: 'flexible',
          commission_type: 'none',
          delay_policy: 'standard',
          has_social_insurance: false,
          has_income_tax: false,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();

        if (empRes) {
          const empId = Number(empRes.id);
          await trx.insertInto('hr_employment_contracts').values({
            employee_id: empId,
            contract_no: `CNT-${emp.empNo}`,
            contract_type: 'full_time',
            base_salary: emp.salary,
            currency: 'EGP',
            status: 'active',
            start_date: hireDate,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          }).execute();

          // Add sample attendance for current week
          for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
            const attDate = new Date(Date.now() - dayOffset * 24 * 3600 * 1000).toISOString().split('T')[0];
            await trx.insertInto('hr_attendance_records').values({
              employee_id: empId,
              work_date: attDate,
              status: 'present',
              check_in_at: new Date(`${attDate}T08:55:00Z`),
              check_out_at: new Date(`${attDate}T17:05:00Z`),
              source: 'manual',
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
            }).execute();
          }
        }
      }

      // 9. Open Cashier Shift for Instant POS Experience
      const shiftRes = await trx.insertInto('cashier_shifts').values({
        branch_id: branchId,
        opened_by: actor.userId,
        expected_cash: 1500,
        counted_cash: null,
        status: 'open',
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      }).returning(['id']).executeTakeFirst();

      const openShiftId = shiftRes ? Number(shiftRes.id) : 1;

      // 10. Historical Purchases across 6 Months (~35 Invoices, Total ~280,000 EGP)
      let purchaseCounter = 1001;
      const totalPurchasesTarget = 35;
      for (let i = 0; i < totalPurchasesTarget; i++) {
        // Distribute dates across last 180 days
        const daysAgo = Math.floor(Math.random() * 175) + 1;
        const pDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
        const supId = supplierIds[i % supplierIds.length];

        // Pick 2-4 products for this bill
        const billProducts = insertedProducts.slice((i * 2) % 30, ((i * 2) % 30) + 3);
        let billSubtotal = 0;
        const itemsToInsert: { product_id: number; product_name: string; qty: number; unit_cost: number; line_total: number }[] = [];

        for (const bp of billProducts) {
          const qty = Math.floor(Math.random() * 30) + 10;
          const lineTotal = qty * bp.cost;
          billSubtotal += lineTotal;
          itemsToInsert.push({
            product_id: bp.id,
            product_name: bp.name,
            qty,
            unit_cost: bp.cost,
            line_total: lineTotal,
          });
        }

        const isPaid = i % 4 !== 0; // 75% paid, 25% credit

        const pRes = await trx.insertInto('purchases').values({
          doc_no: `PUR-${purchaseCounter++}`,
          supplier_id: supId,
          subtotal: billSubtotal,
          discount: 0,
          tax_rate: 0,
          tax_amount: 0,
          prices_include_tax: true,
          total: billSubtotal,
          note: 'فاتورة مشتريات تجريبية',
          status: 'posted',
          payment_type: isPaid ? 'cash' : 'credit',
          branch_id: branchId,
          location_id: locationId,
          created_by: actor.userId,
          created_at: pDate,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();

        if (pRes) {
          const pId = Number(pRes.id);
          for (const item of itemsToInsert) {
            await trx.insertInto('purchase_items').values({
              purchase_id: pId,
              product_id: item.product_id,
              product_name: item.product_name,
              qty: item.qty,
              unit_cost: item.unit_cost,
              line_total: item.line_total,
              unit_name: 'قطعة',
              unit_multiplier: 1,
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
            }).execute();
          }
        }
      }

      // 11. Historical Sales across 6 Months (~110 Invoices, Total ~430,000 EGP) -> Healthy ~35% Margin!
      let saleCounter = 2001;
      const totalSalesTarget = 110;
      const paymentTypes: ('cash' | 'card' | 'credit')[] = ['cash', 'cash', 'card', 'card', 'cash', 'credit'];
      const deliveryStatuses: ('delivered' | 'assigned' | 'pending')[] = ['delivered', 'delivered', 'delivered', 'assigned', 'pending'];

      for (let i = 0; i < totalSalesTarget; i++) {
        // Distribute dates: last 180 days (more sales in recent weeks!)
        const isRecent = i < 35; // recent 35 sales are in the last 14 days
        const daysAgo = isRecent ? Math.floor(Math.random() * 14) : Math.floor(Math.random() * 165) + 15;
        const sDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000 - Math.floor(Math.random() * 8) * 3600 * 1000).toISOString();

        const custId = customerIds[i % customerIds.length];
        const payType = paymentTypes[i % paymentTypes.length];
        const isDelivery = i % 3 === 0;
        const repId = isDelivery ? deliveryRepIds[i % deliveryRepIds.length] : null;
        const rawDeliveryStatus = isDelivery ? deliveryStatuses[i % deliveryStatuses.length] : null;
        const deliveryStatus: 'pending' | 'out_for_delivery' | 'delivered' | 'settled' | null = rawDeliveryStatus === 'delivered' ? 'delivered' : rawDeliveryStatus === 'assigned' ? 'out_for_delivery' : rawDeliveryStatus === 'pending' ? 'pending' : null;
        const collectionStatus: 'cod' | 'prepaid_by_rep' | 'prepaid_online' | null = isDelivery ? 'cod' : null;
        const deliveryFee = isDelivery ? 25 : 0;

        // Pick 2-5 products for this bill
        const startIdx = (i * 3) % (insertedProducts.length - 6);
        const billProducts = insertedProducts.slice(startIdx, startIdx + Math.floor(Math.random() * 3) + 2);

        let billSubtotal = 0;
        const itemsToInsert: { product_id: number; product_name: string; qty: number; cost_price: number; unit_price: number; line_total: number }[] = [];

        for (const bp of billProducts) {
          const qty = Math.floor(Math.random() * 4) + 1;
          const unitPrice = (payType === 'credit' && i % 2 === 0) ? bp.wholesale : bp.retail;
          const lineTotal = qty * unitPrice;
          billSubtotal += lineTotal;
          itemsToInsert.push({
            product_id: bp.id,
            product_name: bp.name,
            qty,
            cost_price: bp.cost,
            unit_price: unitPrice,
            line_total: lineTotal,
          });
        }

        const total = billSubtotal + deliveryFee;
        const paidAmount = payType === 'credit' ? (i % 2 === 0 ? 0 : Math.round(total * 0.5)) : total;

        const sRes = await trx.insertInto('sales').values({
          doc_no: `INV-${saleCounter++}`,
          table_number: 'صالة',
          order_type: 'retail',
          customer_id: custId,
          payment_type: payType === 'credit' ? 'credit' : 'cash',
          payment_channel: payType === 'card' ? 'card' : 'cash',
          subtotal: billSubtotal,
          discount: 0,
          tax_rate: 0,
          tax_amount: 0,
          delivery_fee: deliveryFee,
          delivery_fee_mode: 'freelance_courier',
          delivery_rep_id: repId,
          delivery_status: deliveryStatus,
          collection_status: collectionStatus,
          total: total,
          paid_amount: paidAmount,
          tendered_amount: paidAmount,
          change_amount: 0,
          store_credit_used: 0,
          prices_include_tax: true,
          status: 'posted',
          note: 'فاتورة مبيعات تجريبية',
          cancel_reason: '',
          branch_id: branchId,
          location_id: locationId,
          created_by: actor.userId,
          created_at: sDate,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning(['id']).executeTakeFirst();

        if (sRes) {
          const sId = Number(sRes.id);
          for (const item of itemsToInsert) {
            await trx.insertInto('sale_items').values({
              sale_id: sId,
              product_id: item.product_id,
              product_name: item.product_name,
              qty: item.qty,
              unit_price: item.unit_price,
              cost_price: item.cost_price,
              line_total: item.line_total,
              unit_name: 'قطعة',
              unit_multiplier: 1,
              price_type: 'retail',
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
            }).execute();
          }

          // Also insert sale payment if paid > 0
          if (paidAmount > 0) {
            await trx.insertInto('sale_payments').values({
              sale_id: sId,
              payment_channel: payType === 'card' ? 'card' : 'cash',
              amount: paidAmount,
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
            }).execute();
          }
        }
      }

      // 12. POS Held Sales Drafts (2 drafts for instant testing)
      await trx.insertInto('held_sales').values({
        table_number: 'صالة',
        order_type: 'takeaway',
        paid_amount: 0,
        cash_amount: 0,
        card_amount: 0,
        discount: 0,
        delivery_fee: 0,
        note: 'عميل الصالة - طلب عائلي معلق',
        search: '',
        price_type: 'retail',
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
        payment_type: 'cash',
        payment_channel: 'cash',
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      }).execute();

      // 13. Expense records (5 realistic records)
      const expensesData = [
        { desc: 'فاتورة استهلاك كهرباء الفرع الرئيسي', amount: 3200, days: 5 },
        { desc: 'إيجار مقر المعرض والفرع التجاري', amount: 15000, days: 28 },
        { desc: 'صيانة دورية لأجهزة التكييف ونقاط البيع', amount: 1200, days: 12 },
        { desc: 'أدوات نظافة ومطهرات ومستلزمات تعقيم', amount: 650, days: 3 },
        { desc: 'بوفيه وضيافة واستقبال عملاء', amount: 480, days: 2 },
      ];

      for (const exp of expensesData) {
        const expDate = new Date(Date.now() - exp.days * 24 * 3600 * 1000).toISOString();
        await trx.insertInto('expenses').values({
          title: exp.desc,
          amount: exp.amount,
          expense_date: expDate,
          note: 'مصروف مسجل في النظام',
          branch_id: branchId,
          location_id: locationId,
          created_by: actor.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).execute();
      }
    });

    await this.audit.log('ملء البيانات التجريبية الشاملة', `تم ملء النظام بالبيانات التجريبية الكاملة بواسطة ${actor.username}`, actor).catch(() => undefined);

    return {
      ok: true,
      message: 'تم ملء النظام ببيانات تجريبية شاملة بنجاح (أصناف، عملاء، موردين، مناديب، موظفين، وفواتير 6 أشهر)!',
    };
  }
}

