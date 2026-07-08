import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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

@Injectable()
export class AccountingTenantFoundationService {
  private readonly logger = new Logger(AccountingTenantFoundationService.name);

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

    throw new InternalServerErrorException(
      'Default tenant accounting chart is missing. Seed accounting_accounts for tenant "default" first.',
    );
  }

  async ensureForScope(queryable: DbOrTx, target: Scope): Promise<void> {
    const targetAccountsCountRow = await queryable
      .selectFrom('accounting_accounts')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('tenant_id', '=', target.tenantId)
      .executeTakeFirst();
    const targetAccountsCount = Number(targetAccountsCountRow?.count || 0);

    const sourceTenantId = await this.resolveSourceTenantId(queryable);
    const sourceAccountIdRow = await queryable
      .selectFrom('accounting_accounts')
      .select('account_id')
      .where('tenant_id', '=', sourceTenantId)
      .where('account_id', 'is not', null)
      .orderBy('id', 'asc')
      .executeTakeFirst();
    const source: Scope = {
      tenantId: sourceTenantId,
      accountId: String(sourceAccountIdRow?.account_id || defaultScope().accountId || 'default'),
    };

    if (targetAccountsCount === 0) {
      const sourceAccounts = await queryable
        .selectFrom('accounting_accounts')
        .selectAll()
        .where('tenant_id', '=', source.tenantId)
        .orderBy('sort_order', 'asc')
        .orderBy('id', 'asc')
        .execute();
      if (!sourceAccounts.length) {
        throw new InternalServerErrorException(
          `Default tenant chart of accounts is empty for tenant "${source.tenantId}".`,
        );
      }

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
         and source_parent.tenant_id = ${source.tenantId}
        where child.tenant_id = ${target.tenantId}
          and parent.tenant_id = ${target.tenantId}
          and source_child.tenant_id = ${source.tenantId}
          and source_child.code = child.code
          and source_parent.code = parent.code
          and child.parent_id is distinct from parent.id
      `.execute(queryable);

      const createdCountRow = await queryable
        .selectFrom('accounting_accounts')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('tenant_id', '=', target.tenantId)
        .executeTakeFirst();
      if (Number(createdCountRow?.count || 0) === 0) {
        throw new InternalServerErrorException(
          `Failed to initialize accounting accounts for tenant "${target.tenantId}".`,
        );
      }
      this.logger.log(`Initialized accounting_accounts for tenant "${target.tenantId}" from source "${source.tenantId}"`);
    }

    const targetSettingsRow = await queryable
      .selectFrom('accounting_settings')
      .select(['id'])
      .where('tenant_id', '=', target.tenantId)
      .where('id', '=', 1)
      .executeTakeFirst();

    if (!targetSettingsRow) {
      const sourceSettings = await queryable
        .selectFrom('accounting_settings')
        .selectAll()
        .where('tenant_id', '=', source.tenantId)
        .where('id', '=', 1)
        .executeTakeFirst();

      if (!sourceSettings) {
        throw new InternalServerErrorException(
          `Default accounting settings are missing for tenant "${source.tenantId}" (id=1).`,
        );
      }
      const sourceAccountIds = [
        sourceSettings.cash_account_id,
        sourceSettings.bank_account_id,
        sourceSettings.customer_receivable_account_id,
        sourceSettings.supplier_payable_account_id,
        sourceSettings.inventory_account_id,
        sourceSettings.sales_revenue_account_id,
        sourceSettings.sales_discount_account_id,
        sourceSettings.cogs_account_id,
        sourceSettings.purchase_account_id,
        sourceSettings.expenses_account_id,
        sourceSettings.sales_tax_account_id,
        sourceSettings.purchase_tax_account_id,
      ].filter((value): value is number => Number(value || 0) > 0);

      const sourceAccountsById = new Map<number, string>();
      if (sourceAccountIds.length) {
        const sourceAccounts = await queryable
          .selectFrom('accounting_accounts')
          .select(['id', 'code'])
          .where('tenant_id', '=', source.tenantId)
          .where('id', 'in', sourceAccountIds)
          .execute();
        for (const row of sourceAccounts) {
          sourceAccountsById.set(Number(row.id), String(row.code || ''));
        }
      }

      const targetAccounts = await queryable
        .selectFrom('accounting_accounts')
        .select(['id', 'code'])
        .where('tenant_id', '=', target.tenantId)
        .execute();
      const targetIdByCode = new Map(targetAccounts.map((row) => [String(row.code || ''), Number(row.id)]));

      const mapId = (sourceId: number | null): number | null => {
        if (!(Number(sourceId || 0) > 0)) return null;
        const code = sourceAccountIds.length ? sourceAccountsById.get(Number(sourceId)) : undefined;
        if (!code) return null;
        const mapped = targetIdByCode.get(code);
        return Number(mapped || 0) > 0 ? Number(mapped) : null;
      };

      await queryable
        .insertInto('accounting_settings')
        .values({
          tenant_id: target.tenantId,
          account_id: target.accountId,
          id: 1,
          cash_account_id: mapId(sourceSettings.cash_account_id),
          bank_account_id: mapId(sourceSettings.bank_account_id),
          customer_receivable_account_id: mapId(sourceSettings.customer_receivable_account_id),
          supplier_payable_account_id: mapId(sourceSettings.supplier_payable_account_id),
          inventory_account_id: mapId(sourceSettings.inventory_account_id),
          sales_revenue_account_id: mapId(sourceSettings.sales_revenue_account_id),
          sales_discount_account_id: mapId(sourceSettings.sales_discount_account_id),
          cogs_account_id: mapId(sourceSettings.cogs_account_id),
          purchase_account_id: mapId(sourceSettings.purchase_account_id),
          expenses_account_id: mapId(sourceSettings.expenses_account_id),
          sales_tax_account_id: mapId(sourceSettings.sales_tax_account_id),
          purchase_tax_account_id: mapId(sourceSettings.purchase_tax_account_id),
        } as any)
        .onConflict((oc) => oc.columns(['tenant_id', 'id']).doNothing())
        .execute();
      this.logger.log(`Initialized accounting_settings for tenant "${target.tenantId}" from source "${source.tenantId}"`);
    }
  }
}
