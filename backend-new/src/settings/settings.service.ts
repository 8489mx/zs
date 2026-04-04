import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { AuthContext } from '../auth/interfaces/auth-context.interface';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  async getSettings(): Promise<Record<string, unknown>> {
    const rows = await this.db.selectFrom('settings').selectAll().execute();
    return rows.reduce<Record<string, unknown>>((acc, row) => {
      try {
        acc[row.key] = JSON.parse(row.value);
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});
  }

  async listBranches(): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('branches')
      .select(['id', 'name', 'code'])
      .where('is_active', '=', true)
      .orderBy('id asc')
      .execute();

    return {
      branches: rows.map((row) => ({
        id: String(row.id),
        name: row.name || '',
        code: row.code || '',
      })),
    };
  }

  async saveSettings(payload: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AppError('Settings payload must be an object', 'SETTINGS_INVALID', 400);
    }

    for (const [key, value] of Object.entries(payload)) {
      await this.db
        .insertInto('settings')
        .values({ key, value: JSON.stringify(value) })
        .onConflict((oc) => oc.column('key').doUpdateSet({ value: JSON.stringify(value) }))
        .execute();
    }

    await this.audit.log('تعديل الإعدادات', `تم تعديل الإعدادات بواسطة ${actor.username}`, actor.userId);
    return this.getSettings();
  }
}
