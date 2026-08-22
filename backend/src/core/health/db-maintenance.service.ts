import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';

/**
 * Automatic database maintenance service.
 * Runs on every application startup to keep the embedded PostgreSQL healthy.
 *
 * Performs:
 * 1. Cleanup of expired sessions
 * 2. Cleanup of old idempotency records (operation_executions)
 * 3. Cleanup of stale rate-limit rows
 * 4. Cleanup of very old audit logs (configurable retention)
 * 5. VACUUM ANALYZE on high-churn tables
 */
@Injectable()
export class DatabaseMaintenanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseMaintenanceService.name);

  /** How many days to keep completed operation_executions before pruning */
  private readonly executionRetentionDays: number;

  /** How many days to keep audit_logs before pruning */
  private readonly auditRetentionDays: number;

  /** Whether maintenance is enabled (disabled for lan_client mode) */
  private readonly enabled: boolean;

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {
    this.executionRetentionDays = Number(process.env.OPERATION_EXECUTION_RETENTION_DAYS) || 30;
    this.auditRetentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 365;
    this.enabled = process.env.ELECTRON_RUNTIME_MODE !== 'lan_client';
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Database maintenance skipped (lan_client mode).');
      return;
    }

    // Run quick cleanup in the background without delaying startup
    setTimeout(() => {
      this.runFastCleanup().catch((err) => {
        this.logger.error('Quick database cleanup failed', err);
      });
    }, 5000); // 5s after app is fully up and responsive
  }

  /**
   * Fast, non-blocking cleanup of stale temporary rows (sessions, rate limits, old executions).
   * Runs in milliseconds and does not lock tables or perform heavy I/O.
   */
  async runFastCleanup(): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    const results: Record<string, unknown> = {};

    // 1. Cleanup expired sessions
    try {
      const res = await this.db
        .deleteFrom('sessions')
        .where('expires_at', '<', new Date())
        .executeTakeFirst();
      const count = Number(res.numDeletedRows || 0);
      results.expiredSessionsCleaned = count;
      if (count > 0) this.logger.log(`Cleaned ${count} expired sessions.`);
    } catch (err) {
      this.logger.warn('Failed to cleanup expired sessions', err);
    }

    // 2. Cleanup old operation_executions (completed more than N days ago)
    try {
      const cutoffDays = this.executionRetentionDays;
      const res = await sql`
        DELETE FROM operation_executions
        WHERE status IN ('committed', 'failed')
          AND completed_at IS NOT NULL
          AND completed_at < NOW() - MAKE_INTERVAL(days => ${cutoffDays})
      `.execute(this.db);
      const count = Number((res as any).numAffectedRows || 0);
      results.oldExecutionsCleaned = count;
      if (count > 0) this.logger.log(`Cleaned ${count} old operation_executions (>${cutoffDays} days).`);
    } catch (err) {
      this.logger.warn('Failed to cleanup old operation_executions', err);
    }

    // 3. Cleanup stale rate-limit rows
    try {
      const res = await sql`
        DELETE FROM auth_rate_limits
        WHERE reset_at < NOW() - INTERVAL '1 hour'
      `.execute(this.db);
      const count = Number((res as any).numAffectedRows || 0);
      results.staleRateLimitsCleaned = count;
      if (count > 0) this.logger.log(`Cleaned ${count} stale rate-limit rows.`);
    } catch (err) {
      this.logger.warn('Failed to cleanup stale rate-limit rows', err);
    }

    const durationMs = Date.now() - startTime;
    results.durationMs = durationMs;
    DatabaseMaintenanceService._lastResults = {
      ...results,
      type: 'fast_cleanup',
      completedAt: new Date().toISOString(),
    };

    return results;
  }

  /**
   * Full database maintenance & optimization (VACUUM ANALYZE + Deep Cleanup).
   * Intended to be triggered manually from the UI or periodically.
   */
  async runFullOptimization(): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    this.logger.log('Starting full database optimization & VACUUM...');

    const results = await this.runFastCleanup();

    // Cleanup very old audit logs (beyond retention period)
    try {
      const cutoffDays = this.auditRetentionDays;
      const res = await sql`
        DELETE FROM audit_logs
        WHERE created_at < NOW() - MAKE_INTERVAL(days => ${cutoffDays})
      `.execute(this.db);
      const count = Number((res as any).numAffectedRows || 0);
      results.oldAuditLogsCleaned = count;
      if (count > 0) this.logger.log(`Cleaned ${count} old audit_logs (>${cutoffDays} days).`);
    } catch (err) {
      this.logger.warn('Failed to cleanup old audit_logs', err);
    }

    // VACUUM ANALYZE on high-churn tables to reclaim space and rebuild index statistics
    const tablesToVacuum = [
      'sessions',
      'operation_executions',
      'auth_rate_limits',
      'audit_logs',
      'products',
      'sales',
      'sale_items',
      'customers',
      'suppliers',
      'customer_ledger',
      'supplier_ledger',
      'location_products',
    ];

    let vacuumedCount = 0;
    for (const table of tablesToVacuum) {
      try {
        await sql.raw(`VACUUM ANALYZE ${table}`).execute(this.db);
        vacuumedCount++;
      } catch (err) {
        this.logger.warn(`VACUUM ANALYZE ${table} skipped: ${(err as Error).message}`);
      }
    }
    results.tablesVacuumed = vacuumedCount;
    this.logger.log(`VACUUM ANALYZE completed on ${vacuumedCount}/${tablesToVacuum.length} tables.`);

    const durationMs = Date.now() - startTime;
    results.durationMs = durationMs;
    this.logger.log(`Full optimization completed in ${(durationMs / 1000).toFixed(1)}s.`);

    DatabaseMaintenanceService._lastResults = {
      ...results,
      type: 'full_optimization',
      completedAt: new Date().toISOString(),
    };

    return results;
  }

  /** Last maintenance results (accessible by the health controller) */
  static _lastResults: Record<string, unknown> | null = null;

  getLastResults(): Record<string, unknown> | null {
    return DatabaseMaintenanceService._lastResults;
  }
}
