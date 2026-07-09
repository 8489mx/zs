import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

type BackupTableName = Exclude<keyof Database, 'backup_snapshots'>;

interface BackupEnvelope { meta: { version: string; exportedAt: string; source: string; tenantId?: string; accountId?: string }; tables: Partial<Record<BackupTableName, unknown[]>> }
interface BackupAutomationState { enabled: boolean; frequency: 'daily' | 'weekly'; time: string; weeklyDay: number; lastSuccessAt?: string; lastAttemptAt?: string; lastAttemptStatus?: 'success' | 'failed' | ''; lastError?: string; lastScheduledFor?: string; lastSavedPath?: string }
interface BackupConfigState { folderPath: string; automation: BackupAutomationState }

const BACKUP_TABLES: BackupTableName[] = [
  '_phase1_bootstrap', 'sessions', 'users', 'tenants', 'trial_signups', 'settings',
  'accounting_accounts', 'journal_entries', 'journal_entry_lines', 'accounting_settings',
  'audit_logs', 'branches', 'stock_locations', 'user_branches', 'product_categories',
  'suppliers', 'customers', 'products', 'product_units', 'product_offers',
  'product_customer_prices', 'product_pricing_profiles', 'pricing_rules',
  'product_location_stock', 'stock_movements', 'stock_transfers', 'stock_transfer_items',
  'stock_count_sessions', 'stock_count_items', 'damaged_stock_records',
  'sales', 'sale_items', 'sale_payments', 'held_sales', 'held_sale_items',
  'customer_payments', 'customer_ledger', 'expenses', 'return_documents', 'return_items',
  'treasury_transactions', 'cashier_shifts', 'purchases', 'purchase_items',
  'supplier_payments', 'supplier_payment_schedules', 'supplier_payment_schedule_logs',
  'supplier_ledger', 'hr_departments', 'hr_job_titles', 'hr_positions', 'hr_employees',
  'hr_employee_contacts', 'hr_employee_documents', 'hr_employment_contracts',
  'hr_compensation_packages', 'hr_employee_loans', 'hr_employee_loan_installments',
  'hr_employee_ledger', 'hr_attendance_records', 'hr_attendance_exceptions',
  'hr_leave_types', 'hr_leave_requests', 'hr_employee_assets', 'hr_payroll_runs',
  'hr_payroll_run_items', 'hr_payroll_item_adjustments', 'hr_hr_settings',
  'price_change_runs', 'price_change_items', 'partner_contacts', 'partner_addresses',
  'cost_centers', 'projects', 'manufacturing_boms', 'manufacturing_bom_lines',
  'manufacturing_work_orders', 'manufacturing_wo_consumptions', 'purchase_attachments'
];
const CLEAR_ORDER: (BackupTableName | 'services')[] = ['services', ...[...BACKUP_TABLES].reverse()];
const RESTORE_CONFIRMATION_TEXT = 'RESTORE BACKUP';
const DEFAULT_BACKUP_FOLDER = 'D:\\ZS Backups';
const BACKUP_FOLDER_SETTING_KEY = 'backupFolderPath';
const BACKUP_AUTOMATION_SETTING_KEY = 'backupAutomation';

function isObjectRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function normalizeRowForInsert(row: Record<string, unknown>, scope: { tenantId: string; accountId: string }, tableName?: string): Record<string, unknown> { const normalized: Record<string, unknown> = {}; for (const [key, value] of Object.entries(row)) normalized[key] = key.endsWith('_json') && typeof value !== 'string' && value != null ? JSON.stringify(value) : value; normalized.tenant_id = scope.tenantId; if (tableName !== 'journal_entry_lines') normalized.account_id = scope.accountId; return normalized; }
const sortSelfReferencing = (rows: any[], parentCol: string) => { const sorted = []; const inserted = new Set(); const pending = [...rows]; let iterations = 0; while (pending.length > 0 && iterations < 1000) { for (let i = pending.length - 1; i >= 0; i--) { const row = pending[i]; if (row[parentCol] == null || inserted.has(String(row[parentCol]))) { sorted.push(row); if (row.id != null) inserted.add(String(row.id)); pending.splice(i, 1); } } iterations++; } sorted.push(...pending); return sorted; };

