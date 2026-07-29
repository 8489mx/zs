import { Injectable, Inject } from '@nestjs/common';
import { KYSELY_DB } from '../../../../database/database.constants';
import { Kysely } from 'kysely';
import { Database } from '../../../../database/database.types';

export interface TaxSettingsDto {
  provider: string;
  client_id?: string;
  client_secret?: string;
  tax_id?: string;
  environment?: string;
  is_active?: boolean;
}

@Injectable()
export class TaxSettingsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async getSettings(tenantId: string, provider: string = 'ETA_EGYPT') {
    const settings = await this.db
      .selectFrom('tenant_tax_settings')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('provider', '=', provider)
      .executeTakeFirst();
      
    return settings || null;
  }

  async upsertSettings(tenantId: string, accountId: string, payload: TaxSettingsDto) {
    const existing = await this.getSettings(tenantId, payload.provider);

    if (existing) {
      const updated = await this.db
        .updateTable('tenant_tax_settings')
        .set({
          client_id: payload.client_id ?? existing.client_id,
          client_secret: payload.client_secret ?? existing.client_secret,
          tax_id: payload.tax_id ?? existing.tax_id,
          environment: payload.environment ?? existing.environment,
          is_active: payload.is_active ?? existing.is_active,
          updated_at: new Date()
        })
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirstOrThrow();
      return updated;
    } else {
      const inserted = await this.db
        .insertInto('tenant_tax_settings')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          provider: payload.provider,
          client_id: payload.client_id,
          client_secret: payload.client_secret,
          tax_id: payload.tax_id,
          environment: payload.environment || 'sandbox',
          is_active: payload.is_active ?? true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return inserted;
    }
  }
}
