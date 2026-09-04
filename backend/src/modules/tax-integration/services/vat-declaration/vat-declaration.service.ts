import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../../database/kysely';
import { AuthContext } from '../../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../../database/database.constants';
import { Database } from '../../../../database/database.types';

export interface VatDeclarationQueryDto {
  from?: string;
  to?: string;
  country?: 'EG' | 'SA';
}

@Injectable()
export class VatDeclarationService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private tenantScope(auth: AuthContext) {
    return requireTenantScope(auth);
  }

  private tenantPredicate(auth: AuthContext, tableAlias?: string) {
    const scope = this.tenantScope(auth);
    return tableAlias
      ? sql<boolean>`${sql.ref(`${tableAlias}.tenant_id`)} = ${scope.tenantId}`
      : sql<boolean>`tenant_id = ${scope.tenantId}`;
  }

  private roundCurrency(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
  }

  async getDeclaration(query: VatDeclarationQueryDto, auth: AuthContext) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const fromDate = query.from ? new Date(query.from) : defaultFrom;
    const toDate = query.to ? new Date(`${query.to}T23:59:59.999Z`) : defaultTo;
    const country = query.country || 'EG';
    const standardRate = country === 'SA' ? 15 : 14;

    // 1. Sales query
    const salesStats = await this.db
      .selectFrom('sales')
      .select([
        sql<number>`COALESCE(COUNT(*), 0)`.as('invoices_count'),
        sql<number>`COALESCE(SUM(subtotal - discount), 0)`.as('net_sales'),
        sql<number>`COALESCE(SUM(tax_amount), 0)`.as('total_tax'),
        sql<number>`COALESCE(SUM(total), 0)`.as('gross_sales'),
        sql<number>`COALESCE(SUM(CASE WHEN tax_rate > 0 THEN (subtotal - discount) ELSE 0 END), 0)`.as('standard_rated_base'),
        sql<number>`COALESCE(SUM(CASE WHEN tax_rate > 0 THEN tax_amount ELSE 0 END), 0)`.as('standard_rated_tax'),
        sql<number>`COALESCE(SUM(CASE WHEN tax_rate = 0 THEN (subtotal - discount) ELSE 0 END), 0)`.as('zero_rated_base'),
      ])
      .where(this.tenantPredicate(auth))
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .where('status', '!=', 'cancelled')
      .executeTakeFirst();

    // 2. Sales returns query
    const salesReturns = await this.db
      .selectFrom('return_documents')
      .select([
        sql<number>`COALESCE(COUNT(*), 0)`.as('returns_count'),
        sql<number>`COALESCE(SUM(total), 0)`.as('total_amount'),
      ])
      .where(this.tenantPredicate(auth))
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .where('return_type', '=', 'sale')
      .executeTakeFirst();

    // 3. Purchases query
    const purchaseStats = await this.db
      .selectFrom('purchases')
      .select([
        sql<number>`COALESCE(COUNT(*), 0)`.as('bills_count'),
        sql<number>`COALESCE(SUM(subtotal - discount), 0)`.as('net_purchases'),
        sql<number>`COALESCE(SUM(tax_amount), 0)`.as('total_tax'),
        sql<number>`COALESCE(SUM(total), 0)`.as('gross_purchases'),
        sql<number>`COALESCE(SUM(CASE WHEN tax_rate > 0 THEN (subtotal - discount) ELSE 0 END), 0)`.as('standard_rated_base'),
        sql<number>`COALESCE(SUM(CASE WHEN tax_rate > 0 THEN tax_amount ELSE 0 END), 0)`.as('standard_rated_tax'),
        sql<number>`COALESCE(SUM(CASE WHEN tax_rate = 0 THEN (subtotal - discount) ELSE 0 END), 0)`.as('zero_rated_base'),
      ])
      .where(this.tenantPredicate(auth))
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .where('status', '!=', 'cancelled')
      .executeTakeFirst();

    // 4. Purchase returns query
    const purchaseReturns = await this.db
      .selectFrom('return_documents')
      .select([
        sql<number>`COALESCE(COUNT(*), 0)`.as('returns_count'),
        sql<number>`COALESCE(SUM(total), 0)`.as('total_amount'),
      ])
      .where(this.tenantPredicate(auth))
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .where('return_type', '=', 'purchase')
      .executeTakeFirst();

    // Calculate rates and adjustments
    const salesReturnsTotal = Number(salesReturns?.total_amount || 0);
    const salesReturnsBase = this.roundCurrency((salesReturnsTotal * 100) / (100 + standardRate));
    const salesReturnsTax = this.roundCurrency(salesReturnsTotal - salesReturnsBase);

    const purchaseReturnsTotal = Number(purchaseReturns?.total_amount || 0);
    const purchaseReturnsBase = this.roundCurrency((purchaseReturnsTotal * 100) / (100 + standardRate));
    const purchaseReturnsTax = this.roundCurrency(purchaseReturnsTotal - purchaseReturnsBase);

    const salesStandardBase = this.roundCurrency(Number(salesStats?.standard_rated_base || 0));
    const salesStandardTax = this.roundCurrency(Number(salesStats?.standard_rated_tax || 0));
    const salesZeroBase = this.roundCurrency(Number(salesStats?.zero_rated_base || 0));

    const purchasesStandardBase = this.roundCurrency(Number(purchaseStats?.standard_rated_base || 0));
    const purchasesStandardTax = this.roundCurrency(Number(purchaseStats?.standard_rated_tax || 0));
    const purchasesZeroBase = this.roundCurrency(Number(purchaseStats?.zero_rated_base || 0));

    const totalOutputVat = this.roundCurrency(salesStandardTax - salesReturnsTax);
    const totalInputVat = this.roundCurrency(purchasesStandardTax - purchaseReturnsTax);
    const netVatDue = this.roundCurrency(totalOutputVat - totalInputVat);

    // Tenant info
    const scope = this.tenantScope(auth);
    const tenant = await this.db
      .selectFrom('tenants')
      .select(['business_name', 'owner_name', 'owner_phone'])
      .where('id', '=', scope.tenantId)
      .executeTakeFirst();

    const taxSettings = await this.db
      .selectFrom('tenant_tax_settings')
      .select(['tax_id', 'provider'])
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    return {
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
        country,
        standard_rate_percent: standardRate,
      },
      entity: {
        business_name: tenant?.business_name || 'شركة تجارية',
        tax_id: taxSettings?.tax_id || '300000000000003',
        owner_name: tenant?.owner_name || '',
      },
      output_tax: {
        standard_rated_base: salesStandardBase,
        standard_rated_tax: salesStandardTax,
        zero_rated_base: salesZeroBase,
        exempt_base: 0,
        returns_base: salesReturnsBase,
        returns_tax: salesReturnsTax,
        invoices_count: Number(salesStats?.invoices_count || 0),
        total_sales_base: this.roundCurrency(salesStandardBase + salesZeroBase - salesReturnsBase),
        total_output_vat: Math.max(0, totalOutputVat),
      },
      input_tax: {
        standard_rated_base: purchasesStandardBase,
        standard_rated_tax: purchasesStandardTax,
        zero_rated_base: purchasesZeroBase,
        exempt_base: 0,
        returns_base: purchaseReturnsBase,
        returns_tax: purchaseReturnsTax,
        bills_count: Number(purchaseStats?.bills_count || 0),
        total_purchases_base: this.roundCurrency(purchasesStandardBase + purchasesZeroBase - purchaseReturnsBase),
        total_input_vat: Math.max(0, totalInputVat),
      },
      summary: {
        gross_output_vat: totalOutputVat,
        deductible_input_vat: totalInputVat,
        net_vat_due: netVatDue,
        status: netVatDue >= 0 ? 'payable' : 'refundable',
        currency: country === 'SA' ? 'SAR' : 'EGP',
      },
      egypt_form_10: {
        sales_general_rate_base: salesStandardBase,
        sales_general_rate_tax: salesStandardTax,
        sales_exports_base: salesZeroBase,
        sales_exempt_base: 0,
        sales_credit_notes_tax: salesReturnsTax,
        total_output_tax: Math.max(0, totalOutputVat),
        purchases_general_rate_base: purchasesStandardBase,
        purchases_general_rate_tax: purchasesStandardTax,
        purchases_debit_notes_tax: purchaseReturnsTax,
        total_input_tax: Math.max(0, totalInputVat),
        net_tax_payable: netVatDue >= 0 ? netVatDue : 0,
        net_tax_credit: netVatDue < 0 ? Math.abs(netVatDue) : 0,
      },
      zatca_return: {
        standard_rated_supplies_amount: salesStandardBase,
        standard_rated_supplies_tax: salesStandardTax,
        zero_rated_supplies_amount: salesZeroBase,
        exempt_supplies_amount: 0,
        sales_adjustments_tax: -salesReturnsTax,
        total_sales_tax: Math.max(0, totalOutputVat),
        standard_rated_purchases_amount: purchasesStandardBase,
        standard_rated_purchases_tax: purchasesStandardTax,
        imports_amount: 0,
        purchases_adjustments_tax: -purchaseReturnsTax,
        total_purchases_tax: Math.max(0, totalInputVat),
        net_vat_due: netVatDue,
      },
    };
  }
}
