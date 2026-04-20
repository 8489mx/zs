import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

type BackupTableName = Exclude<keyof Database, 'backup_snapshots'>;

interface BackupEnvelope {
  meta: {
    version: string;
    exportedAt: string;
    source: string;
  };
  tables: Partial<Record<BackupTableName, unknown[]>>;
}

const BACKUP_TABLES: BackupTableName[] = [
  '_phase1_bootstrap',
  'branches',
  'stock_locations',
  'users',
  'user_branches',
  'settings',
  'product_categories',
  'suppliers',
  'customers',
  'products',
  'product_units',
  'product_offers',
  'product_customer_prices',
  'sales',
  'sale_items',
  'sale_payments',
  'held_sales',
  'held_sale_items',
  'purchases',
  'purchase_items',
  'return_documents',
  'return_items',
  'customer_payments',
  'customer_ledger',
  'supplier_payments',
  'supplier_ledger',
  'treasury_transactions',
  'expenses',
  'cashier_shifts',
  'stock_movements',
  'stock_transfers',
  'stock_transfer_items',
  'stock_count_sessions',
  'stock_count_items',
  'damaged_stock_records',
  'sessions',
  'audit_logs',
];

const CLEAR_ORDER: (BackupTableName | 'services')[] = ['services', ...[...BACKUP_TABLES].reverse()];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRowForInsert(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('_json') && typeof value !== 'string' && value !== null && value !== undefined) {
      normalized[key] = JSON.stringify(value);
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
}

@Injectable()
export class SettingsBackupService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  assertAdmin(auth?: AuthContext | null): asserts auth is AuthContext {
    if (!auth) throw new ForbiddenException('Authentication required');
    const canManage = auth.role === 'super_admin' || auth.permissions.includes('settings') || auth.permissions.includes('canManageSettings');
    if (!canManage) throw new ForbiddenException('Missing required permissions');
  }

  private normalizeEnvelope(payload: unknown): BackupEnvelope {
    if (!isObjectRecord(payload)) {
      throw new AppError('Backup payload must be an object', 'BACKUP_INVALID', 400);
    }

    const meta = isObjectRecord(payload.meta)
      ? {
          version: String(payload.meta.version || '1.0.0'),
          exportedAt: String(payload.meta.exportedAt || payload.meta.exported_at || ''),
          source: String(payload.meta.source || 'manual'),
        }
      : { version: '1.0.0', exportedAt: '', source: 'manual' };

    const tablesRaw = isObjectRecord(payload.tables) ? payload.tables : {};
    const tables: Partial<Record<BackupTableName, unknown[]>> = {};
    for (const table of BACKUP_TABLES) {
      const rows = tablesRaw[table];
      tables[table] = Array.isArray(rows) ? rows : [];
    }

    return { meta, tables };
  }

  async exportBackup(): Promise<Record<string, unknown>> {
    const tables = {} as Partial<Record<BackupTableName, unknown[]>>;
    for (const table of BACKUP_TABLES) {
      tables[table] = await this.db.selectFrom(table).selectAll().orderBy('id asc').execute().catch(async () => {
        return await this.db.selectFrom(table).selectAll().execute();
      });
    }

    return {
      meta: {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        source: 'manual-export',
      },
      tables,
    };
  }

  async listSnapshots(): Promise<Record<string, unknown>> {
    const result = await sql<{ id: number; created_at: string; label: string; source: string; payload_json: unknown }>`
      select id, created_at, label, source, payload_json
      from backup_snapshots
      order by created_at desc, id desc
      limit 20
    `.execute(this.db);

    return {
      snapshots: result.rows.map((row) => ({
        id: String(row.id),
        createdAt: row.created_at,
        reason: row.label || row.source || '',
        payload: row.payload_json,
      })),
    };
  }

  async verifyBackup(payload: unknown): Promise<Record<string, unknown>> {
    const envelope = this.normalizeEnvelope(payload);
    const summary: Record<string, unknown> = {
      version: envelope.meta.version,
      exportedAt: envelope.meta.exportedAt || 'unknown',
      source: envelope.meta.source,
    };

    for (const table of BACKUP_TABLES) {
      summary[table] = Array.isArray(envelope.tables[table]) ? envelope.tables[table]!.length : 0;
    }

    return {
      ok: true,
      summary,
      tablesPresent: BACKUP_TABLES.filter((table) => Array.isArray(envelope.tables[table]) && (envelope.tables[table]?.length || 0) > 0).length,
    };
  }

  private async tableHasId(trx: Kysely<Database>, table: string): Promise<boolean> {
    const result = await sql<{ exists: boolean }>`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = ${table}
          and column_name = 'id'
      ) as exists
    `.execute(trx);

    return Boolean(result.rows[0]?.exists);
  }

  private async resetIdentity(trx: Kysely<Database>, table: string): Promise<void> {
    const hasId = await this.tableHasId(trx, table);
    if (!hasId) return;

    const seqResult = await sql<{ seq_name: string | null }>`
      select pg_get_serial_sequence(${table}, 'id') as seq_name
    `.execute(trx).catch(() => ({ rows: [{ seq_name: null }] } as { rows: { seq_name: string | null }[] }));

    const seqName = seqResult.rows[0]?.seq_name;
    if (!seqName) return;

    await sql`
      select setval(
        ${seqName},
        coalesce((select max(id)::bigint from ${sql.table(table)}), 0) + 1,
        false
      )
    `.execute(trx).catch(() => undefined);
  }

  async restoreBackup(payload: unknown, actor: AuthContext, dryRun = false): Promise<Record<string, unknown>> {
    const envelope = this.normalizeEnvelope(payload);
    const verification = await this.verifyBackup(payload);
    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        summary: verification.summary,
      };
    }

    await this.db.transaction().execute(async (trx) => {
      for (const table of CLEAR_ORDER) {
        await sql`delete from ${sql.table(table)}`.execute(trx);
      }

      for (const table of BACKUP_TABLES) {
        const rows = Array.isArray(envelope.tables[table]) ? envelope.tables[table]! : [];
        if (!rows.length) continue;
        for (const row of rows) {
          if (!isObjectRecord(row)) continue;
          await trx.insertInto(table).values(normalizeRowForInsert(row) as any).execute();
        }
        await this.resetIdentity(trx as unknown as Kysely<Database>, table);
      }
    });

    await sql`
      insert into backup_snapshots (label, source, payload_json)
      values (${`restore-${new Date().toISOString()}`}, ${'restore'}, ${JSON.stringify(envelope)}::jsonb)
    `.execute(this.db);

    await this.audit
      .log('استعادة نسخة احتياطية', `تمت استعادة نسخة احتياطية بواسطة ${actor.username}`, actor.userId)
      .catch(() => undefined);

    return {
      ok: true,
      restoredAt: new Date().toISOString(),
      restoredTables: BACKUP_TABLES.length,
      summary: verification.summary,
    };
  }
}
