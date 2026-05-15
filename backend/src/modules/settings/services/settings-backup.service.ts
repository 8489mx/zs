import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
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
const RESTORE_CONFIRMATION_TEXT = 'RESTORE BACKUP';
const DEFAULT_BACKUP_FOLDER = 'D:\\ZS Backups';
const BACKUP_FOLDER_SETTING_KEY = 'backupFolderPath';
const BACKUP_AUTOMATION_SETTING_KEY = 'backupAutomation';

type BackupFrequency = 'daily' | 'weekly';

interface BackupAutomationState {
  enabled: boolean;
  frequency: BackupFrequency;
  time: string;
  weeklyDay: number;
  lastSuccessAt?: string;
  lastAttemptAt?: string;
  lastAttemptStatus?: 'success' | 'failed' | '';
  lastError?: string;
  lastScheduledFor?: string;
  lastSavedPath?: string;
}

interface BackupConfigState {
  folderPath: string;
  automation: BackupAutomationState;
}

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

  private assertCanRestoreBackup(auth?: AuthContext | null): asserts auth is AuthContext {
    if (!auth) throw new ForbiddenException('Authentication required');
    const canRestore = auth.role === 'super_admin' || auth.permissions.includes('canManageBackups');
    if (!canRestore) throw new ForbiddenException('Backup restore requires super_admin or canManageBackups permission');
  }

  private assertRestoreConfirmation(payload: unknown): void {
    const confirmation = isObjectRecord(payload) ? String(payload.confirmation || payload.restoreConfirmation || '').trim() : '';
    if (confirmation !== RESTORE_CONFIRMATION_TEXT) {
      throw new AppError(`Type ${RESTORE_CONFIRMATION_TEXT} to confirm backup restore`, 'BACKUP_RESTORE_CONFIRMATION_REQUIRED', 400);
    }
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

  private normalizeFolderPath(value: unknown): string {
    const candidate = String(value || '').trim();
    return candidate || DEFAULT_BACKUP_FOLDER;
  }

  private normalizeFrequency(value: unknown): BackupFrequency {
    return String(value || '').toLowerCase() === 'weekly' ? 'weekly' : 'daily';
  }

  private normalizeTime(value: unknown): string {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return '03:00';
    const hours = Math.min(23, Math.max(0, Number(match[1] || 0)));
    const minutes = Math.min(59, Math.max(0, Number(match[2] || 0)));
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private normalizeWeeklyDay(value: unknown): number {
    const day = Number(value);
    if (!Number.isFinite(day)) return 0;
    return Math.min(6, Math.max(0, Math.floor(day)));
  }

  private parseSettingValue<T>(rawValue: string | null | undefined, fallback: T): T {
    if (rawValue == null) return fallback;
    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return fallback;
    }
  }

  private async getSettingValue<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db
      .selectFrom('settings')
      .select(['value'])
      .where('key', '=', key)
      .executeTakeFirst();
    return this.parseSettingValue<T>(row?.value, fallback);
  }

  private async saveSettingValue(key: string, value: unknown): Promise<void> {
    await this.db
      .insertInto('settings')
      .values({ key, value: JSON.stringify(value) })
      .onConflict((oc) => oc.column('key').doUpdateSet({ value: JSON.stringify(value) }))
      .execute();
  }

  private async getBackupConfigState(): Promise<BackupConfigState> {
    const folderPath = this.normalizeFolderPath(await this.getSettingValue<string>(BACKUP_FOLDER_SETTING_KEY, DEFAULT_BACKUP_FOLDER));
    const automationRaw = await this.getSettingValue<Record<string, unknown>>(BACKUP_AUTOMATION_SETTING_KEY, {});
    const legacyAutoBackup = await this.getSettingValue<string>('autoBackup', 'on');

    return {
      folderPath,
      automation: {
        enabled: typeof automationRaw.enabled === 'boolean' ? automationRaw.enabled : legacyAutoBackup !== 'off',
        frequency: this.normalizeFrequency(automationRaw.frequency),
        time: this.normalizeTime(automationRaw.time),
        weeklyDay: this.normalizeWeeklyDay(automationRaw.weeklyDay),
        lastSuccessAt: String(automationRaw.lastSuccessAt || '').trim() || undefined,
        lastAttemptAt: String(automationRaw.lastAttemptAt || '').trim() || undefined,
        lastAttemptStatus: String(automationRaw.lastAttemptStatus || '').trim() === 'failed'
          ? 'failed'
          : String(automationRaw.lastAttemptStatus || '').trim() === 'success'
            ? 'success'
            : '',
        lastError: String(automationRaw.lastError || '').trim() || undefined,
        lastScheduledFor: String(automationRaw.lastScheduledFor || '').trim() || undefined,
        lastSavedPath: String(automationRaw.lastSavedPath || '').trim() || undefined,
      },
    };
  }

  private async saveBackupConfigState(state: BackupConfigState): Promise<void> {
    await this.saveSettingValue(BACKUP_FOLDER_SETTING_KEY, this.normalizeFolderPath(state.folderPath));
    await this.saveSettingValue(BACKUP_AUTOMATION_SETTING_KEY, {
      enabled: state.automation.enabled,
      frequency: this.normalizeFrequency(state.automation.frequency),
      time: this.normalizeTime(state.automation.time),
      weeklyDay: this.normalizeWeeklyDay(state.automation.weeklyDay),
      lastSuccessAt: state.automation.lastSuccessAt || null,
      lastAttemptAt: state.automation.lastAttemptAt || null,
      lastAttemptStatus: state.automation.lastAttemptStatus || '',
      lastError: state.automation.lastError || '',
      lastScheduledFor: state.automation.lastScheduledFor || null,
      lastSavedPath: state.automation.lastSavedPath || null,
    });
    await this.saveSettingValue('autoBackup', state.automation.enabled ? 'on' : 'off');
  }

  private getLastScheduledDate(now: Date, automation: BackupAutomationState): Date {
    const [hoursRaw, minutesRaw] = this.normalizeTime(automation.time).split(':');
    const hours = Number(hoursRaw || 3);
    const minutes = Number(minutesRaw || 0);
    const scheduled = new Date(now);
    scheduled.setSeconds(0, 0);
    scheduled.setHours(hours, minutes, 0, 0);

    if (automation.frequency === 'weekly') {
      const targetDay = this.normalizeWeeklyDay(automation.weeklyDay);
      const currentDay = scheduled.getDay();
      const delta = (currentDay - targetDay + 7) % 7;
      scheduled.setDate(scheduled.getDate() - delta);
      if (scheduled > now) {
        scheduled.setDate(scheduled.getDate() - 7);
      }
      return scheduled;
    }

    if (scheduled > now) {
      scheduled.setDate(scheduled.getDate() - 1);
    }
    return scheduled;
  }

  private buildBackupFileName(now: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `zs-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
  }

  private async ensureWritableFolder(folderPath: string): Promise<void> {
    await fs.mkdir(folderPath, { recursive: true });
    const probeFile = path.join(folderPath, `.zs-write-test-${Date.now()}.tmp`);
    await fs.writeFile(probeFile, 'ok', 'utf8');
    await fs.unlink(probeFile);
  }

  private async saveBackupToFolder(folderPath: string, source: string): Promise<{ filePath: string; fileName: string }> {
    const resolvedFolder = this.normalizeFolderPath(folderPath);
    await this.ensureWritableFolder(resolvedFolder);
    const backupPayload = await this.exportBackup();
    const now = new Date();
    const fileName = this.buildBackupFileName(now);
    const filePath = path.join(resolvedFolder, fileName);
    await fs.writeFile(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');

    await sql`
      insert into backup_snapshots (label, source, payload_json)
      values (${`file-${now.toISOString()}`}, ${source}, ${JSON.stringify(backupPayload)}::jsonb)
    `.execute(this.db).catch(() => undefined);

    return { filePath, fileName };
  }

  async runAutoBackupIfDue(actor?: AuthContext | null): Promise<Record<string, unknown>> {
    const state = await this.getBackupConfigState();
    if (!state.automation.enabled) {
      return { ok: true, ran: false, reason: 'disabled', config: state };
    }

    const now = new Date();
    const scheduledAt = this.getLastScheduledDate(now, state.automation);
    const scheduledIso = scheduledAt.toISOString();
    const lastScheduledFor = String(state.automation.lastScheduledFor || '').trim();
    if (lastScheduledFor === scheduledIso) {
      return { ok: true, ran: false, reason: 'already-attempted', config: state };
    }

    const lastSuccessAt = state.automation.lastSuccessAt ? new Date(state.automation.lastSuccessAt) : null;
    if (lastSuccessAt && lastSuccessAt.getTime() >= scheduledAt.getTime()) {
      state.automation.lastScheduledFor = scheduledIso;
      await this.saveBackupConfigState(state);
      return { ok: true, ran: false, reason: 'already-succeeded', config: state };
    }

    state.automation.lastAttemptAt = now.toISOString();
    state.automation.lastScheduledFor = scheduledIso;
    try {
      const result = await this.saveBackupToFolder(state.folderPath, 'auto-scheduled');
      state.automation.lastAttemptStatus = 'success';
      state.automation.lastSuccessAt = now.toISOString();
      state.automation.lastError = '';
      state.automation.lastSavedPath = result.filePath;
      await this.saveBackupConfigState(state);
      if (actor) {
        await this.audit.log('نسخ احتياطي تلقائي', `تم إنشاء نسخة احتياطية تلقائية في ${result.filePath}`, actor).catch(() => undefined);
      }
      return { ok: true, ran: true, success: true, filePath: result.filePath, config: state };
    } catch (error) {
      state.automation.lastAttemptStatus = 'failed';
      state.automation.lastError = error instanceof Error ? error.message : 'تعذر تنفيذ النسخ التلقائي';
      await this.saveBackupConfigState(state);
      return { ok: false, ran: true, success: false, error: state.automation.lastError, config: state };
    }
  }

  async getBackupConfig(actor?: AuthContext | null): Promise<Record<string, unknown>> {
    if (actor) this.assertAdmin(actor);
    await this.runAutoBackupIfDue(actor);
    const state = await this.getBackupConfigState();
    return {
      ok: true,
      defaultFolderPath: DEFAULT_BACKUP_FOLDER,
      folderPath: state.folderPath || DEFAULT_BACKUP_FOLDER,
      automation: state.automation,
    };
  }

  async saveBackupConfig(payload: unknown, actor: AuthContext): Promise<Record<string, unknown>> {
    this.assertAdmin(actor);
    const input = isObjectRecord(payload) ? payload : {};
    const current = await this.getBackupConfigState();
    const automationInput = isObjectRecord(input.automation) ? input.automation : {};

    current.folderPath = this.normalizeFolderPath(input.folderPath ?? current.folderPath ?? DEFAULT_BACKUP_FOLDER);
    current.automation.enabled = typeof automationInput.enabled === 'boolean'
      ? automationInput.enabled
      : typeof input.autoBackupEnabled === 'boolean'
        ? Boolean(input.autoBackupEnabled)
        : current.automation.enabled;
    current.automation.frequency = this.normalizeFrequency(automationInput.frequency ?? input.frequency ?? current.automation.frequency);
    current.automation.time = this.normalizeTime(automationInput.time ?? input.time ?? current.automation.time);
    current.automation.weeklyDay = this.normalizeWeeklyDay(automationInput.weeklyDay ?? input.weeklyDay ?? current.automation.weeklyDay);

    await this.saveBackupConfigState(current);
    await this.audit.log('تعديل إعدادات النسخ الاحتياطي', `تم تعديل إعدادات النسخ الاحتياطي بواسطة ${actor.username}`, actor).catch(() => undefined);
    return this.getBackupConfig(actor);
  }

  async testBackupFolder(payload: unknown, actor: AuthContext): Promise<Record<string, unknown>> {
    this.assertAdmin(actor);
    const input = isObjectRecord(payload) ? payload : {};
    const folderPath = this.normalizeFolderPath(input.folderPath);
    try {
      await this.ensureWritableFolder(folderPath);
      return { ok: true, success: true, folderPath, message: `تم اختبار المسار بنجاح: ${folderPath}` };
    } catch (error) {
      return {
        ok: false,
        success: false,
        folderPath,
        message: error instanceof Error ? error.message : 'تعذر الوصول إلى المجلد المحدد',
      };
    }
  }

  async saveBackupToConfiguredFolder(actor: AuthContext): Promise<Record<string, unknown>> {
    this.assertAdmin(actor);
    const state = await this.getBackupConfigState();
    const result = await this.saveBackupToFolder(state.folderPath, 'manual-save-to-folder');
    state.automation.lastAttemptAt = new Date().toISOString();
    state.automation.lastAttemptStatus = 'success';
    state.automation.lastError = '';
    state.automation.lastSuccessAt = state.automation.lastAttemptAt;
    state.automation.lastSavedPath = result.filePath;
    await this.saveBackupConfigState(state);
    await this.audit.log('نسخ احتياطي إلى مجلد', `تم حفظ نسخة احتياطية في ${result.filePath} بواسطة ${actor.username}`, actor).catch(() => undefined);
    return {
      ok: true,
      folderPath: state.folderPath,
      fileName: result.fileName,
      filePath: result.filePath,
      message: `تم حفظ النسخة في: ${result.filePath}`,
    };
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
    if (!dryRun) {
      this.assertCanRestoreBackup(actor);
      this.assertRestoreConfirmation(payload);
    }

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
