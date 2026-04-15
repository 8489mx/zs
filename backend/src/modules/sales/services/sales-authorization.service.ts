import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

type DbOrTx = Kysely<Database> | Transaction<Database>;

@Injectable()
export class SalesAuthorizationService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}


  hasPermission(auth: AuthContext, permission: string): boolean {
    return auth.role === 'super_admin' || auth.permissions.includes(permission);
  }

  assertCanViewSales(auth: AuthContext): void {
    if (auth.role === 'super_admin') return;
    if (auth.permissions.includes('sales') || auth.permissions.includes('reports')) return;
    throw new ForbiddenException('Missing required permissions');
  }

  async hasOpenCashierShift(queryable: DbOrTx, auth: AuthContext): Promise<boolean> {
    const row = await queryable
      .selectFrom('cashier_shifts')
      .select('id')
      .where('opened_by', '=', auth.userId)
      .where('status', '=', 'open')
      .orderBy('id desc')
      .executeTakeFirst();
    return Boolean(row?.id);
  }
}
