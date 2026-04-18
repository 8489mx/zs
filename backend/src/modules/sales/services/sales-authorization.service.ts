import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql, Transaction } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { verifyPassword } from '../../../core/auth/utils/password-hasher';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AppError } from '../../../common/errors/app-error';

type DbOrTx = Kysely<Database> | Transaction<Database>;

type ManagerUserRow = {
  id?: number | string | null;
  username?: string | null;
  role?: 'super_admin' | 'admin' | 'cashier' | string | null;
  password_hash?: string | null;
  password_salt?: string | null;
};

type SettingsRow = { key?: string | null; value?: string | null };

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

  private async getManagerPin(queryable: DbOrTx): Promise<string> {
    const result = await sql<SettingsRow>`
      select key, value from settings
      where key in ('managerPin', 'managerApprovalPin', 'manager_pin')
    `.execute(queryable);

    const value = result.rows?.find((row) => String(row.key || '').length > 0)?.value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
      } catch {
        return value.trim();
      }
    }

    return '';
  }

  async authorizeDiscountOverride(
    secret: string,
    queryable: DbOrTx = this.db,
  ): Promise<{ mode: 'pin' | 'account'; authorizedByName: string; authorizedById?: number }> {
    const normalizedSecret = String(secret || '').trim();
    if (!normalizedSecret) {
      throw new AppError('أدخل رمز المدير أو كلمة المرور', 'MANAGER_AUTH_REQUIRED', 400);
    }

    const managerPin = await this.getManagerPin(queryable);
    if (managerPin && normalizedSecret === managerPin) {
      return { mode: 'pin', authorizedByName: 'اعتماد المدير' };
    }

    const managerUsers = await queryable
      .selectFrom('users')
      .select(['id', 'username', 'role', 'password_hash', 'password_salt'])
      .where('is_active', '=', true)
      .where((eb) => eb.or([eb('role', '=', 'admin'), eb('role', '=', 'super_admin')]))
      .execute() as ManagerUserRow[];

    for (const managerUser of managerUsers) {
      const passwordCheck = await verifyPassword(
        normalizedSecret,
        String(managerUser.password_hash || ''),
        String(managerUser.password_salt || ''),
      );
      if (!passwordCheck.valid) continue;
      return {
        mode: 'account',
        authorizedById: Number(managerUser.id || 0) || undefined,
        authorizedByName: String(managerUser.username || 'المدير'),
      };
    }

    throw new AppError('رمز المدير أو كلمة المرور غير صحيحة', 'MANAGER_AUTH_INVALID', 400);
  }
}
