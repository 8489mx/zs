import { Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from '../../../database/kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { Database } from '../../../database/database.types';

type DbOrTx = Kysely<Database> | Transaction<Database>;

@Injectable()
export class PurchasesFinanceService {
  private tenantScope(actor: AuthContext) {
    return requireTenantScope(actor);
  }

  private tenantPredicate(actor: AuthContext) {
    const scope = this.tenantScope(actor);
    return sql<boolean>`tenant_id = ${scope.tenantId}`;
  }

  private tenantFields(actor: AuthContext) {
    const scope = this.tenantScope(actor);
    return { tenant_id: scope.tenantId, account_id: scope.accountId };
  }

  async addSupplierLedgerEntry(
    queryable: DbOrTx,
    supplierId: number,
    amount: number,
    entryType: string,
    note: string,
    referenceType: string,
    referenceId: number,
    actor: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const updatedSupplier = await queryable
      .updateTable('suppliers')
      .set({ balance: sql`COALESCE(balance, 0) + ${amount}`, updated_at: sql`NOW()` })
      .where('id', '=', supplierId)
      .where(this.tenantPredicate(actor))
      .returning(['balance'])
      .executeTakeFirstOrThrow();
    const balanceAfter = Number(updatedSupplier.balance);
    await queryable
      .insertInto('supplier_ledger')
      .values({
        supplier_id: supplierId,
        entry_type: entryType,
        amount,
        balance_after: balanceAfter,
        note,
        reference_type: referenceType,
        reference_id: referenceId,
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
        ...this.tenantFields(actor),
      } as any)
      .execute();
  }

  async addCustomerLedgerEntry(
    queryable: DbOrTx,
    customerId: number,
    amount: number,
    note: string,
    referenceType: string,
    referenceId: number,
    actor: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const updatedCustomer = await queryable
      .updateTable('customers')
      .set({ balance: sql`COALESCE(balance, 0) + ${amount}`, updated_at: sql`NOW()` })
      .where('id', '=', customerId)
      .where(this.tenantPredicate(actor))
      .returning(['balance'])
      .executeTakeFirstOrThrow();
    const balanceAfter = Number(updatedCustomer.balance);
    await queryable
      .insertInto('customer_ledger')
      .values({
        customer_id: customerId,
        entry_type: 'customer_payment',
        amount,
        balance_after: balanceAfter,
        note,
        reference_type: referenceType,
        reference_id: referenceId,
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
        ...this.tenantFields(actor),
      } as any)
      .execute();
  }

  async addTreasuryTransaction(
    queryable: DbOrTx,
    txnType: string,
    amount: number,
    note: string,
    referenceType: string,
    referenceId: number,
    actor: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    await queryable
      .insertInto('treasury_transactions')
      .values({
        txn_type: txnType,
        amount,
        note,
        reference_type: referenceType,
        reference_id: referenceId,
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
        ...this.tenantFields(actor),
      } as any)
      .execute();
  }
}
