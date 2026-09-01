import { Injectable, Logger } from '@nestjs/common';
import { Kysely, Transaction, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

type DbOrTx = Kysely<Database> | Transaction<Database>;
type Scope = { tenantId: string; accountId: string };

function defaultScope(): Scope {
  return {
    tenantId: String(process.env.TENANT_ID || 'default').trim() || 'default',
    accountId: String(process.env.ACCOUNT_ID || 'default').trim() || 'default',
  };
}

type SeedAccount = {
  code: string;
  nameAr: string;
  nameEn: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra_asset' | 'contra_revenue';
  normalBalance: 'debit' | 'credit';
  sortOrder: number;
  parentCode: string | null;
  accountGroup: string;
  allowManualEntries: boolean;
  isControlAccount: boolean;
  isCashBank: boolean;
  isReceivable: boolean;
  isPayable: boolean;
  isInventory: boolean;
  isTax: boolean;
};

const DEFAULT_SEED_ACCOUNTS: SeedAccount[] = [
  { code: '1000', nameAr: 'الأصول', nameEn: 'Assets', accountType: 'asset', normalBalance: 'debit', sortOrder: 1000, parentCode: null, accountGroup: 'fixed_assets', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', accountType: 'asset', normalBalance: 'debit', sortOrder: 1100, parentCode: '1000', accountGroup: 'current_assets', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1110', nameAr: 'الخزينة', nameEn: 'Cash', accountType: 'asset', normalBalance: 'debit', sortOrder: 1110, parentCode: '1100', accountGroup: 'cash_bank', allowManualEntries: true, isControlAccount: false, isCashBank: true, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1120', nameAr: 'البنك', nameEn: 'Bank', accountType: 'asset', normalBalance: 'debit', sortOrder: 1120, parentCode: '1100', accountGroup: 'cash_bank', allowManualEntries: true, isControlAccount: false, isCashBank: true, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1130', nameAr: 'العملاء', nameEn: 'Accounts Receivable', accountType: 'asset', normalBalance: 'debit', sortOrder: 1130, parentCode: '1100', accountGroup: 'receivable', allowManualEntries: true, isControlAccount: true, isCashBank: false, isReceivable: true, isPayable: false, isInventory: false, isTax: false },
  { code: '1140', nameAr: 'المخزون', nameEn: 'Inventory', accountType: 'asset', normalBalance: 'debit', sortOrder: 1140, parentCode: '1100', accountGroup: 'inventory', allowManualEntries: true, isControlAccount: true, isCashBank: false, isReceivable: false, isPayable: false, isInventory: true, isTax: false },
  { code: '1150', nameAr: 'ضريبة مشتريات قابلة للخصم', nameEn: 'Purchase VAT Receivable', accountType: 'asset', normalBalance: 'debit', sortOrder: 1150, parentCode: '1100', accountGroup: 'tax', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: true },
  { code: '1160', nameAr: 'عهد وسلف موظفين', nameEn: 'Employee Advances', accountType: 'asset', normalBalance: 'debit', sortOrder: 1160, parentCode: '1100', accountGroup: 'current_assets', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1170', nameAr: 'مصروفات مدفوعة مقدمًا', nameEn: 'Prepaid Expenses', accountType: 'asset', normalBalance: 'debit', sortOrder: 1170, parentCode: '1100', accountGroup: 'current_assets', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1200', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', accountType: 'asset', normalBalance: 'debit', sortOrder: 1200, parentCode: '1000', accountGroup: 'fixed_assets', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1210', nameAr: 'معدات وأجهزة', nameEn: 'Equipment', accountType: 'asset', normalBalance: 'debit', sortOrder: 1210, parentCode: '1200', accountGroup: 'fixed_assets', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1220', nameAr: 'أثاث وتجهيزات', nameEn: 'Furniture and Fixtures', accountType: 'asset', normalBalance: 'debit', sortOrder: 1220, parentCode: '1200', accountGroup: 'fixed_assets', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '1290', nameAr: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', accountType: 'contra_asset', normalBalance: 'credit', sortOrder: 1290, parentCode: '1200', accountGroup: 'fixed_assets', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '2000', nameAr: 'الخصوم', nameEn: 'Liabilities', accountType: 'liability', normalBalance: 'credit', sortOrder: 2000, parentCode: null, accountGroup: 'current_liabilities', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '2100', nameAr: 'الخصوم المتداولة', nameEn: 'Current Liabilities', accountType: 'liability', normalBalance: 'credit', sortOrder: 2100, parentCode: '2000', accountGroup: 'current_liabilities', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '2110', nameAr: 'الموردون', nameEn: 'Accounts Payable', accountType: 'liability', normalBalance: 'credit', sortOrder: 2110, parentCode: '2100', accountGroup: 'payable', allowManualEntries: true, isControlAccount: true, isCashBank: false, isReceivable: false, isPayable: true, isInventory: false, isTax: false },
  { code: '2120', nameAr: 'ضريبة مبيعات مستحقة', nameEn: 'Sales VAT Payable', accountType: 'liability', normalBalance: 'credit', sortOrder: 2120, parentCode: '2100', accountGroup: 'tax', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: true },
  { code: '2130', nameAr: 'مصروفات مستحقة', nameEn: 'Accrued Expenses', accountType: 'liability', normalBalance: 'credit', sortOrder: 2130, parentCode: '2100', accountGroup: 'current_liabilities', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '2140', nameAr: 'رواتب مستحقة', nameEn: 'Payroll Payable', accountType: 'liability', normalBalance: 'credit', sortOrder: 2140, parentCode: '2100', accountGroup: 'current_liabilities', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '2150', nameAr: 'دفعات مقدمة من العملاء', nameEn: 'Customer Advances', accountType: 'liability', normalBalance: 'credit', sortOrder: 2150, parentCode: '2100', accountGroup: 'current_liabilities', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', accountType: 'equity', normalBalance: 'credit', sortOrder: 3000, parentCode: null, accountGroup: 'equity', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '3100', nameAr: 'رأس المال', nameEn: 'Capital', accountType: 'equity', normalBalance: 'credit', sortOrder: 3100, parentCode: '3000', accountGroup: 'equity', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '3200', nameAr: 'أرباح محتجزة', nameEn: 'Retained Earnings', accountType: 'equity', normalBalance: 'credit', sortOrder: 3200, parentCode: '3000', accountGroup: 'equity', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '3300', nameAr: 'مسحوبات المالك', nameEn: 'Owner Drawings', accountType: 'equity', normalBalance: 'debit', sortOrder: 3300, parentCode: '3000', accountGroup: 'equity', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '4000', nameAr: 'الإيرادات', nameEn: 'Income', accountType: 'revenue', normalBalance: 'credit', sortOrder: 4000, parentCode: null, accountGroup: 'income', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '4100', nameAr: 'مبيعات المنتجات', nameEn: 'Product Sales', accountType: 'revenue', normalBalance: 'credit', sortOrder: 4100, parentCode: '4000', accountGroup: 'income', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '4200', nameAr: 'مبيعات الخدمات', nameEn: 'Service Sales', accountType: 'revenue', normalBalance: 'credit', sortOrder: 4200, parentCode: '4000', accountGroup: 'income', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '4300', nameAr: 'خصومات المبيعات', nameEn: 'Sales Discounts', accountType: 'contra_revenue', normalBalance: 'debit', sortOrder: 4300, parentCode: '4000', accountGroup: 'income', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '4400', nameAr: 'مردودات المبيعات', nameEn: 'Sales Returns', accountType: 'contra_revenue', normalBalance: 'debit', sortOrder: 4400, parentCode: '4000', accountGroup: 'income', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '5000', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', accountType: 'expense', normalBalance: 'debit', sortOrder: 5000, parentCode: null, accountGroup: 'cogs', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '5100', nameAr: 'تكلفة بضاعة مباعة', nameEn: 'COGS', accountType: 'expense', normalBalance: 'debit', sortOrder: 5100, parentCode: '5000', accountGroup: 'cogs', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '5200', nameAr: 'فروق تكلفة مخزون', nameEn: 'Inventory Cost Variance', accountType: 'expense', normalBalance: 'debit', sortOrder: 5200, parentCode: '5000', accountGroup: 'cogs', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '5300', nameAr: 'هالك وتالف مخزون', nameEn: 'Damaged Inventory Expense', accountType: 'expense', normalBalance: 'debit', sortOrder: 5300, parentCode: '5000', accountGroup: 'cogs', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6000', nameAr: 'المصروفات التشغيلية', nameEn: 'Operating Expenses', accountType: 'expense', normalBalance: 'debit', sortOrder: 6000, parentCode: null, accountGroup: 'operating_expenses', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6100', nameAr: 'إيجار', nameEn: 'Rent Expense', accountType: 'expense', normalBalance: 'debit', sortOrder: 6100, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6200', nameAr: 'مرتبات وأجور', nameEn: 'Salaries and Wages', accountType: 'expense', normalBalance: 'debit', sortOrder: 6200, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6300', nameAr: 'كهرباء ومرافق', nameEn: 'Utilities', accountType: 'expense', normalBalance: 'debit', sortOrder: 6300, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6400', nameAr: 'مصاريف نقل وشحن', nameEn: 'Delivery and Freight Expense', accountType: 'expense', normalBalance: 'debit', sortOrder: 6400, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6500', nameAr: 'مصاريف تسويق', nameEn: 'Marketing Expense', accountType: 'expense', normalBalance: 'debit', sortOrder: 6500, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6600', nameAr: 'مصاريف صيانة', nameEn: 'Maintenance Expense', accountType: 'expense', normalBalance: 'debit', sortOrder: 6600, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6700', nameAr: 'مصاريف إدارية', nameEn: 'Administrative Expenses', accountType: 'expense', normalBalance: 'debit', sortOrder: 6700, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6800', nameAr: 'مصاريف بنكية', nameEn: 'Bank Fees', accountType: 'expense', normalBalance: 'debit', sortOrder: 6800, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '6900', nameAr: 'مصروفات أخرى', nameEn: 'Other Expenses', accountType: 'expense', normalBalance: 'debit', sortOrder: 6900, parentCode: '6000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '7000', nameAr: 'إيرادات ومصروفات أخرى', nameEn: 'Other Income and Expenses', accountType: 'revenue', normalBalance: 'credit', sortOrder: 7000, parentCode: null, accountGroup: 'income', allowManualEntries: false, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '7100', nameAr: 'إيرادات أخرى', nameEn: 'Other Income', accountType: 'revenue', normalBalance: 'credit', sortOrder: 7100, parentCode: '7000', accountGroup: 'income', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
  { code: '7200', nameAr: 'خسائر أو فروق تسوية', nameEn: 'Adjustment Losses', accountType: 'expense', normalBalance: 'debit', sortOrder: 7200, parentCode: '7000', accountGroup: 'operating_expenses', allowManualEntries: true, isControlAccount: false, isCashBank: false, isReceivable: false, isPayable: false, isInventory: false, isTax: false },
];

@Injectable()
export class AccountingTenantFoundationService {
  private readonly logger = new Logger(AccountingTenantFoundationService.name);
  private readonly initializedTenants = new Set<string>();

  private toScope(auth: AuthContext): Scope {
    const scoped = requireTenantScope(auth);
    return { tenantId: scoped.tenantId, accountId: scoped.accountId };
  }

  async ensureForAuth(queryable: DbOrTx, auth: AuthContext): Promise<void> {
    await this.ensureForScope(queryable, this.toScope(auth));
  }

  private async resolveSourceTenantId(queryable: DbOrTx): Promise<string> {
    const preferred = 'default';
    const envFallback = defaultScope().tenantId;
    const candidates = Array.from(new Set([preferred, envFallback].filter((value) => String(value || '').trim() !== '')));

    for (const candidate of candidates) {
      const countRow = await queryable
        .selectFrom('accounting_accounts')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('tenant_id', '=', candidate)
        .executeTakeFirst();
      if (Number(countRow?.count || 0) > 0) {
        return candidate;
      }
    }

    const anyTenantRow = await queryable
      .selectFrom('accounting_accounts')
      .select('tenant_id')
      .where('tenant_id', 'is not', null)
      .limit(1)
      .executeTakeFirst();
    if (anyTenantRow?.tenant_id) {
      return anyTenantRow.tenant_id;
    }

    return preferred;
  }

  async ensureForScope(queryable: DbOrTx, target: Scope): Promise<void> {
    if (this.initializedTenants.has(target.tenantId)) {
      return;
    }

    try {
      const targetAccountsCountRow = await queryable
        .selectFrom('accounting_accounts')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('tenant_id', '=', target.tenantId)
        .executeTakeFirst();
      const targetAccountsCount = Number(targetAccountsCountRow?.count || 0);

      if (targetAccountsCount === 0) {
        const sourceTenantId = await this.resolveSourceTenantId(queryable);
        const sourceAccounts = sourceTenantId !== target.tenantId
          ? await queryable
              .selectFrom('accounting_accounts')
              .selectAll()
              .where('tenant_id', '=', sourceTenantId)
              .orderBy('sort_order', 'asc')
              .orderBy('id', 'asc')
              .execute()
          : [];

        if (sourceAccounts.length > 0) {
          for (const account of sourceAccounts) {
            await queryable
              .insertInto('accounting_accounts')
              .values({
                tenant_id: target.tenantId,
                account_id: target.accountId,
                code: account.code,
                name_ar: account.name_ar,
                name_en: account.name_en,
                account_type: account.account_type,
                parent_id: null,
                account_group: account.account_group,
                normal_balance: account.normal_balance,
                is_active: account.is_active,
                is_system: account.is_system,
                allow_manual_entries: account.allow_manual_entries,
                is_control_account: account.is_control_account,
                is_cash_bank: account.is_cash_bank,
                is_receivable: account.is_receivable,
                is_payable: account.is_payable,
                is_inventory: account.is_inventory,
                is_tax: account.is_tax,
                description_ar: account.description_ar,
                sort_order: account.sort_order,
              } as any)
              .onConflict((oc) => oc.columns(['tenant_id', 'code']).doNothing())
              .execute();
          }

          await sql`
            update accounting_accounts child
            set parent_id = parent.id
            from accounting_accounts parent, accounting_accounts source_child
            left join accounting_accounts source_parent
              on source_parent.id = source_child.parent_id
             and source_parent.tenant_id = ${sourceTenantId}
            where child.tenant_id = ${target.tenantId}
              and parent.tenant_id = ${target.tenantId}
              and source_child.tenant_id = ${sourceTenantId}
              and source_child.code = child.code
              and source_parent.code = parent.code
              and child.parent_id is distinct from parent.id
          `.execute(queryable);
        } else {
          for (const account of DEFAULT_SEED_ACCOUNTS) {
            await queryable
              .insertInto('accounting_accounts')
              .values({
                tenant_id: target.tenantId,
                account_id: target.accountId,
                code: account.code,
                name_ar: account.nameAr,
                name_en: account.nameEn,
                account_type: account.accountType,
                parent_id: null,
                account_group: account.accountGroup,
                normal_balance: account.normalBalance,
                is_active: true,
                is_system: true,
                allow_manual_entries: account.allowManualEntries,
                is_control_account: account.isControlAccount,
                is_cash_bank: account.isCashBank,
                is_receivable: account.isReceivable,
                is_payable: account.isPayable,
                is_inventory: account.isInventory,
                is_tax: account.isTax,
                description_ar: '',
                sort_order: account.sortOrder,
              } as any)
              .onConflict((oc) => oc.columns(['tenant_id', 'code']).doNothing())
              .execute();
          }

          for (const account of DEFAULT_SEED_ACCOUNTS) {
            if (account.parentCode) {
              await sql`
                UPDATE accounting_accounts
                SET parent_id = (
                  SELECT id FROM accounting_accounts 
                  WHERE tenant_id = ${target.tenantId} AND code = ${account.parentCode} LIMIT 1
                )
                WHERE tenant_id = ${target.tenantId} AND code = ${account.code}
              `.execute(queryable);
            }
          }
        }
      }

      const targetSettingsRow = await queryable
        .selectFrom('accounting_settings')
        .select(['id'])
        .where('tenant_id', '=', target.tenantId)
        .where('id', '=', 1)
        .executeTakeFirst();

      if (!targetSettingsRow) {
        const targetAccounts = await queryable
          .selectFrom('accounting_accounts')
          .select(['id', 'code'])
          .where('tenant_id', '=', target.tenantId)
          .execute();
        const targetIdByCode = new Map(targetAccounts.map((row) => [String(row.code || ''), Number(row.id)]));

        await queryable
          .insertInto('accounting_settings')
          .values({
            tenant_id: target.tenantId,
            account_id: target.accountId,
            id: 1,
            cash_account_id: targetIdByCode.get('1110') || null,
            bank_account_id: targetIdByCode.get('1120') || null,
            customer_receivable_account_id: targetIdByCode.get('1130') || null,
            supplier_payable_account_id: targetIdByCode.get('2110') || null,
            inventory_account_id: targetIdByCode.get('1140') || null,
            sales_revenue_account_id: targetIdByCode.get('4100') || null,
            sales_discount_account_id: targetIdByCode.get('4300') || null,
            cogs_account_id: targetIdByCode.get('5100') || null,
            purchase_account_id: targetIdByCode.get('5100') || null,
            expenses_account_id: targetIdByCode.get('6000') || targetIdByCode.get('6700') || null,
            sales_tax_account_id: targetIdByCode.get('2120') || null,
            purchase_tax_account_id: targetIdByCode.get('1150') || null,
            manufacturing_overhead_account_id: null,
          } as any)
          .onConflict((oc) => oc.columns(['tenant_id', 'id']).doNothing())
          .execute();
      }

      this.initializedTenants.add(target.tenantId);
    } catch (err: any) {
      this.logger.error(`Error ensuring accounting foundation for tenant "${target.tenantId}": ${err.message}`, err.stack);
    }
  }
}
