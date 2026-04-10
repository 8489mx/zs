import { Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { Database } from '../../../database/database.types';

type DbOrTx = Kysely<Database> | Transaction<Database>;

@Injectable()
export class PurchasesFinanceService {
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
    const supplier = await queryable.selectFrom('suppliers').select(['balance']).where('id', '=', supplierId).executeTakeFirstOrThrow();
    const balanceAfter = Number((Number(supplier.balance || 0) + amount).toFixed(2));
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
      })
      .execute();

    await queryable.updateTable('suppliers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', supplierId).execute();
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
    const customer = await queryable.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const balanceAfter = Number((Number(customer.balance || 0) + amount).toFixed(2));
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
      })
      .execute();

    await queryable.updateTable('customers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
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
      })
      .execute();
  }
}
