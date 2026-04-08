import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

@Injectable()
export class InventoryScopeService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async branchScope(auth: AuthContext): Promise<number[]> {
    if (auth.role === 'super_admin') return [];
    const user = await this.db
      .selectFrom('users')
      .select(['default_branch_id'])
      .where('id', '=', auth.userId)
      .executeTakeFirst();
    if (!user) return [];
    const rows = await this.db
      .selectFrom('user_branches')
      .select(['branch_id'])
      .where('user_id', '=', auth.userId)
      .execute();
    const ids = rows.map((entry) => Number(entry.branch_id)).filter((entry) => Number.isInteger(entry) && entry > 0);
    if (user.default_branch_id && !ids.includes(user.default_branch_id)) ids.push(user.default_branch_id);
    return Array.from(new Set(ids));
  }

  async assertLocationScope(locationId: number, auth: AuthContext): Promise<{ id: number; name: string; branchId: number | null }> {
    const location = await this.db
      .selectFrom('stock_locations')
      .select(['id', 'name', 'branch_id'])
      .where('id', '=', locationId)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!location) throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);

    const scope = await this.branchScope(auth);
    if (scope.length && location.branch_id && !scope.includes(location.branch_id)) {
      throw new AppError('Selected location is outside your assigned scope', 'LOCATION_SCOPE_FORBIDDEN', 400);
    }

    return {
      id: location.id,
      name: location.name || '',
      branchId: location.branch_id || null,
    };
  }

  async filterByScope<T extends { branchId?: string; fromBranchId?: string; toBranchId?: string }>(rows: T[], auth: AuthContext): Promise<T[]> {
    const scope = await this.branchScope(auth);
    if (!scope.length) return rows;

    return rows.filter((row) => {
      const ids = [Number(row.branchId || 0), Number(row.fromBranchId || 0), Number(row.toBranchId || 0)].filter((id) => id > 0);
      if (!ids.length) return true;
      return ids.some((id) => scope.includes(id));
    });
  }

  async listLocations(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = await this.branchScope(auth);

    let query = this.db
      .selectFrom('stock_locations as l')
      .leftJoin('branches as b', 'b.id', 'l.branch_id')
      .select(['l.id', 'l.name', 'l.code', 'l.branch_id', 'b.name as branch_name'])
      .where('l.is_active', '=', true)
      .orderBy('l.id asc');

    if (scope.length) query = query.where('l.branch_id', 'in', scope);

    const rows = await query.execute();
    return {
      locations: rows.map((row) => ({
        id: String(row.id),
        name: row.name || '',
        code: row.code || '',
        branchId: row.branch_id ? String(row.branch_id) : '',
        branchName: row.branch_name || '',
      })),
    };
  }
}