@Injectable()
export class SettingsBackupService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>, private readonly audit: AuditService) {}

  assertAdmin(auth?: AuthContext | null): asserts auth is AuthContext { if (!auth) throw new ForbiddenException('Authentication required'); const canManage = auth.role === 'super_admin' || auth.permissions.includes('settings') || auth.permissions.includes('canManageSettings'); if (!canManage) throw new ForbiddenException('Missing required permissions'); requireTenantScope(auth); }
  private assertCanRestoreBackup(auth?: AuthContext | null): asserts auth is AuthContext { if (!auth) throw new ForbiddenException('Authentication required'); const canRestore = auth.role === 'super_admin' || auth.permissions.includes('canManageBackups'); if (!canRestore) throw new ForbiddenException('Backup restore requires super_admin or canManageBackups permission'); requireTenantScope(auth); }
  private scope(auth: AuthContext) { return requireTenantScope(auth); }
  private assertRestoreConfirmation(payload: unknown): void { const confirmation = isObjectRecord(payload) ? String(payload.confirmation || payload.restoreConfirmation || '').trim() : ''; if (confirmation !== RESTORE_CONFIRMATION_TEXT) throw new AppError(`Type ${RESTORE_CONFIRMATION_TEXT} to confirm backup restore`, 'BACKUP_RESTORE_CONFIRMATION_REQUIRED', 400); }
  private normalizeEnvelope(payload: unknown): BackupEnvelope { if (!isObjectRecord(payload)) throw new AppError('Backup payload must be an object', 'BACKUP_INVALID', 400); const meta = isObjectRecord(payload.meta) ? { version: String(payload.meta.version || '1.0.0'), exportedAt: String(payload.meta.exportedAt || payload.meta.exported_at || ''), source: String(payload.meta.source || 'manual'), tenantId: String(payload.meta.tenantId || ''), accountId: String(payload.meta.accountId || '') } : { version: '1.0.0', exportedAt: '', source: 'manual' }; const tablesRaw = isObjectRecord(payload.tables) ? payload.tables : {}; const tables: Partial<Record<BackupTableName, unknown[]>> = {}; for (const table of BACKUP_TABLES) tables[table] = Array.isArray(tablesRaw[table]) ? tablesRaw[table] as unknown[] : []; return { meta, tables }; }
  private normalizeFolderPath(value: unknown): string { const candidate = String(value || '').trim(); return candidate || DEFAULT_BACKUP_FOLDER; }
  private normalizeFrequency(value: unknown): 'daily' | 'weekly' { return String(value || '').toLowerCase() === 'weekly' ? 'weekly' : 'daily'; }
  private normalizeTime(value: unknown): string { const raw = String(value || '').trim(); const match = raw.match(/^(\d{1,2}):(\d{2})$/); if (!match) return '03:00'; const hours = Math.min(23, Math.max(0, Number(match[1] || 0))); const minutes = Math.min(59, Math.max(0, Number(match[2] || 0))); return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`; }
  private normalizeWeeklyDay(value: unknown): number { const day = Number(value); return Number.isFinite(day) ? Math.min(6, Math.max(0, Math.floor(day))) : 0; }
  private parseSettingValue<T>(rawValue: string | null | undefined, fallback: T): T { if (rawValue == null) return fallback; try { return JSON.parse(rawValue) as T; } catch { return fallback; } }
  private assertDesktopMode(): void { /* if (process.env.APP_MODE !== 'SELF_CONTAINED' && process.env.PORTABLE_MODE !== 'true') throw new AppError('Local backup features are only available in the desktop version', 'FEATURE_NOT_AVAILABLE', 400); */ }

  private async tableExists(table: string): Promise<boolean> { const result = await sql<{ exists: boolean }>`select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = ${table}) as exists`.execute(this.db); return Boolean(result.rows[0]?.exists); }
  private async tableHasColumn(table: string, column: string): Promise<boolean> { const result = await sql<{ exists: boolean }>`select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = ${table} and column_name = ${column}) as exists`.execute(this.db); return Boolean(result.rows[0]?.exists); }
  private async getSettingValue<T>(key: string, fallback: T, actor: AuthContext): Promise<T> { const scope = this.scope(actor); const row = await this.db.selectFrom('settings').select(['value']).where('key', '=', key).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst(); return this.parseSettingValue<T>(row?.value, fallback); }
  private async saveSettingValue(key: string, value: unknown, actor: AuthContext): Promise<void> { const scope = this.scope(actor); await sql`insert into settings (key, value, tenant_id, account_id) values (${key}, ${JSON.stringify(value)}, ${scope.tenantId}, ${scope.accountId}) on conflict (tenant_id, key) do update set value = excluded.value, account_id = excluded.account_id`.execute(this.db); }
  private async getBackupConfigState(actor: AuthContext): Promise<BackupConfigState> { const folderPath = this.normalizeFolderPath(await this.getSettingValue<string>(BACKUP_FOLDER_SETTING_KEY, DEFAULT_BACKUP_FOLDER, actor)); const automationRaw = await this.getSettingValue<Record<string, unknown>>(BACKUP_AUTOMATION_SETTING_KEY, {}, actor); const legacyAutoBackup = await this.getSettingValue<string>('autoBackup', 'on', actor); return { folderPath, automation: { enabled: typeof automationRaw.enabled === 'boolean' ? automationRaw.enabled : legacyAutoBackup !== 'off', frequency: this.normalizeFrequency(automationRaw.frequency), time: this.normalizeTime(automationRaw.time), weeklyDay: this.normalizeWeeklyDay(automationRaw.weeklyDay), lastSuccessAt: String(automationRaw.lastSuccessAt || '').trim() || undefined, lastAttemptAt: String(automationRaw.lastAttemptAt || '').trim() || undefined, lastAttemptStatus: String(automationRaw.lastAttemptStatus || '').trim() === 'failed' ? 'failed' : String(automationRaw.lastAttemptStatus || '').trim() === 'success' ? 'success' : '', lastError: String(automationRaw.lastError || '').trim() || undefined, lastScheduledFor: String(automationRaw.lastScheduledFor || '').trim() || undefined, lastSavedPath: String(automationRaw.lastSavedPath || '').trim() || undefined } }; }
  private async saveBackupConfigState(state: BackupConfigState, actor: AuthContext): Promise<void> { await this.saveSettingValue(BACKUP_FOLDER_SETTING_KEY, this.normalizeFolderPath(state.folderPath), actor); await this.saveSettingValue(BACKUP_AUTOMATION_SETTING_KEY, { enabled: state.automation.enabled, frequency: this.normalizeFrequency(state.automation.frequency), time: this.normalizeTime(state.automation.time), weeklyDay: this.normalizeWeeklyDay(state.automation.weeklyDay), lastSuccessAt: state.automation.lastSuccessAt || null, lastAttemptAt: state.automation.lastAttemptAt || null, lastAttemptStatus: state.automation.lastAttemptStatus || '', lastError: state.automation.lastError || '', lastScheduledFor: state.automation.lastScheduledFor || null, lastSavedPath: state.automation.lastSavedPath || null }, actor); await this.saveSettingValue('autoBackup', state.automation.enabled ? 'on' : 'off', actor); }
  private getLastScheduledDate(now: Date, automation: BackupAutomationState): Date { const [hoursRaw, minutesRaw] = this.normalizeTime(automation.time).split(':'); const scheduled = new Date(now); scheduled.setSeconds(0, 0); scheduled.setHours(Number(hoursRaw || 3), Number(minutesRaw || 0), 0, 0); if (automation.frequency === 'weekly') { const delta = (scheduled.getDay() - this.normalizeWeeklyDay(automation.weeklyDay) + 7) % 7; scheduled.setDate(scheduled.getDate() - delta); if (scheduled > now) scheduled.setDate(scheduled.getDate() - 7); return scheduled; } if (scheduled > now) scheduled.setDate(scheduled.getDate() - 1); return scheduled; }
  private async buildBackupFileName(actor: AuthContext, now: Date): Promise<string> {
    const pad = (value: number) => String(value).padStart(2, '0');
    const scope = this.scope(actor);
    const storeSetting = await this.db.selectFrom('settings')
      .select('value')
      .where('key', '=', 'storeName')
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
      
    const storeNameStr = (storeSetting?.value as string) || scope.tenantId || 'store';
    const userNameStr = actor.username || 'user';
    
    const storeSlug = storeNameStr.replace(/[^\w\s\u0600-\u06FF-]/g, '').trim().replace(/\s+/g, '-');
    const userSlug = userNameStr.replace(/[^\w\s\u0600-\u06FF-]/g, '').trim().replace(/\s+/g, '-');

    return `ZERP-${storeSlug}-${userSlug}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.json`;
  }
  private async ensureWritableFolder(folderPath: string): Promise<void> { await fs.mkdir(folderPath, { recursive: true }); const probeFile = path.join(folderPath, `.zs-write-test-${Date.now()}.tmp`); await fs.writeFile(probeFile, 'ok', 'utf8'); await fs.unlink(probeFile); }
  private async saveBackupToFolder(folderPath: string, source: string, actor: AuthContext): Promise<{ filePath: string; fileName: string }> { const resolvedFolder = this.normalizeFolderPath(folderPath); await this.ensureWritableFolder(resolvedFolder); const backupPayload = await this.exportBackup(actor); const now = new Date(); const fileName = await this.buildBackupFileName(actor, now); const filePath = path.join(resolvedFolder, fileName); const scope = this.scope(actor); await fs.writeFile(filePath, JSON.stringify(backupPayload, null, 2), 'utf8'); await sql`insert into backup_snapshots (label, source, payload_json, tenant_id, account_id) values (${`file-${now.toISOString()}`}, ${source}, ${JSON.stringify(backupPayload)}::jsonb, ${scope.tenantId}, ${scope.accountId})`.execute(this.db).catch(() => undefined); return { filePath, fileName }; }

  async runAutoBackupIfDue(actor?: AuthContext | null): Promise<Record<string, unknown>> { if (!actor) return { ok: true, ran: false, reason: 'no-actor' }; this.assertAdmin(actor); try { this.assertDesktopMode(); } catch { return { ok: true, ran: false, reason: 'disabled' }; } const state = await this.getBackupConfigState(actor); if (!state.automation.enabled) return { ok: true, ran: false, reason: 'disabled', config: state }; const now = new Date(); const scheduledAt = this.getLastScheduledDate(now, state.automation); const scheduledIso = scheduledAt.toISOString(); if (String(state.automation.lastScheduledFor || '').trim() === scheduledIso) return { ok: true, ran: false, reason: 'already-attempted', config: state }; const lastSuccessAt = state.automation.lastSuccessAt ? new Date(state.automation.lastSuccessAt) : null; if (lastSuccessAt && lastSuccessAt.getTime() >= scheduledAt.getTime()) { state.automation.lastScheduledFor = scheduledIso; await this.saveBackupConfigState(state, actor); return { ok: true, ran: false, reason: 'already-succeeded', config: state }; } state.automation.lastAttemptAt = now.toISOString(); state.automation.lastScheduledFor = scheduledIso; try { const result = await this.saveBackupToFolder(state.folderPath, 'auto-scheduled', actor); state.automation.lastAttemptStatus = 'success'; state.automation.lastSuccessAt = now.toISOString(); state.automation.lastError = ''; state.automation.lastSavedPath = result.filePath; await this.saveBackupConfigState(state, actor); await this.audit.log('نسخ احتياطي تلقائي', `تم إنشاء نسخة احتياطية تلقائية في ${result.filePath}`, actor).catch(() => undefined); return { ok: true, ran: true, success: true, filePath: result.filePath, config: state }; } catch (error) { state.automation.lastAttemptStatus = 'failed'; state.automation.lastError = error instanceof Error ? error.message : 'تعذر تنفيذ النسخ التلقائي'; await this.saveBackupConfigState(state, actor); return { ok: false, ran: true, success: false, error: state.automation.lastError, config: state }; } }
  async getBackupConfig(actor: AuthContext): Promise<Record<string, unknown>> { this.assertAdmin(actor); await this.runAutoBackupIfDue(actor); const state = await this.getBackupConfigState(actor); return { ok: true, defaultFolderPath: DEFAULT_BACKUP_FOLDER, folderPath: state.folderPath || DEFAULT_BACKUP_FOLDER, automation: state.automation, scope: this.scope(actor) }; }
  async saveBackupConfig(payload: unknown, actor: AuthContext): Promise<Record<string, unknown>> { this.assertAdmin(actor); this.assertDesktopMode(); const input = isObjectRecord(payload) ? payload : {}; const current = await this.getBackupConfigState(actor); const automationInput = isObjectRecord(input.automation) ? input.automation : {}; current.folderPath = this.normalizeFolderPath(input.folderPath ?? current.folderPath ?? DEFAULT_BACKUP_FOLDER); current.automation.enabled = typeof automationInput.enabled === 'boolean' ? automationInput.enabled : typeof input.autoBackupEnabled === 'boolean' ? Boolean(input.autoBackupEnabled) : current.automation.enabled; current.automation.frequency = this.normalizeFrequency(automationInput.frequency ?? input.frequency ?? current.automation.frequency); current.automation.time = this.normalizeTime(automationInput.time ?? input.time ?? current.automation.time); current.automation.weeklyDay = this.normalizeWeeklyDay(automationInput.weeklyDay ?? input.weeklyDay ?? current.automation.weeklyDay); await this.saveBackupConfigState(current, actor); await this.audit.log('تعديل إعدادات النسخ الاحتياطي', `تم تعديل إعدادات النسخ الاحتياطي بواسطة ${actor.username}`, actor).catch(() => undefined); return { ok: true, config: current, message: 'تم حفظ إعدادات النسخ الاحتياطي' }; }
  async testBackupFolder(payload: unknown, actor: AuthContext): Promise<Record<string, unknown>> { this.assertAdmin(actor); this.assertDesktopMode(); const input = isObjectRecord(payload) ? payload : {}; const folderPath = this.normalizeFolderPath(input.folderPath); try { await this.ensureWritableFolder(folderPath); return { ok: true, success: true, folderPath, message: `تم اختبار المسار بنجاح: ${folderPath}` }; } catch (error) { return { ok: false, success: false, folderPath, message: error instanceof Error ? error.message : 'تعذر الوصول إلى المجلد المحدد' }; } }
  async saveBackupToConfiguredFolder(actor: AuthContext): Promise<Record<string, unknown>> { this.assertAdmin(actor); this.assertDesktopMode(); const state = await this.getBackupConfigState(actor); const result = await this.saveBackupToFolder(state.folderPath, 'manual-save-to-folder', actor); state.automation.lastAttemptAt = new Date().toISOString(); state.automation.lastAttemptStatus = 'success'; state.automation.lastError = ''; state.automation.lastSuccessAt = state.automation.lastAttemptAt; state.automation.lastSavedPath = result.filePath; await this.saveBackupConfigState(state, actor); await this.audit.log('نسخ احتياطي إلى مجلد', `تم حفظ نسخة احتياطية في ${result.filePath} بواسطة ${actor.username}`, actor).catch(() => undefined); return { ok: true, folderPath: state.folderPath, fileName: result.fileName, filePath: result.filePath, message: `تم حفظ النسخة في: ${result.filePath}` }; }

  async exportBackup(actor: AuthContext): Promise<Record<string, unknown>> { this.assertAdmin(actor); const scope = this.scope(actor); const tables = {} as Partial<Record<BackupTableName, unknown[]>>; for (const table of BACKUP_TABLES) { const tableName = String(table); const exists = await this.tableExists(tableName); if (!exists) { tables[table] = []; continue; } const hasTenant = await this.tableHasColumn(tableName, 'tenant_id'); if (!hasTenant) { tables[table] = []; continue; } const baseQuery = (this.db).selectFrom(table).selectAll().where(sql<boolean>`tenant_id = ${scope.tenantId}`); const hasId = await this.tableHasColumn(tableName, 'id'); const hasCreatedAt = !hasId && await this.tableHasColumn(tableName, 'created_at'); if (hasId) { tables[table] = await baseQuery.orderBy('id', 'asc').execute(); } else if (hasCreatedAt) { tables[table] = await baseQuery.orderBy('created_at', 'asc').execute(); } else { tables[table] = await baseQuery.execute(); } } return { meta: { version: '1.2.0', exportedAt: new Date().toISOString(), source: 'manual-export', tenantId: scope.tenantId, accountId: scope.accountId }, tables }; }
  async listSnapshots(actor: AuthContext): Promise<Record<string, unknown>> { this.assertAdmin(actor); const scope = this.scope(actor); const result = await sql<{ id: number; created_at: string; label: string; source: string; payload_json: unknown }>`select id, created_at, label, source, payload_json from backup_snapshots where tenant_id = ${scope.tenantId} order by created_at desc, id desc limit 20`.execute(this.db); return { snapshots: result.rows.map((row) => ({ id: String(row.id), createdAt: row.created_at, reason: row.label || row.source || '', payload: row.payload_json })), scope }; }
  async verifyBackup(payload: unknown): Promise<Record<string, unknown>> { const envelope = this.normalizeEnvelope(payload); const summary: Record<string, unknown> = { version: envelope.meta.version, exportedAt: envelope.meta.exportedAt || 'unknown', source: envelope.meta.source, tenantId: envelope.meta.tenantId || '' }; for (const table of BACKUP_TABLES) summary[table] = Array.isArray(envelope.tables[table]) ? envelope.tables[table]!.length : 0; return { ok: true, summary, tablesPresent: BACKUP_TABLES.filter((table) => Array.isArray(envelope.tables[table]) && (envelope.tables[table]?.length || 0) > 0).length }; }
  private async tableHasId(trx: Kysely<Database>, table: string): Promise<boolean> { const result = await sql<{ exists: boolean }>`select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = ${table} and column_name = 'id') as exists`.execute(trx); return Boolean(result.rows[0]?.exists); }
  private async resetIdentity(trx: Kysely<Database>, table: string): Promise<void> { const hasId = await this.tableHasId(trx, table); if (!hasId) return; const seqResult = await sql<{ seq_name: string | null }>`select pg_get_serial_sequence(${table}, 'id') as seq_name`.execute(trx).catch(() => ({ rows: [{ seq_name: null }] } as { rows: { seq_name: string | null }[] })); const seqName = seqResult.rows[0]?.seq_name; if (!seqName) return; await sql`select setval(${seqName}, coalesce((select max(id)::bigint from ${sql.table(table)}), 0) + 1, false)`.execute(trx).catch(() => undefined); }
  private async getTableColumns(trx: Kysely<Database>, table: string): Promise<Map<string, { data_type: string, column_default: string | null, identity_generation: string | null }>> { const result = await sql<{ column_name: string, data_type: string, column_default: string | null, identity_generation: string | null }>`select column_name, data_type, column_default, identity_generation from information_schema.columns where table_schema = 'public' and table_name = ${table}`.execute(trx); return new Map(result.rows.map(r => [r.column_name, r])); }
  private async getAlwaysIdentityColumns(trx: Kysely<Database>, table: string): Promise<Set<string>> { const result = await sql<{ column_name: string }>`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${table} and identity_generation = 'ALWAYS'`.execute(trx).catch(() => ({ rows: [] })); return new Set(result.rows.map(r => r.column_name)); }

  async restoreBackup(payload: unknown, actor: AuthContext, dryRun = false): Promise<Record<string, unknown>> { if (!dryRun) { this.assertCanRestoreBackup(actor); this.assertRestoreConfirmation(payload); } else { this.assertAdmin(actor); } const scope = this.scope(actor); const envelope = this.normalizeEnvelope(payload); const verification = await this.verifyBackup(payload); if (dryRun) return { ok: true, dryRun: true, summary: verification.summary, scope }; 
    try {
      let sourceTenantId: string | null = null;
      for (const t of BACKUP_TABLES) {
        if (envelope.tables[t]?.length) {
          sourceTenantId = String((envelope.tables[t] as any[])[0].tenant_id || '');
          if (sourceTenantId) break;
        }
      }
      const isCrossTenant = sourceTenantId ? sourceTenantId !== scope.tenantId : false;
      const idMap = new Map<string, Map<string, string>>();

      await this.db.transaction().execute(async (trx) => { await sql`SET LOCAL session_replication_role = 'replica'`.execute(trx); for (const table of CLEAR_ORDER) { if (!(await this.tableExists(String(table))) || !(await this.tableHasColumn(String(table), 'tenant_id'))) continue; await sql`delete from ${sql.table(table)} where tenant_id = ${scope.tenantId}`.execute(trx); } for (const table of BACKUP_TABLES) { if (!(await this.tableExists(String(table)))) continue; const colMeta = await this.getTableColumns(trx as unknown as Kysely<Database>, String(table)); const hasTenant = colMeta.has('tenant_id'); if (!hasTenant) continue; const alwaysIdentityCols = await this.getAlwaysIdentityColumns(trx as unknown as Kysely<Database>, String(table)); const hasAlwaysIdentity = alwaysIdentityCols.size > 0; let rows = Array.isArray(envelope.tables[table]) ? envelope.tables[table]! : []; if (!rows.length) continue; if (colMeta.has('parent_id') && colMeta.has('id')) { rows = sortSelfReferencing(rows, 'parent_id'); } const fksResult = await sql<{ column_name: string, foreign_table_name: string }>`SELECT kcu.column_name, ccu.table_name AS foreign_table_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${String(table)}`.execute(trx); const fkMap = fksResult.rows; if (!idMap.has(String(table))) idMap.set(String(table), new Map()); const tableIdMap = idMap.get(String(table))!; const idMeta = colMeta.get('id'); const isIdAutoGenerated = idMeta && (idMeta.column_default !== null || idMeta.identity_generation !== null); const isCrossTenantRemappingNeeded = isCrossTenant && isIdAutoGenerated; 
        
        if (isCrossTenantRemappingNeeded) {
          for (const row of rows) { if (!isObjectRecord(row)) continue; for (const fk of fkMap) { if (fk.column_name === 'tenant_id' || fk.column_name === 'account_id') continue; const oldFkVal = row[fk.column_name]; if (oldFkVal != null && idMap.has(fk.foreign_table_name)) { const newFkVal = idMap.get(fk.foreign_table_name)!.get(String(oldFkVal)); if (newFkVal !== undefined) row[fk.column_name] = newFkVal; } } const normalized = normalizeRowForInsert(row, scope, String(table)); const filteredRow: Record<string, unknown> = {}; for (const key of Object.keys(normalized)) { if (colMeta.has(key)) { filteredRow[key] = normalized[key]; } } const oldId = filteredRow.id; delete filteredRow.id; const keys = Object.keys(filteredRow); if (keys.length === 0) continue; if (hasAlwaysIdentity) { const colsSql = sql.join(keys.map(k => sql.ref(k))); const valsSql = sql.join(keys.map(k => sql`${filteredRow[k]}`)); const inserted = await sql<{id: string|number}>`insert into ${sql.table(String(table))} (${colsSql}) overriding system value values (${valsSql}) returning id`.execute(trx); if (oldId != null && inserted.rows[0]?.id != null) tableIdMap.set(String(oldId), String(inserted.rows[0].id)); } else { const inserted = await (trx).insertInto(table).values(filteredRow).returning('id').executeTakeFirst(); if (oldId != null && inserted?.id != null) { tableIdMap.set(String(oldId), String(inserted.id)); } } }
        } else {
          const bulkRows: any[] = [];
          for (const row of rows) {
            if (!isObjectRecord(row)) continue;
            if (isCrossTenant) {
              for (const fk of fkMap) { if (fk.column_name === 'tenant_id' || fk.column_name === 'account_id') continue; const oldFkVal = row[fk.column_name]; if (oldFkVal != null && idMap.has(fk.foreign_table_name)) { const newFkVal = idMap.get(fk.foreign_table_name)!.get(String(oldFkVal)); if (newFkVal !== undefined) row[fk.column_name] = newFkVal; } }
            }
            const normalized = normalizeRowForInsert(row, scope, String(table));
            const filteredRow: Record<string, unknown> = {};
            for (const key of Object.keys(normalized)) { if (colMeta.has(key)) filteredRow[key] = normalized[key]; }
            if (Object.keys(filteredRow).length > 0) bulkRows.push(filteredRow);
          }
          
          const CHUNK_SIZE = 500;
          for (let i = 0; i < bulkRows.length; i += CHUNK_SIZE) {
            const chunk = bulkRows.slice(i, i + CHUNK_SIZE);
            if (!chunk.length) continue;
            if (hasAlwaysIdentity) {
              const keys = Object.keys(chunk[0]);
              const colsSql = sql.join(keys.map(k => sql.ref(k)));
              const valsSql = sql.join(chunk.map(row => sql`(${sql.join(keys.map(k => sql`${row[k]}`))})`));
              await sql`insert into ${sql.table(String(table))} (${colsSql}) overriding system value values ${valsSql}`.execute(trx);
            } else {
              await (trx as any).insertInto(table).values(chunk).execute();
            }
          }
        }
        await this.resetIdentity(trx as unknown as Kysely<Database>, String(table)); } }); 
    } catch (error: any) {
      throw new AppError(`فشل الاستعادة: ${error.message} - ${error.detail || ''} - Table: ${error.table || ''} - Constraint: ${error.constraint || ''}`, 'RESTORE_ERROR', 400);
    }
    await sql`insert into backup_snapshots (label, source, payload_json, tenant_id, account_id) values (${`restore-${new Date().toISOString()}`}, ${'restore'}, ${JSON.stringify(envelope)}::jsonb, ${scope.tenantId}, ${scope.accountId})`.execute(this.db); await this.audit.log('استعادة نسخة احتياطية', `تمت استعادة نسخة احتياطية بواسطة ${actor.username}`, actor).catch(() => undefined); return { ok: true, restoredAt: new Date().toISOString(), restoredTables: BACKUP_TABLES.length, summary: verification.summary, scope }; }
}
