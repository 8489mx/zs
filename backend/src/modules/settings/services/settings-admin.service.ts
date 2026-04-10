import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

@Injectable()
export class SettingsAdminService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  assertAdmin(auth?: AuthContext | null): asserts auth is AuthContext {
    if (!auth) throw new ForbiddenException('Authentication required');
    const canManage = auth.role === 'super_admin' || auth.permissions.includes('settings') || auth.permissions.includes('canManageSettings');
    if (!canManage) throw new ForbiddenException('Missing required permissions');
  }

  private async count(table: keyof Database): Promise<number> {
    const row = await this.db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow();

    return Number(row.count || 0);
  }

  private async sumRaw(table: string, column: string): Promise<number> {
    const result = await sql<{ total: number }>`select coalesce(sum(${sql.ref(column)}), 0) as total from ${sql.table(table)}`.execute(this.db);
    return Number(result.rows[0]?.total || 0);
  }

  private handoffFileState() {
    const backendRoot = process.cwd();
    const files = [
      'PRODUCTION_CHECKLIST.md',
      'BACKUP_RESTORE.md',
      'MONITORING_READINESS.md',
      'DEPLOYMENT_RUNBOOK.md',
      'GO_LIVE_GATE.md',
      'PRE_SALE_HARDENING.md',
      '.env.example',
    ];

    const present = files.filter((file) => existsSync(join(backendRoot, file)));
    return {
      present: present.length,
      expected: files.length,
      missing: files.filter((file) => !present.includes(file)).join(', ') || 'none',
      ready: present.length === files.length ? 'yes' : 'no',
    };
  }

  async getDiagnostics(): Promise<Record<string, unknown>> {
    const [
      users,
      activeUsers,
      sessions,
      expiredSessions,
      branches,
      locations,
      customers,
      suppliers,
      products,
      sales,
      purchases,
      returns,
      expenses,
      treasury,
      snapshots,
      auditLogs,
      customerBalance,
      supplierBalance,
      treasuryNet,
    ] = await Promise.all([
      this.count('users'),
      this.db.selectFrom('users').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.count('sessions'),
      this.db.selectFrom('sessions').select((eb) => eb.fn.countAll<number>().as('count')).where('expires_at', '<', new Date()).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.db.selectFrom('branches').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.db.selectFrom('stock_locations').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.db.selectFrom('customers').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.db.selectFrom('suppliers').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.db.selectFrom('products').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true).executeTakeFirstOrThrow().then((row) => Number(row.count || 0)),
      this.count('sales'),
      this.count('purchases'),
      this.count('return_documents'),
      this.count('expenses'),
      this.count('treasury_transactions'),
      this.count('backup_snapshots' as keyof Database),
      this.count('audit_logs'),
      this.sumRaw('customers', 'balance'),
      this.sumRaw('suppliers', 'balance'),
      this.sumRaw('treasury_transactions', 'amount'),
    ]);

    return {
      counts: {
        users,
        activeUsers,
        sessions,
        expiredSessions,
        branches,
        locations,
        customers,
        suppliers,
        products,
        sales,
        purchases,
        returns,
        expenses,
        treasuryTransactions: treasury,
        backupSnapshots: snapshots,
        auditLogs,
      },
      finance: {
        customerBalance: Number(customerBalance.toFixed(2)),
        supplierBalance: Number(supplierBalance.toFixed(2)),
        treasuryNet: Number(treasuryNet.toFixed(2)),
      },
    };
  }

  async getMaintenanceReport(): Promise<Record<string, unknown>> {
    const diagnostics = await this.getDiagnostics();
    const handoff = this.handoffFileState();
    return {
      summary: {
        expiredSessions: Number((diagnostics.counts as Record<string, unknown>).expiredSessions || 0),
        backupSnapshots: Number((diagnostics.counts as Record<string, unknown>).backupSnapshots || 0),
        auditLogs: Number((diagnostics.counts as Record<string, unknown>).auditLogs || 0),
        docsReady: handoff.ready,
        docsCoverage: `${handoff.present}/${handoff.expected}`,
        missingDocs: handoff.missing,
      },
    };
  }

  async getLaunchReadiness(): Promise<Record<string, unknown>> {
    const diagnostics = await this.getDiagnostics();
    const handoff = this.handoffFileState();
    const expiredSessions = Number((diagnostics.counts as Record<string, unknown>).expiredSessions || 0);
    const snapshots = Number((diagnostics.counts as Record<string, unknown>).backupSnapshots || 0);

    return {
      summary: {
        envTemplateReady: handoff.ready,
        backupSnapshotsAvailable: snapshots > 0 ? 'yes' : 'no',
        expiredSessionsOpen: expiredSessions,
        bootstrapAdminExpectedOffInProduction: process.env.ENABLE_BOOTSTRAP_ADMIN === 'true' ? 'no' : 'yes',
        csrfConfigured: process.env.SESSION_CSRF_SECRET ? 'yes' : 'no',
        cookiesSecureFlag: process.env.SESSION_COOKIE_SECURE === 'true' ? 'yes' : 'no',
      },
    };
  }

  async getOperationalReadiness(): Promise<Record<string, unknown>> {
    const diagnostics = await this.getDiagnostics();
    return {
      summary: {
        activeUsers: Number((diagnostics.counts as Record<string, unknown>).activeUsers || 0),
        branches: Number((diagnostics.counts as Record<string, unknown>).branches || 0),
        locations: Number((diagnostics.counts as Record<string, unknown>).locations || 0),
        products: Number((diagnostics.counts as Record<string, unknown>).products || 0),
        treasuryNet: Number((diagnostics.finance as Record<string, unknown>).treasuryNet || 0),
        customerBalance: Number((diagnostics.finance as Record<string, unknown>).customerBalance || 0),
        supplierBalance: Number((diagnostics.finance as Record<string, unknown>).supplierBalance || 0),
      },
    };
  }

  async getUatReadiness(): Promise<Record<string, unknown>> {
    return {
      summary: {
        backendBuild: 'run npm run build',
        backendInfraTests: 'run npm run test:infra',
        frontendQa: 'run npm run qa:commercial-ready',
        backupRestoreDrill: 'verify from settings backup workspace',
        smokeFlow: 'sale + purchase + return + reports sanity',
      },
    };
  }

  async getSupportSnapshot(): Promise<Record<string, unknown>> {
    const diagnostics = await this.getDiagnostics();
    return {
      generatedAt: new Date().toISOString(),
      appHost: process.env.APP_HOST || 'unset',
      appPort: process.env.APP_PORT || 'unset',
      businessTimezone: process.env.BUSINESS_TIMEZONE || 'UTC',
      activeUsers: Number((diagnostics.counts as Record<string, unknown>).activeUsers || 0),
      products: Number((diagnostics.counts as Record<string, unknown>).products || 0),
      sales: Number((diagnostics.counts as Record<string, unknown>).sales || 0),
      purchases: Number((diagnostics.counts as Record<string, unknown>).purchases || 0),
      returns: Number((diagnostics.counts as Record<string, unknown>).returns || 0),
      expiredSessions: Number((diagnostics.counts as Record<string, unknown>).expiredSessions || 0),
      backupSnapshots: Number((diagnostics.counts as Record<string, unknown>).backupSnapshots || 0),
    };
  }

  async cleanupExpiredSessions(actor: AuthContext): Promise<Record<string, unknown>> {
    const result = await this.db.deleteFrom('sessions').where('expires_at', '<', new Date()).executeTakeFirst();
    const removed = Number(result.numDeletedRows || 0);
    await this.audit.log('تنظيف الجلسات', `تم حذف ${removed} جلسة منتهية بواسطة ${actor.username}`, actor.userId);
    return { ok: true, removed };
  }

  async reconcileCustomers(actor: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('customers as c')
      .leftJoin('customer_ledger as l', 'l.customer_id', 'c.id')
      .select(['c.id', 'c.balance'])
      .select((eb) => sql<number>`coalesce(sum(l.amount), 0)`.as('ledger_balance'))
      .groupBy(['c.id', 'c.balance'])
      .execute();

    let updated = 0;
    for (const row of rows) {
      const nextBalance = Number(Number(row.ledger_balance || 0).toFixed(2));
      const currentBalance = Number(Number(row.balance || 0).toFixed(2));
      if (Math.abs(nextBalance - currentBalance) <= 0.0001) continue;
      await this.db.updateTable('customers').set({ balance: nextBalance, updated_at: sql`NOW()` }).where('id', '=', Number(row.id)).execute();
      updated += 1;
    }

    await this.audit.log('مطابقة أرصدة العملاء', `تمت مطابقة ${updated} عميل بواسطة ${actor.username}`, actor.userId);
    return { ok: true, updated };
  }

  async reconcileSuppliers(actor: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('suppliers as s')
      .leftJoin('supplier_ledger as l', 'l.supplier_id', 's.id')
      .select(['s.id', 's.balance'])
      .select((eb) => sql<number>`coalesce(sum(l.amount), 0)`.as('ledger_balance'))
      .groupBy(['s.id', 's.balance'])
      .execute();

    let updated = 0;
    for (const row of rows) {
      const nextBalance = Number(Number(row.ledger_balance || 0).toFixed(2));
      const currentBalance = Number(Number(row.balance || 0).toFixed(2));
      if (Math.abs(nextBalance - currentBalance) <= 0.0001) continue;
      await this.db.updateTable('suppliers').set({ balance: nextBalance, updated_at: sql`NOW()` }).where('id', '=', Number(row.id)).execute();
      updated += 1;
    }

    await this.audit.log('مطابقة أرصدة الموردين', `تمت مطابقة ${updated} مورد بواسطة ${actor.username}`, actor.userId);
    return { ok: true, updated };
  }

  async reconcileAll(actor: AuthContext): Promise<Record<string, unknown>> {
    const customers = await this.reconcileCustomers(actor);
    const suppliers = await this.reconcileSuppliers(actor);
    return {
      ok: true,
      customersUpdated: customers.updated,
      suppliersUpdated: suppliers.updated,
    };
  }
}
