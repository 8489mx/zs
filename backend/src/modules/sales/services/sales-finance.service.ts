import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

type DbOrTx = Kysely<Database> | Transaction<Database>;

@Injectable()
export class SalesFinanceService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async createCustomerLedgerEntry(
    queryable: DbOrTx,
    customerId: number,
    amount: number,
    note: string,
    referenceId: number,
    auth: AuthContext,
  ): Promise<void> {
    const customer = await queryable
      .selectFrom('customers')
      .select(['balance'])
      .where('id', '=', customerId)
      .executeTakeFirstOrThrow();
    const nextBalance = Number(Number(customer.balance || 0) + amount).toFixed(2);
    await queryable
      .insertInto('customer_ledger')
      .values({
        customer_id: customerId,
        entry_type: amount >= 0 ? 'sale_credit' : 'sale_cancel_restore',
        amount,
        balance_after: Number(nextBalance),
        note,
        reference_type: 'sale',
        reference_id: referenceId,
        created_by: auth.userId,
      })
      .execute();
    await queryable
      .updateTable('customers')
      .set({ balance: Number(nextBalance), updated_at: sql`NOW()` })
      .where('id', '=', customerId)
      .execute();
  }

  async addTreasuryTransaction(
    queryable: DbOrTx,
    amount: number,
    note: string,
    saleId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    await queryable
      .insertInto('treasury_transactions')
      .values({
        txn_type: amount >= 0 ? 'sale' : 'sale_cancel_restore',
        amount,
        note,
        reference_type: 'sale',
        reference_id: saleId,
        created_by: auth.userId,
        branch_id: branchId,
        location_id: locationId,
      })
      .execute();
  }
}
